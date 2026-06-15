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
    saveStatus,
    lastError,
    canUndo,
    canRedo,
    updateNode,
    undo,
    redo,
    applyAutoLayout,
  } = useTreeInfo();
  const node = nodes['1'];

  return (
    <>
      <div data-testid="status">{saveStatus}</div>
      <div data-testid="error">{lastError || ''}</div>
      <div data-testid="name">{node?.firstName || 'missing'}</div>
      <div data-testid="x">{node?.x ?? 'missing'}</div>
      <div data-testid="can-undo">{String(canUndo)}</div>
      <div data-testid="can-redo">{String(canRedo)}</div>
      <button onClick={() => updateNode('1', { firstName: 'Adam' })}>Update</button>
      <button onClick={() => updateNode('1', { firstName: 'Ewa' })}>Update again</button>
      <button onClick={undo}>Undo</button>
      <button onClick={redo}>Redo</button>
      <button onClick={applyAutoLayout}>Auto layout</button>
    </>
  );
};

describe('TreeProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(screen.getByTestId('error')).toHaveTextContent('Dane zmieniły się w innym oknie');
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
});
