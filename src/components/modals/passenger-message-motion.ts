const PADDING = 6;
const COLLISION_CELL_SIZE = 96;
const COLLISION_CELL_LIMIT = 8;
const wallProgress = new WeakMap<HTMLElement, { width: number; height: number; count: number; age: number }>();

type Rect = { x: number; y: number; width: number; height: number };
type Bubble = Rect & {
  node: HTMLElement;
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

function messageOverlap(first: Rect, second: Rect): number {
  const width = Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x);
  const height = Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y);
  return width > 0 && height > 0 ? width * height / (first.width * first.height) : 0;
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
    const bubbleWidth = Math.min(Math.max(cellWidth - 14, 96), 256, Math.max(0, width - PADDING * 2));
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
      return {
        node, width: nodeWidth, height: bubbleHeight,
        x: PADDING + originX, y: PADDING + originY, originX, originY,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      };
    });
    const saved = wallProgress.get(wall);
    age = saved?.width === width && saved.height === height && saved.count === count ? saved.age : 37;
    paint();
    wall.dataset.positioned = "true";
  }

  function paint() {
    for (const bubble of bubbles) {
      const spanX = Math.max(0, width - bubble.width - PADDING * 2);
      const spanY = Math.max(0, height - bubble.height - PADDING * 2);
      bubble.x = Math.min(PADDING, (width - bubble.width) / 2) + reflectMessageAxis(Math.min(spanX, bubble.originX) + age * bubble.vx, spanX);
      bubble.y = Math.min(PADDING, (height - bubble.height) / 2) + reflectMessageAxis(Math.min(spanY, bubble.originY) + age * bubble.vy, spanY);
    }
    // Partir du premier plan et ne comparer que les bulles des cases voisines.
    const collisionColumns = Math.max(1, Math.ceil(width / COLLISION_CELL_SIZE));
    const cells = new Map<number, Bubble[]>();
    for (let index = bubbles.length - 1; index >= 0; index--) {
      const bubble = bubbles[index];
      const left = Math.max(0, Math.floor(bubble.x / COLLISION_CELL_SIZE));
      const right = Math.min(collisionColumns - 1, Math.floor((bubble.x + bubble.width) / COLLISION_CELL_SIZE));
      const top = Math.max(0, Math.floor(bubble.y / COLLISION_CELL_SIZE));
      const bottom = Math.floor((bubble.y + bubble.height) / COLLISION_CELL_SIZE);
      let covered = 0;
      for (let row = top; row <= bottom; row++) {
        for (let column = left; column <= right; column++) {
          const cell = row * collisionColumns + column;
          const foreground = cells.get(cell);
          if (!foreground) {
            cells.set(cell, [bubble]);
            continue;
          }
          for (const front of foreground) covered = Math.max(covered, messageOverlap(bubble, front));
          if (foreground.length < COLLISION_CELL_LIMIT) foreground.push(bubble);
        }
      }
      bubble.node.style.transform = `translate3d(${bubble.x.toFixed(2)}px, ${bubble.y.toFixed(2)}px, 0)`;
      bubble.node.style.opacity = Math.max(.55, 1 - covered * .9).toFixed(2);
    }
  }

  function tick(time: number) {
    if (previous === undefined || bubbles.length <= 60 || time - previous >= 30) {
      if (previous !== undefined) age += (time - previous) / 1000;
      previous = time;
      paint();
    }
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
