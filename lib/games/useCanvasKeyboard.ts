import { useCallback, useEffect, useRef, type RefObject } from 'react';

const DEFAULT_PREVENT_DEFAULT_CODES = [
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
];

export interface CanvasKeyboard {
  keysRef: RefObject<Record<string, boolean>>;
  pressed: (code: string) => boolean;
}

// Registra keydown/keyup en window al montar y los retira al desmontar.
// `keysRef.current` es un mapa siempre actualizado de teclas activas (léelo
// dentro de un efecto, no durante el render); `pressed(code)` hace
// edge-trigger: solo devuelve true una vez por pulsación.
export function useCanvasKeyboard(
  preventDefaultCodes: string[] = DEFAULT_PREVENT_DEFAULT_CODES,
): CanvasKeyboard {
  const keysRef = useRef<Record<string, boolean>>({});
  const justPressedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const keys = keysRef.current;
    const justPressed = justPressedRef.current;

    function onKeyDown(e: KeyboardEvent) {
      justPressed[e.code] = !keys[e.code];
      keys[e.code] = true;
      if (preventDefaultCodes.includes(e.code)) e.preventDefault();
    }
    function onKeyUp(e: KeyboardEvent) {
      keys[e.code] = false;
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pressed = useCallback((code: string) => {
    const val = justPressedRef.current[code];
    justPressedRef.current[code] = false;
    return val;
  }, []);

  return { keysRef, pressed };
}
