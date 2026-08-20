// Portado de references/source-assets/snake-assets/sprites.js
export interface SpriteFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const SNAKE_FRUITS_SRC = '/games/snake/fruits.png';

export const SNAKE_FRUITS = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  grape: { x: 378, y: 136, w: 110, h: 160 },
  garlic: { x: 540, y: 136, w: 130, h: 160 },
  eggplant: { x: 712, y: 136, w: 130, h: 160 },
  strawberry: { x: 894, y: 136, w: 110, h: 160 },
  cherry: { x: 1066, y: 136, w: 110, h: 160 },
  carrot: { x: 1228, y: 136, w: 130, h: 160 },
  mushroom: { x: 1400, y: 136, w: 130, h: 160 },
  broccoli: { x: 1582, y: 136, w: 110, h: 160 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160 },
  pepper: { x: 1906, y: 136, w: 150, h: 160 },
  kiwi: { x: 2068, y: 136, w: 170, h: 160 },
  lemon: { x: 2250, y: 136, w: 140, h: 160 },
  peach: { x: 2432, y: 136, w: 130, h: 160 },
  peanut: { x: 2604, y: 136, w: 130, h: 160 },
  apple: { x: 2786, y: 136, w: 110, h: 160 },
  tomato: { x: 2948, y: 136, w: 130, h: 160 },
  berries: { x: 3110, y: 136, w: 150, h: 160 },
  grapes2: { x: 3302, y: 136, w: 110, h: 160 },
  pineapple: { x: 3454, y: 136, w: 150, h: 160 },
  melon: { x: 3637, y: 136, w: 130, h: 160 },
} as const satisfies Record<string, SpriteFrame>;

export type SnakeFruitName = keyof typeof SNAKE_FRUITS;

export const SNAKE_FRUIT_NAMES = Object.keys(SNAKE_FRUITS) as SnakeFruitName[];

let img: HTMLImageElement | null = null;
let loaded = false;
const callbacks: Array<() => void> = [];

export function loadFruitsImage(cb: () => void) {
  if (loaded) {
    cb();
    return;
  }
  callbacks.push(cb);
  if (img) return;

  img = new Image();
  img.onload = () => {
    loaded = true;
    callbacks.forEach((f) => f());
    callbacks.length = 0;
  };
  img.onerror = () => console.error('Failed to load fruits sprite atlas');
  img.src = SNAKE_FRUITS_SRC;
}

export function drawFruit(
  ctx: CanvasRenderingContext2D,
  name: SnakeFruitName,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (!loaded || !img) return;
  const sp = SNAKE_FRUITS[name];
  ctx.drawImage(img, sp.x, sp.y, sp.w, sp.h, x, y, w, h);
}
