/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { NodePosition } from '../types/tree';

export const createDragStore = () => {
  let positions: Record<string, NodePosition> = {};
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => positions,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    setDragPosition: (id: string, position: NodePosition) => {
      positions = { ...positions, [id]: position };
      listeners.forEach(listener => listener());
    },
    clearDragPosition: (id: string) => {
      const next = { ...positions };
      delete next[id];
      positions = next;
      listeners.forEach(listener => listener());
    },
  };
};

const DragContext = createContext<ReturnType<typeof createDragStore> | null>(null);
const ScaleContext = createContext({ canvasScale: 1, setCanvasScale: (() => {}) as (scale: number) => void });

export const DragProvider = ({ children }: { children: ReactNode }) => {
  const [store] = useState(createDragStore);
  const [canvasScale, setCanvasScale] = useState(1);
  const scale = useMemo(() => ({ canvasScale, setCanvasScale }), [canvasScale]);
  return <DragContext.Provider value={store}><ScaleContext.Provider value={scale}>{children}</ScaleContext.Provider></DragContext.Provider>;
};

export const useDragActions = () => {
  const store = useContext(DragContext);
  if (!store) throw new Error('DragProvider is required');
  return store;
};
export const useDragPositions = () => {
  const store = useDragActions();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
};
export const useCanvasScale = () => useContext(ScaleContext);
