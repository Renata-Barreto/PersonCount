// Yield to the browser so the video can paint and advance between inferences.
// The timer keeps analysis moving when the tab is in the background and
// animation frames are paused.
export function nextFrame() {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, 100);
    requestAnimationFrame(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}
