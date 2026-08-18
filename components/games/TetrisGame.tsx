'use client';

import { useEffect, useRef } from 'react';
import { useLatestRef } from '@/lib/games/useLatestRef';
import { useCanvasKeyboard } from '@/lib/games/useCanvasKeyboard';
import type { CanvasGameProps } from '@/lib/games/types';

export default function TetrisGame({
  paused,
  onScoreChange,
  onLevelChange,
  onLinesChange,
  onGameOver,
  onPauseToggle,
}: CanvasGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const pausedRef = useLatestRef(paused);
  const cbScore = useLatestRef(onScoreChange);
  const cbLevel = useLatestRef(onLevelChange);
  const cbLines = useLatestRef(onLinesChange);
  const cbOver = useLatestRef(onGameOver);
  const cbPauseToggle = useLatestRef(onPauseToggle);
  const { keysRef, pressed } = useCanvasKeyboard();

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const keys = keysRef.current;
    const W = 800;
    const H = 600;

    // ── Constantes del tablero ───────────────────────────────────────────────
    const COLS = 10;
    const ROWS = 20;
    const BLOCK = 30;
    const BOARD_X = 50;
    const BOARD_Y = 0;
    const NEXT_BOX_X = 480;
    const NEXT_BOX_Y = 90;
    const NEXT_BOX_SIZE = 4 * BLOCK;

    const COLORS: (string | null)[] = [
      null,
      '#4dd0e1', // I - cyan
      '#ffd54f', // O - amarillo
      '#ba68c8', // T - morado
      '#81c784', // S - verde
      '#e57373', // Z - rojo
      '#90caf9', // J - azul pálido
      '#ffb74d', // L - naranja
      '#9e9e9e', // N - gris metálico
    ];

    const PIECES: number[][][] = [
      [],
      [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ], // I
      [
        [2, 2],
        [2, 2],
      ], // O
      [
        [0, 3, 0],
        [3, 3, 3],
        [0, 0, 0],
      ], // T
      [
        [0, 4, 4],
        [4, 4, 0],
        [0, 0, 0],
      ], // S
      [
        [5, 5, 0],
        [0, 5, 5],
        [0, 0, 0],
      ], // Z
      [
        [6, 0, 0],
        [6, 6, 6],
        [0, 0, 0],
      ], // J
      [
        [0, 0, 7],
        [7, 7, 7],
        [0, 0, 0],
      ], // L
      [
        [8, 8, 8],
        [8, 0, 8],
        [8, 8, 8],
      ], // N (tuerca)
    ];

    const LINE_SCORES = [0, 100, 300, 500, 800];

    interface Piece {
      type: number;
      shape: number[][];
      x: number;
      y: number;
    }

    // ── Estado del juego ─────────────────────────────────────────────────────
    let board: number[][];
    let current: Piece;
    let next: Piece;
    let score: number, lines: number, level: number;
    let state: 'playing' | 'gameover';
    let dropAccum: number, dropInterval: number;
    let gameOverFired = false;
    let dtMs = 0;

    let prevScore = -1,
      prevLines = -1,
      prevLevel = -1;

    function createBoard(): number[][] {
      return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
    }

    function randomPiece(): Piece {
      const type = Math.floor(Math.random() * 8) + 1;
      const shape = PIECES[type].map((row) => [...row]);
      return {
        type,
        shape,
        x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
        y: 0,
      };
    }

    function collide(shape: number[][], ox: number, oy: number): boolean {
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const nx = ox + c;
          const ny = oy + r;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          if (ny >= 0 && board[ny][nx]) return true;
        }
      }
      return false;
    }

    function rotateCW(shape: number[][]): number[][] {
      const rows = shape.length;
      const cols = shape[0].length;
      const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
      return result;
    }

    function tryRotate() {
      const rotated = rotateCW(current.shape);
      const kicks = [0, -1, 1, -2, 2];
      for (const kick of kicks) {
        if (!collide(rotated, current.x + kick, current.y)) {
          current.shape = rotated;
          current.x += kick;
          return;
        }
      }
    }

    function merge() {
      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c])
            board[current.y + r][current.x + c] = current.shape[r][c];
    }

    function clearLines() {
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every((v) => v !== 0)) {
          board.splice(r, 1);
          board.unshift(new Array(COLS).fill(0));
          cleared++;
          r++;
        }
      }
      if (cleared) {
        lines += cleared;
        score += (LINE_SCORES[cleared] || 0) * level;
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 90);
      }
    }

    function ghostY(): number {
      let gy = current.y;
      while (!collide(current.shape, current.x, gy + 1)) gy++;
      return gy;
    }

    function hardDrop() {
      const gy = ghostY();
      score += (gy - current.y) * 2;
      current.y = gy;
      lockPiece();
    }

    function softDrop() {
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
        score += 1;
      } else {
        lockPiece();
      }
    }

    function lockPiece() {
      merge();
      clearLines();
      spawn();
    }

    function spawn() {
      current = next;
      next = randomPiece();
      if (collide(current.shape, current.x, current.y)) {
        state = 'gameover';
      }
    }

    function initGame() {
      board = createBoard();
      score = 0;
      lines = 0;
      level = 1;
      state = 'playing';
      dropInterval = 1000;
      dropAccum = 0;
      gameOverFired = false;
      prevScore = -1;
      prevLines = -1;
      prevLevel = -1;
      next = randomPiece();
      spawn();
    }

    // ── Input: DAS/ARR para movimiento horizontal y soft drop continuo ────────
    const DAS = 170; // ms antes de empezar a repetir
    const ARR = 50; // ms entre repeticiones
    const SOFT_DROP_RATE = 50; // ms entre repeticiones de soft drop
    const repeatTimers: Record<string, number> = {};
    const repeatStage: Record<string, boolean> = {};

    function handleRepeatable(
      code: string,
      delayFirst: number,
      delayRepeat: number,
      action: () => void,
    ) {
      if (pressed(code)) {
        action();
        repeatTimers[code] = 0;
        repeatStage[code] = false;
        return;
      }
      if (keys[code]) {
        repeatTimers[code] = (repeatTimers[code] || 0) + dtMs;
        const threshold = repeatStage[code] ? delayRepeat : delayFirst;
        if (repeatTimers[code] >= threshold) {
          action();
          repeatTimers[code] = 0;
          repeatStage[code] = true;
        }
      } else {
        repeatTimers[code] = 0;
        repeatStage[code] = false;
      }
    }

    function processInput() {
      // El toggle de pausa funciona siempre (salvo game over), igual que el original.
      if ((pressed('KeyP') || pressed('Escape')) && state !== 'gameover') {
        cbPauseToggle.current?.();
      }

      if (pausedRef.current || state !== 'playing') return;

      handleRepeatable(
        'ArrowLeft',
        DAS,
        ARR,
        () => !collide(current.shape, current.x - 1, current.y) && current.x--,
      );
      handleRepeatable(
        'ArrowRight',
        DAS,
        ARR,
        () => !collide(current.shape, current.x + 1, current.y) && current.x++,
      );
      handleRepeatable('ArrowDown', 0, SOFT_DROP_RATE, softDrop);

      if (pressed('ArrowUp') || pressed('KeyX')) tryRotate();
      if (pressed('Space')) hardDrop();
    }

    function updateGravity(dt: number) {
      if (pausedRef.current || state !== 'playing') return;
      dropAccum += dt;
      if (dropAccum >= dropInterval) {
        dropAccum = 0;
        if (!collide(current.shape, current.x, current.y + 1)) {
          current.y++;
        } else {
          lockPiece();
        }
      }
    }

    // ── Dibujo ───────────────────────────────────────────────────────────────
    function drawBlock(
      px: number,
      py: number,
      colorIndex: number,
      size: number,
      alpha = 1,
    ) {
      if (!colorIndex) return;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = COLORS[colorIndex]!;
      ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(px + 1, py + 1, size - 2, 4);
      ctx.globalAlpha = 1;
    }

    function drawGrid() {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 0.5;
      for (let c = 1; c < COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(BOARD_X + c * BLOCK, BOARD_Y);
        ctx.lineTo(BOARD_X + c * BLOCK, BOARD_Y + ROWS * BLOCK);
        ctx.stroke();
      }
      for (let r = 1; r < ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(BOARD_X, BOARD_Y + r * BLOCK);
        ctx.lineTo(BOARD_X + COLS * BLOCK, BOARD_Y + r * BLOCK);
        ctx.stroke();
      }
    }

    function drawBoard() {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(BOARD_X - 1, BOARD_Y - 1, COLS * BLOCK + 2, ROWS * BLOCK + 2);
      drawGrid();
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          if (board[r][c])
            drawBlock(BOARD_X + c * BLOCK, BOARD_Y + r * BLOCK, board[r][c], BLOCK);
    }

    function drawNext() {
      ctx.fillStyle = '#fff';
      ctx.font = '13px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('SIGUIENTE', NEXT_BOX_X, NEXT_BOX_Y - 14);

      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        NEXT_BOX_X - 1,
        NEXT_BOX_Y - 1,
        NEXT_BOX_SIZE + 2,
        NEXT_BOX_SIZE + 2,
      );

      const shape = next.shape;
      const offX = Math.floor((4 - shape[0].length) / 2);
      const offY = Math.floor((4 - shape.length) / 2);
      for (let r = 0; r < shape.length; r++)
        for (let c = 0; c < shape[r].length; c++)
          if (shape[r][c])
            drawBlock(
              NEXT_BOX_X + (offX + c) * BLOCK,
              NEXT_BOX_Y + (offY + r) * BLOCK,
              shape[r][c],
              BLOCK,
            );
    }

    function draw() {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      drawBoard();

      const gy = ghostY();
      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c])
            drawBlock(
              BOARD_X + (current.x + c) * BLOCK,
              BOARD_Y + (gy + r) * BLOCK,
              current.shape[r][c],
              BLOCK,
              0.2,
            );

      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c])
            drawBlock(
              BOARD_X + (current.x + c) * BLOCK,
              BOARD_Y + (current.y + r) * BLOCK,
              current.shape[r][c],
              BLOCK,
            );

      drawNext();
    }

    // ── Loop ─────────────────────────────────────────────────────────────────
    let rafId: number;
    let lastTime: number | null = null;

    function loop(ts: number) {
      const dt = lastTime === null ? 0 : Math.min(ts - lastTime, 50);
      lastTime = ts;
      dtMs = dt;

      processInput();
      updateGravity(dt);
      draw();

      if (score !== prevScore) {
        cbScore.current(score);
        prevScore = score;
      }
      if (lines !== prevLines) {
        cbLines.current?.(lines);
        prevLines = lines;
      }
      if (level !== prevLevel) {
        cbLevel.current(level);
        prevLevel = level;
      }
      if (state === 'gameover' && !gameOverFired) {
        gameOverFired = true;
        cbOver.current(score);
      }

      rafId = requestAnimationFrame(loop);
    }

    initGame();
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [
    cbLevel,
    cbLines,
    cbOver,
    cbPauseToggle,
    cbScore,
    keysRef,
    pausedRef,
    pressed,
  ]);

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
