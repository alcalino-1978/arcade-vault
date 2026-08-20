'use client';

import { useEffect, useRef } from 'react';
import { useLatestRef } from '@/lib/games/useLatestRef';
import { useCanvasKeyboard } from '@/lib/games/useCanvasKeyboard';
import type { CanvasGameProps } from '@/lib/games/types';
import {
  loadSpritesheet,
  drawSprite,
  drawFrame,
  EXPLOSION_FRAMES,
  EXPLOSION_DURATION,
  type BlockColor,
} from '@/lib/games/arkanoidSprites';
import { ARKANOID_LEVELS } from '@/lib/games/arkanoidLevels';

export default function ArkanoidGame({
  paused,
  onScoreChange,
  onLevelChange,
  onLivesChange,
  onGameOver,
}: CanvasGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const pausedRef = useLatestRef(paused);
  const cbScore = useLatestRef(onScoreChange);
  const cbLevel = useLatestRef(onLevelChange);
  const cbLives = useLatestRef(onLivesChange);
  const cbOver = useLatestRef(onGameOver);
  const { keysRef } = useCanvasKeyboard();

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const keys = keysRef.current;
    const W = 800;
    const H = 600;

    // ── Constantes ───────────────────────────────────────────────────────────
    const PADDLE_SPEED = 400;
    const BLOCK_COLS = 10;
    const BLOCK_W = 64;
    const BLOCK_H = 24;
    const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
    const BLOCKS_ORIGIN_Y = 80;
    const BASE_BALL_VX = 200;
    const BASE_BALL_VY = -300;

    interface Block {
      x: number;
      y: number;
      w: number;
      h: number;
      color: BlockColor;
      alive: boolean;
    }
    interface Explosion {
      x: number;
      y: number;
      w: number;
      h: number;
      color: BlockColor;
      elapsed: number;
    }

    // ── Estado del juego ─────────────────────────────────────────────────────
    const paddle = { x: 0, y: 560, w: 81, h: 14 };
    const ball = { x: 0, y: 0, w: 16, h: 16, vx: BASE_BALL_VX, vy: BASE_BALL_VY };

    let blocks: Block[] = [];
    let explosions: Explosion[] = [];
    let lives = 3;
    let score = 0;
    let currentLevel = 1;
    let gameState: 'playing' | 'gameover' | 'win' = 'playing';
    let gameOverFired = false;

    let prevScore = -1,
      prevLives = -1,
      prevLevel = -1;

    function initPaddle() {
      paddle.x = (W - paddle.w) / 2;
    }

    function positionBallOnPaddle(speed: number) {
      ball.x = paddle.x + (paddle.w - ball.w) / 2;
      ball.y = paddle.y - ball.h;
      ball.vx = BASE_BALL_VX * speed;
      ball.vy = BASE_BALL_VY * speed;
    }

    function loadLevel(n: number) {
      currentLevel = n;
      const level = ARKANOID_LEVELS[n - 1];
      blocks = level.blocks.map((b) => ({
        x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
        y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
        w: BLOCK_W,
        h: BLOCK_H,
        color: b.color,
        alive: true,
      }));
      explosions = [];
      positionBallOnPaddle(level.speed);
    }

    function collideAABB(block: Block) {
      return (
        ball.x < block.x + block.w &&
        ball.x + ball.w > block.x &&
        ball.y < block.y + block.h &&
        ball.y + ball.h > block.y
      );
    }

    function initGame() {
      lives = 3;
      score = 0;
      gameState = 'playing';
      gameOverFired = false;
      prevScore = -1;
      prevLives = -1;
      prevLevel = -1;
      initPaddle();
      loadLevel(1);
    }

    // ── Update ───────────────────────────────────────────────────────────────
    function update(dt: number) {
      if (gameState !== 'playing') return;

      if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
      if (keys.ArrowRight) paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x <= 0) {
        ball.x = 0;
        ball.vx = Math.abs(ball.vx);
      }
      if (ball.x + ball.w >= W) {
        ball.x = W - ball.w;
        ball.vx = -Math.abs(ball.vx);
      }
      if (ball.y <= 0) {
        ball.y = 0;
        ball.vy = Math.abs(ball.vy);
      }

      if (
        ball.vy > 0 &&
        ball.x + ball.w > paddle.x &&
        ball.x < paddle.x + paddle.w &&
        ball.y + ball.h >= paddle.y &&
        ball.y + ball.h <= paddle.y + paddle.h + 8
      ) {
        ball.y = paddle.y - ball.h;
        ball.vy = -Math.abs(ball.vy);
      }

      for (const block of blocks) {
        if (!block.alive) continue;
        if (collideAABB(block)) {
          block.alive = false;
          explosions.push({
            x: block.x,
            y: block.y,
            w: block.w,
            h: block.h,
            color: block.color,
            elapsed: 0,
          });
          score += 10;
          ball.vy = -ball.vy;
          if (blocks.every((b) => !b.alive)) {
            if (currentLevel < 5) loadLevel(currentLevel + 1);
            else gameState = 'win';
          }
          break; // un bloque por frame
        }
      }

      for (const exp of explosions) exp.elapsed += dt * 1000;
      explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

      if (ball.y > H) {
        lives--;
        if (lives <= 0) {
          lives = 0;
          gameState = 'gameover';
        } else {
          positionBallOnPaddle(ARKANOID_LEVELS[currentLevel - 1].speed);
        }
      }
    }

    // ── Dibujo ───────────────────────────────────────────────────────────────
    function draw() {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      for (const block of blocks) {
        if (block.alive) drawSprite(ctx, `block_${block.color}`, block.x, block.y, block.w, block.h);
      }

      for (const exp of explosions) {
        const frameIndex = Math.min(Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4), 3);
        drawFrame(ctx, EXPLOSION_FRAMES[exp.color][frameIndex], exp.x, exp.y, exp.w, exp.h);
      }

      drawSprite(ctx, 'paddle', paddle.x, paddle.y, paddle.w, paddle.h);
      drawSprite(ctx, 'ball', ball.x, ball.y, ball.w, ball.h);
    }

    // ── Loop ─────────────────────────────────────────────────────────────────
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
      if (lives !== prevLives) {
        cbLives.current?.(lives);
        prevLives = lives;
      }
      if (currentLevel !== prevLevel) {
        cbLevel.current(currentLevel);
        prevLevel = currentLevel;
      }
      if ((gameState === 'gameover' || gameState === 'win') && !gameOverFired) {
        gameOverFired = true;
        cbOver.current(score);
      }

      rafId = requestAnimationFrame(loop);
    }

    loadSpritesheet(() => {
      if (cancelled) return;
      initGame();
      rafId = requestAnimationFrame(loop);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [cbLevel, cbLives, cbOver, cbScore, keysRef, pausedRef]);

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
