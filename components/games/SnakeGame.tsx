'use client';

import { useEffect, useRef } from 'react';
import { useLatestRef } from '@/lib/games/useLatestRef';
import { useCanvasKeyboard } from '@/lib/games/useCanvasKeyboard';
import type { CanvasGameProps } from '@/lib/games/types';
import {
  loadFruitsImage,
  drawFruit,
  SNAKE_FRUIT_NAMES,
  type SnakeFruitName,
} from '@/lib/games/snakeSprites';

const KEYBOARD_CODES = [
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
];

export default function SnakeGame({
  paused,
  onScoreChange,
  onLevelChange,
  onLengthChange,
  onGameOver,
}: CanvasGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const pausedRef = useLatestRef(paused);
  const cbScore = useLatestRef(onScoreChange);
  const cbLevel = useLatestRef(onLevelChange);
  const cbLength = useLatestRef(onLengthChange);
  const cbOver = useLatestRef(onGameOver);
  const { keysRef } = useCanvasKeyboard(KEYBOARD_CODES);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const keys = keysRef.current;
    const W = 800;
    const H = 600;
    const CELL = 20;
    const COLS = W / CELL;
    const ROWS = H / CELL;
    const MOVE_INTERVAL = 0.12; // segundos por celda

    interface Point {
      x: number;
      y: number;
    }
    interface Fruit {
      pos: Point;
      name: SnakeFruitName;
    }

    let snake: Point[] = [];
    let direction: Point = { x: 1, y: 0 };
    let nextDirection: Point = { x: 1, y: 0 };
    let fruit: Fruit | null = null;
    let score = 0;
    let moveAcc = 0;
    let gameState: 'playing' | 'gameover' = 'playing';
    let gameOverFired = false;

    let prevScore = -1,
      prevLength = -1;

    function randCell(): Point {
      return {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
    }

    function placeFruit() {
      let pos: Point;
      do {
        pos = randCell();
      } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
      const name =
        SNAKE_FRUIT_NAMES[Math.floor(Math.random() * SNAKE_FRUIT_NAMES.length)];
      fruit = { pos, name };
    }

    function initGame() {
      const startX = Math.floor(COLS / 2);
      const startY = Math.floor(ROWS / 2);
      snake = [
        { x: startX, y: startY },
        { x: startX - 1, y: startY },
        { x: startX - 2, y: startY },
      ];
      direction = { x: 1, y: 0 };
      nextDirection = { x: 1, y: 0 };
      score = 0;
      moveAcc = 0;
      gameState = 'playing';
      gameOverFired = false;
      prevScore = -1;
      prevLength = -1;
      placeFruit();
    }

    function readDirection() {
      const up = keys.ArrowUp || keys.KeyW;
      const down = keys.ArrowDown || keys.KeyS;
      const left = keys.ArrowLeft || keys.KeyA;
      const right = keys.ArrowRight || keys.KeyD;

      let desired: Point | null = null;
      if (up) desired = { x: 0, y: -1 };
      else if (down) desired = { x: 0, y: 1 };
      else if (left) desired = { x: -1, y: 0 };
      else if (right) desired = { x: 1, y: 0 };

      if (!desired) return;
      // Bloquea el giro de 180° respecto a la dirección vigente.
      if (desired.x === -direction.x && desired.y === -direction.y) return;
      nextDirection = desired;
    }

    function step() {
      direction = nextDirection;
      const head = snake[0];
      const newHead = { x: head.x + direction.x, y: head.y + direction.y };

      if (
        newHead.x < 0 ||
        newHead.x >= COLS ||
        newHead.y < 0 ||
        newHead.y >= ROWS
      ) {
        gameState = 'gameover';
        return;
      }
      if (snake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
        gameState = 'gameover';
        return;
      }

      snake.unshift(newHead);

      if (fruit && newHead.x === fruit.pos.x && newHead.y === fruit.pos.y) {
        score += 10;
        placeFruit();
      } else {
        snake.pop();
      }
    }

    function update(dt: number) {
      if (gameState !== 'playing') return;
      readDirection();
      moveAcc += dt;
      while (moveAcc >= MOVE_INTERVAL && gameState === 'playing') {
        moveAcc -= MOVE_INTERVAL;
        step();
      }
    }

    function draw() {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#ff2fd6';
      for (const seg of snake) {
        ctx.fillRect(seg.x * CELL, seg.y * CELL, CELL - 1, CELL - 1);
      }

      if (fruit) {
        drawFruit(ctx, fruit.name, fruit.pos.x * CELL, fruit.pos.y * CELL, CELL, CELL);
      }
    }

    let rafId = 0;
    let lastTime: number | null = null;
    let cancelled = false;

    function loop(timestamp: number) {
      if (cancelled) return;
      const dt = lastTime === null ? 0 : Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;

      if (!pausedRef.current) update(dt);
      draw();

      if (score !== prevScore) {
        cbScore.current(score);
        prevScore = score;
      }
      if (snake.length !== prevLength) {
        cbLength.current?.(snake.length);
        prevLength = snake.length;
      }
      if (gameState === 'gameover' && !gameOverFired) {
        gameOverFired = true;
        cbOver.current(score);
      }

      rafId = requestAnimationFrame(loop);
    }

    loadFruitsImage(() => {
      if (cancelled) return;
      initGame();
      cbLevel.current(1);
      rafId = requestAnimationFrame(loop);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [cbLength, cbLevel, cbOver, cbScore, keysRef, pausedRef]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'contain',
      }}
    />
  );
}
