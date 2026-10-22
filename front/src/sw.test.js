import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Runs public/sw.js against fake service-worker globals.
function loadWorker() {
  const listeners = {};
  const store = new Map();
  const cache = {
    match: vi.fn(async (request) => store.get(request.url)),
    put: vi.fn(async (request, response) => store.set(request.url, response)),
  };
  const caches = {
    open: vi.fn(async () => cache),
    keys: vi.fn(async () => ["personcount-v0", "personcount-v1"]),
    delete: vi.fn(),
  };
  const self = {
    addEventListener: (type, fn) => (listeners[type] = fn),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };
  const fetch = vi.fn(async () => ({ ok: true, clone: () => "copy" }));
  const code = readFileSync(
    join(process.cwd(), "front", "public", "sw.js"),
    "utf8",
  );
  new Function("self", "caches", "fetch", "location", code)(
    self,
    caches,
    fetch,
    { origin: "http://app" },
  );
  return { listeners, cache, caches, fetch };
}

function fetchEvent(url, method = "GET") {
  return { request: { url, method }, respondWith: vi.fn() };
}

describe("service worker cache", () => {
  let worker;
  beforeEach(() => {
    worker = loadWorker();
  });

  it("serves the model from the network once, then from the cache", async () => {
    const first = fetchEvent("http://app/models/yolov8n.onnx");
    worker.listeners.fetch(first);
    await first.respondWith.mock.calls[0][0];
    expect(worker.fetch).toHaveBeenCalledOnce();
    expect(worker.cache.put).toHaveBeenCalledOnce();
    const second = fetchEvent("http://app/models/yolov8n.onnx");
    worker.listeners.fetch(second);
    await second.respondWith.mock.calls[0][0];
    expect(worker.fetch).toHaveBeenCalledOnce();
  });

  it("caches runtime files but leaves pages, the API and other origins alone", () => {
    for (const url of [
      "http://app/assets/ort-wasm-simd-threaded-abc.wasm",
      "http://app/assets/ort-wasm-simd-threaded-abc.mjs",
    ]) {
      const event = fetchEvent(url);
      worker.listeners.fetch(event);
      expect(event.respondWith).toHaveBeenCalledOnce();
    }
    for (const event of [
      fetchEvent("http://app/"),
      fetchEvent("http://app/assets/index-abc.js"),
      fetchEvent("http://app/upload-history", "POST"),
      fetchEvent("http://other/models/yolov8n.onnx"),
    ]) {
      worker.listeners.fetch(event);
      expect(event.respondWith).not.toHaveBeenCalled();
    }
  });

  it("drops old caches when activated", async () => {
    let done;
    worker.listeners.activate({ waitUntil: (promise) => (done = promise) });
    await done;
    expect(worker.caches.delete).toHaveBeenCalledWith("personcount-v0");
    expect(worker.caches.delete).not.toHaveBeenCalledWith("personcount-v1");
  });
});
