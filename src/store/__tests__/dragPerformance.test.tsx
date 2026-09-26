import { createContext, memo, useContext, useEffect, useState } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDragActions, useDragPositions } from '../DragContext';
import { TreeProvider, useTreeInfo } from '../TreeContext';

// Deterministic subscription benchmark, not an FPS or browser-paint benchmark.
// The baseline reproduces the previous shared-context subscription topology.
const LegacyContext = createContext({ dragX: 0 });

describe('drag subscription isolation', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it.each([100, 500, 1000])('%i data consumers do not render for 20 pointer updates', async count => {
    let baselineRenders = 0;
    let isolatedRenders = 0;
    let lineRenders = 0;
    let moveLegacy!: (x: number) => void;
    let move!: (id: string, position: { x: number; y: number }) => void;

    const LegacyCard = memo(function LegacyCard() {
      useContext(LegacyContext);
      baselineRenders++;
      return null;
    });
    const baselineCards = Array.from({ length: count }, (_, index) => <LegacyCard key={index} />);
    const LegacyHarness = () => {
      const [dragX, setDragX] = useState(0);
      useEffect(() => { moveLegacy = setDragX; }, []);
      return <LegacyContext.Provider value={{ dragX }}>{baselineCards}</LegacyContext.Provider>;
    };
    const legacy = render(<LegacyHarness />);
    baselineRenders = 0;
    for (let step = 1; step <= 20; step++) act(() => moveLegacy(step));
    legacy.unmount();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ nodes: {}, edges: {}, version: 'v1' }) }));
    const DataConsumer = memo(function DataConsumer() {
      useTreeInfo();
      isolatedRenders++;
      return null;
    });
    const Lines = () => { useDragPositions(); lineRenders++; return null; };
    const DragHarness = () => {
      const actions = useDragActions();
      useEffect(() => { move = actions.setDragPosition; }, [actions]);
      return <Lines />;
    };
    await act(async () => {
      render(<TreeProvider>
        {Array.from({ length: count }, (_, index) => <DataConsumer key={index} />)}
        <DragHarness />
      </TreeProvider>);
    });
    isolatedRenders = 0;
    lineRenders = 0;
    for (let step = 1; step <= 20; step++) act(() => move('person', { x: step, y: 0 }));

    expect(baselineRenders).toBe(count * 20);
    expect(isolatedRenders).toBe(0);
    expect(lineRenders).toBe(20);
    console.info(JSON.stringify({ people: count, pointerUpdates: 20, baselineDataRenders: baselineRenders, isolatedDataRenders: isolatedRenders, lineRenders }));
  });
});
