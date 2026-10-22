import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadHistory } from "./historyApi";

afterEach(() => vi.unstubAllGlobals());

describe("existing history API contract", () => {
  it("posts the unwrapped array to the relative endpoint", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ status: "ok" }) });
    vi.stubGlobal("fetch", fetch);
    const history = [{ idFrame: 0, personCount: 3 }];
    await expect(uploadHistory(history)).resolves.toEqual({ status: "ok" });
    expect(fetch).toHaveBeenCalledWith(
      "/upload-history",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(history),
      }),
    );
  });

  it("passes the alert threshold as a query parameter, keeping the body", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ status: "ok" }) });
    vi.stubGlobal("fetch", fetch);
    await uploadHistory([], undefined, { alertThreshold: 5 });
    expect(fetch.mock.calls[0][0]).toBe("/upload-history?limiar=5");
  });

  it("reports HTTP errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(uploadHistory([])).rejects.toThrow("Não foi possível salvar");
  });
});
