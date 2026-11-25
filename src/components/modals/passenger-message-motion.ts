const PADDING = 6;
const wallProgress = new WeakMap<HTMLElement, { width: number; height: number; count: number; age: number }>();

type Bubble = {
  node: HTMLElement;
  spanX: number;
  spanY: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  originX: number;
  originY: number;
};

function reflectMessageAxis(position: number, length: number): number {
  if (length <= 0) return 0;
  const period = length * 2;
  const step = ((position % period) + period) % period;
  return step <= length ? step : period - step;
}

export function startMessageMotion(wall: HTMLElement, moving: boolean) {
  let frame = 0;
  let previous: number | undefined;
  let age = 0;
  let width = 0;
  let height = 0;
  let bubbles: Bubble[] = [];

  function measure() {
    const nextWidth = wall.clientWidth;
    const nextHeight = wall.clientHeight;
    const nodes = Array.from(wall.querySelectorAll<HTMLElement>(":scope > .message-bubble"));
    if (!nodes.length || (width === nextWidth && height === nextHeight && bubbles.length === nodes.length)) return;

    width = nextWidth;
    height = nextHeight;
    const count = nodes.length;
    const columns = Math.min(count, Math.max(1, Math.round(Math.sqrt(count * width / Math.max(1, height) / 2.1))));
    const cellWidth = width / columns;
    const minBubbleWidth = width < 640 ? 148 : 176;
    const bubbleWidth = Math.min(Math.max(cellWidth - 10, minBubbleWidth), 270, Math.max(0, width - PADDING * 2));
    wall.style.setProperty("--message-bubble-width", `${bubbleWidth}px`);

    bubbles = nodes.map((node, index) => {
      const angle = index * 2.39996 + .52;
      const speed = (width < 640 ? 17 : 25) + index % 5 * 4;
      const nodeWidth = node.offsetWidth;
      const bubbleHeight = node.offsetHeight;
      const spanX = Math.max(0, width - nodeWidth - PADDING * 2);
      const spanY = Math.max(0, height - bubbleHeight - PADDING * 2);
      const scatterX = (index * 0.61803398875 + (index % 7) * 0.143) % 1;
      const scatterY = (index * 0.38196601125 + (index % 5) * 0.197) % 1;
      const originX = scatterX * spanX;
      const originY = scatterY * spanY;
      // Profondeur visuelle statique (évite un calcul de grille de collision O(N) à chaque frame).
      const depthRatio = count > 1 ? index / (count - 1) : 1;
      node.style.opacity = (0.76 + depthRatio * 0.24).toFixed(2);
      return {
        node,
        spanX,
        spanY,
        baseX: Math.min(PADDING, (width - nodeWidth) / 2),
        baseY: Math.min(PADDING, (height - bubbleHeight) / 2),
        originX: Math.min(spanX, originX),
        originY: Math.min(spanY, originY),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      };
    });
    const saved = wallProgress.get(wall);
    age = saved?.width === width && saved.height === height && saved.count === count ? saved.age : 37;
    paint();
    wall.dataset.positioned = "true";
  }

  function paint() {
    for (let i = 0; i < bubbles.length; i++) {
      const bubble = bubbles[i];
      const x = bubble.baseX + reflectMessageAxis(bubble.originX + age * bubble.vx, bubble.spanX);
      const y = bubble.baseY + reflectMessageAxis(bubble.originY + age * bubble.vy, bubble.spanY);
      bubble.node.style.transform = `translate3d(${Math.round(x * 2) * 0.5}px, ${Math.round(y * 2) * 0.5}px, 0)`;
    }
  }

  function tick(time: number) {
    if (previous !== undefined) age += Math.min((time - previous) / 1000, 0.1);
    previous = time;
    paint();
    frame = window.requestAnimationFrame(tick);
  }

  function syncVisibility() {
    window.cancelAnimationFrame(frame);
    previous = undefined;
    if (moving && !document.hidden) frame = window.requestAnimationFrame(tick);
  }

  const resize = new ResizeObserver(measure);
  resize.observe(wall);
  document.addEventListener("visibilitychange", syncVisibility);
  measure();
  syncVisibility();
  return () => {
    resize.disconnect();
    document.removeEventListener("visibilitychange", syncVisibility);
    window.cancelAnimationFrame(frame);
    wallProgress.set(wall, { width, height, count: bubbles.length, age });
  };
}
