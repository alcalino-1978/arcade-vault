// Contrato de props compartido por todos los componentes canvas de components/games/registry.ts.
export interface CanvasGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  onLivesChange?: (lives: number) => void;
  onLinesChange?: (lines: number) => void;
  onLengthChange?: (length: number) => void;
  // Permite que un juego (p. ej. Tetris con P/Escape) pida el toggle de
  // pausa al padre, que es quien posee el estado `paused`.
  onPauseToggle?: () => void;
}
