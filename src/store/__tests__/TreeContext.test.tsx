import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TreeProvider, useTreeInfo } from '../TreeContext';

const validNode = {
  id: '1',
  firstName: 'Jan',
  lastName: 'Kowalski',
  maidenName: '',
  birthDate: '',
  deathDate: '',
  bio: '',
  gender: 'male' as const,
  avatar: '',
  x: 0,
  y: 0,
};

const Harness = () => {
  const {
    nodes,
    edges,
    addRelative,
    saveStatus,
    lastError,
    canUndo,
    canRedo,
    updateNode,
    removeNode,
    undo,
    redo,
    applyAutoLayout,
  } = useTreeInfo();
  const node = nodes['1'];

  return (
    <>
      <div data-testid="status">{saveStatus}</div>
      <div data-testid="error">{lastError || ''}</div>
      <div data-testid="people">{Object.keys(nodes).length}</div>
      <div data-testid="relations">{JSON.stringify(Object.values(edges))}</div>
      <button onClick={() => addRelative('1', 'parent', { firstName: 'Rodzic', gender: 'male', x: 0, y: 0 })}>Add parent</button>
      <button onClick={() => updateNode('1', { firstName: '' })}>Invalid update</button>
      <div data-testid="name">{node?.firstName || 'missing'}</div>
      <div data-testid="x">{node?.x ?? 'missing'}</div>
      <div data-testid="can-undo">{String(canUndo)}</div>
      <div data-testid="can-redo">{String(canRedo)}</div>
      <button onClick={() => updateNode('1', { firstName: 'Adam' })}>Update</button>
      <button onClick={() => updateNode('1', { firstName: 'Ewa' })}>Update again</button>
      <button onClick={() => removeNode('1')}>Remove</button>
      <button onClick={undo}>Undo</button>
      <button onClick={redo}>Redo</button>
      <button onClick={applyAutoLayout}>Auto layout</button>
    </>
  );
};

describe('TreeProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not replace local state with a fallback root when the server returns invalid data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ nodes: { bad: { id: 'bad', x: 0, y: 0 } }, edges: {}, version: 'v1' }),
    }));

    render(<TreeProvider><Harness /></TreeProvider>);

    expect(await screen.findByTestId('status')).toHaveTextContent('error');
    expect(screen.getByTestId('name')).toHaveTextContent('missing');
    expect(screen.getByTestId('error')).toHaveTextContent('Server returned invalid tree data');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('saves updates with the loaded version and handles conflicts without retrying blindly', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ nodes: { '1': validNode }, edges: {}, version: 'v1' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: 'Version conflict', version: 'v2' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    render(<TreeProvider><Harness /></TreeProvider>);

    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Jan'));
    await userEvent.click(screen.getByRole('button', { name: 'Update' }));

    await new Promise(resolve => setTimeout(resolve, 550));

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/api/tree',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'If-Match': 'v1' }),
      }),
    );
    expect(await screen.findByTestId('status')).toHaveTextContent('conflict');
    expect(screen.getByTestId('error')).toHaveTextContent('Drzewo zmieniło się w innym oknie');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not save unchanged tree data again when the server returns a new version', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ nodes: { '1': validNode }, edges: {}, version: 'v1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, version: 'v2' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, version: 'v3' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    render(<TreeProvider><Harness /></TreeProvider>);

    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Jan'));
    await userEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await new Promise(resolve => setTimeout(resolve, 650));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('status')).toHaveTextContent('saved');
  });

  it('supports undo and redo for tree edits', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ nodes: { '1': validNode }, edges: {}, version: 'v1' }),
    }));

    render(<TreeProvider><Harness /></TreeProvider>);

    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Jan'));
    expect(screen.getByTestId('can-undo')).toHaveTextContent('false');

    await userEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(screen.getByTestId('name')).toHaveTextContent('Adam');
    expect(screen.getByTestId('can-undo')).toHaveTextContent('true');

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByTestId('name')).toHaveTextContent('Jan');
    expect(screen.getByTestId('can-redo')).toHaveTextContent('true');

    await userEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(screen.getByTestId('name')).toHaveTextContent('Adam');
  });

  it('clears redo history after a new edit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ nodes: { '1': validNode }, edges: {}, version: 'v1' }),
    }));

    render(<TreeProvider><Harness /></TreeProvider>);

    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Jan'));
    await userEvent.click(screen.getByRole('button', { name: 'Update' }));
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByTestId('can-redo')).toHaveTextContent('true');

    await userEvent.click(screen.getByRole('button', { name: 'Update again' }));

    expect(screen.getByTestId('name')).toHaveTextContent('Ewa');
    expect(screen.getByTestId('can-redo')).toHaveTextContent('false');
  });
  it('persists an empty tree and does not invent a person when loading it', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ nodes: { '1': validNode }, edges: {}, version: 'v1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ version: 'v2' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ nodes: {}, edges: {}, version: 'v2' }) });
    vi.stubGlobal('fetch', fetchMock);
    const first = render(<TreeProvider><Harness /></TreeProvider>);
    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Jan'));
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ nodes: {}, edges: {} });
    first.unmount();
    render(<TreeProvider><Harness /></TreeProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('saved'));
    expect(screen.getByTestId('name')).toHaveTextContent('missing');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

});


describe('atomic domain edits', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('adds a relative with its edge in one undo step, including redo and persistence', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ nodes: { '1': validNode }, edges: {}, version: 'v1' }) })
      .mockResolvedValue({ ok: true, json: async () => ({ version: 'v2' }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<TreeProvider><Harness /></TreeProvider>);
    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Jan'));
    await userEvent.click(screen.getByRole('button', { name: 'Add parent' }));
    expect(screen.getByTestId('people')).toHaveTextContent('2');
    const relations = screen.getByTestId('relations').textContent;
    expect(JSON.parse(relations!)).toEqual([expect.objectContaining({ targetId: '1', type: 'parent-child' })]);
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByTestId('people')).toHaveTextContent('1');
    expect(screen.getByTestId('relations')).toHaveTextContent('[]');
    expect(screen.getByTestId('can-undo')).toHaveTextContent('false');
    await userEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(screen.getByTestId('people')).toHaveTextContent('2');
    expect(screen.getByTestId('relations').textContent).toBe(relations);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const saved = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(Object.keys(saved.nodes)).toHaveLength(2);
    expect(Object.values(saved.edges)).toEqual(JSON.parse(relations!));
  });

  it('rejects a third parent without adding an orphan, history entry or save', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      nodes: { '1': validNode, a: { ...validNode, id: 'a' }, b: { ...validNode, id: 'b' } },
      edges: {
        a1: { id: 'a1', sourceId: 'a', targetId: '1', type: 'parent-child' },
        b1: { id: 'b1', sourceId: 'b', targetId: '1', type: 'parent-child' },
      }, version: 'v1',
    }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<TreeProvider><Harness /></TreeProvider>);
    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Jan'));
    const relations = screen.getByTestId('relations').textContent;
    await userEvent.click(screen.getByRole('button', { name: 'Add parent' }));
    expect(screen.getByTestId('error')).toHaveTextContent('more than two parents');
    expect(screen.getByTestId('people')).toHaveTextContent('3');
    expect(screen.getByTestId('relations').textContent).toBe(relations);
    expect(screen.getByTestId('can-undo')).toHaveTextContent('false');
    await new Promise(resolve => setTimeout(resolve, 550));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid direct updates without modifying the tree or its history', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ nodes: { '1': validNode }, edges: {}, version: 'v1' }) }));
    render(<TreeProvider><Harness /></TreeProvider>);
    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Jan'));
    await userEvent.click(screen.getByRole('button', { name: 'Invalid update' }));
    expect(screen.getByTestId('name')).toHaveTextContent('Jan');
    expect(screen.getByTestId('can-undo')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('non-empty first name');
  });
});
