import { useState, useCallback } from 'react';

const MAX_HISTORY = 50;

interface HistoryState {
  stack: string[];
  index: number;
}

export function useSvgHistory() {
  const [state, setState] = useState<HistoryState>({ stack: [], index: -1 });

  // undo()/redo() move the pointer and hand the value back to the caller, which
  // applies it via setSvgOutput WITHOUT calling pushState — so no self-push guard
  // is needed. A later genuine pushState correctly truncates the redo branch.
  const pushState = useCallback((svg: string) => {
    setState(prev => {
      const truncated = prev.stack.slice(0, prev.index + 1);
      truncated.push(svg);
      if (truncated.length > MAX_HISTORY) {
        truncated.shift();
      }
      return { stack: truncated, index: truncated.length - 1 };
    });
  }, []);

  const undo = useCallback((): string | null => {
    if (state.index <= 0) return null;
    const newIndex = state.index - 1;
    setState(prev => ({ ...prev, index: newIndex }));
    return state.stack[newIndex];
  }, [state]);

  const redo = useCallback((): string | null => {
    if (state.index >= state.stack.length - 1) return null;
    const newIndex = state.index + 1;
    setState(prev => ({ ...prev, index: newIndex }));
    return state.stack[newIndex];
  }, [state]);

  const canUndo = state.index > 0;
  const canRedo = state.index < state.stack.length - 1;

  return { pushState, undo, redo, canUndo, canRedo };
}
