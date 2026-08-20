import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { CanvasGameProps } from '@/lib/games/types';

export type GameStat = 'lives' | 'lines' | 'length';

export interface GameRegistryEntry {
  Component: ComponentType<CanvasGameProps>;
  stats: GameStat[];
}

const AsteroidsGame = dynamic(() => import('./AsteroidsGame'), {
  ssr: false,
});
const TetrisGame = dynamic(() => import('./TetrisGame'), { ssr: false });
const ArkanoidGame = dynamic(() => import('./ArkanoidGame'), { ssr: false });
const SnakeGame = dynamic(() => import('./SnakeGame'), { ssr: false });

const registry: Record<string, GameRegistryEntry> = {
  asteroids: { Component: AsteroidsGame, stats: ['lives'] },
  tetris: { Component: TetrisGame, stats: ['lines'] },
  arkanoid: { Component: ArkanoidGame, stats: ['lives'] },
  snake: { Component: SnakeGame, stats: ['length'] },
};

export default registry;
