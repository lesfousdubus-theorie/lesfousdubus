const PADDING = 6;

type Rect = { x: number; y: number; width: number; height: number };
type Bubble = Rect & {
  node: HTMLElement;
  z: number;
  vx: number;
  vy: number;
  originX: number;
  originY: number;
};

export function reflectMessageAxis(position: number, length: number): number {
  if (length <= 0) return 0;
  const period = length * 2;
  const step = ((position % period) + period) % period;
  return step <= length ? step : period - step;
}

export function messageWallCapacity(width: number, height: number): number {
  const columns = Math.max(1, Math.floor(width / 212));
  const rows = Math.max(1, Math.floor(height / 118));
  return Math.min(12, columns * rows);
}

export function messageOverlap(first: Rect, second: Rect): number {
  const width = Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x);
  const height = Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y);
  return width > 0 && height > 0 ? width * height / (first.width * first.height) : 0;
}

export function startMessageMotion(wall: HTMLElement) {
  let frame = 0;
  let previous: number | undefined;
  let age = 0;
  let width = 0;
  let height = 0;
  let bubbles: Bubble[] = [];

  function measure() {
    width = wall.clientWidth;
    height = wall.clientHeight;
    const nodes = Array.from(wall.querySelectorAll<HTMLElement>(".message-bubble"));
    const columns = Math.min(nodes.length, Math.max(1, Math.round(Math.sqrt(nodes.length * width / Math.max(1, height) / 1.55))));
    const rows = Math.ceil(nodes.length / Math.max(columns, 1));
    bubbles = nodes.map((node, index) => {
      // Start apart so all the text can be read before the paths begin crossing.
      const angle = index * 2.39996 + .52;
      const speed = 32 + index % 5 * 5;
      const bubbleWidth = node.offsetWidth;
      const bubbleHeight = node.offsetHeight;
      const left = ((index % columns + .5) * width / columns) - bubbleWidth / 2;
      const top = ((Math.floor(index / columns) + .5) * height / rows) - bubbleHeight / 2;
      return {
        node, width: bubbleWidth, height: bubbleHeight, z: index + 1,
        x: left, y: top, originX: Math.max(0, left - PADDING), originY: Math.max(0, top - PADDING),
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      };
    });
    age = 0;
    paint();
  }

  function paint() {
    for (const bubble of bubbles) {
      const spanX = Math.max(0, width - bubble.width - PADDING * 2);
      const spanY = Math.max(0, height - bubble.height - PADDING * 2);
      bubble.x = Math.min(PADDING, (width - bubble.width) / 2) + reflectMessageAxis(Math.min(spanX, bubble.originX) + age * bubble.vx, spanX);
      bubble.y = Math.min(PADDING, (height - bubble.height) / 2) + reflectMessageAxis(Math.min(spanY, bubble.originY) + age * bubble.vy, spanY);
    }
    for (const bubble of bubbles) {
      let covered = 0;
      for (const foreground of bubbles) {
        if (foreground.z > bubble.z) covered = Math.max(covered, messageOverlap(bubble, foreground));
      }
      bubble.node.style.transform = `translate3d(${bubble.x.toFixed(2)}px, ${bubble.y.toFixed(2)}px, 0)`;
      bubble.node.style.opacity = Math.max(.55, 1 - covered * .9).toFixed(2);
    }
  }

  function tick(time: number) {
    if (previous !== undefined) age += Math.min(50, time - previous) / 1000;
    previous = time;
    paint();
    frame = window.requestAnimationFrame(tick);
  }

  function syncVisibility() {
    window.cancelAnimationFrame(frame);
    previous = undefined;
    if (!document.hidden) frame = window.requestAnimationFrame(tick);
  }

  const resize = new ResizeObserver(measure);
  resize.observe(wall);
  for (const node of wall.children) resize.observe(node);
  document.addEventListener("visibilitychange", syncVisibility);
  measure();
  syncVisibility();
  return () => {
    resize.disconnect();
    document.removeEventListener("visibilitychange", syncVisibility);
    window.cancelAnimationFrame(frame);
    for (const { node } of bubbles) {
      node.style.removeProperty("transform");
      node.style.removeProperty("opacity");
    }
  };
}
