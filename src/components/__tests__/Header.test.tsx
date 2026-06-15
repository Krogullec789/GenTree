import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Header from '../Header';
import * as TreeContextModule from '../../store/TreeContext';
import type { TreeContextValue } from '../../types/tree';

const mockTreeContext: TreeContextValue = {
  nodes: {},
  edges: {},
  version: 'v1',
  saveStatus: 'saved',
  lastError: null,
  canUndo: true,
  canRedo: true,
  selectedNodeId: null,
  isPanelOpen: false,
  canvasScale: 1,
  dragPositions: {},
  focusNodeId: null,
  setCanvasScale: vi.fn(),
  setDragPosition: vi.fn(),
  clearDragPosition: vi.fn(),
  addNode: vi.fn(),
  updateNode: vi.fn(),
  removeNode: vi.fn(),
  addEdge: vi.fn(),
  removeEdge: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  applyAutoLayout: vi.fn(),
  setNodes: vi.fn(),
  setEdges: vi.fn(),
  replaceTree: vi.fn(),
  setSelectedNodeId: vi.fn(),
  setIsPanelOpen: vi.fn(),
  setFocusNodeId: vi.fn(),
};

vi.spyOn(TreeContextModule, 'useTreeInfo').mockReturnValue(mockTreeContext);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

describe('Header Component', () => {
  it('renders correctly with title and toolbar buttons', () => {
    render(<Header />);
    expect(screen.getByText('GenTree')).toBeInTheDocument();
    expect(screen.getByText('Premium Family Tree')).toBeInTheDocument();
    expect(screen.getByText('Importuj JSON')).toBeInTheDocument();
    expect(screen.getByText('Eksportuj')).toBeInTheDocument();
    expect(screen.getByLabelText('Cofnij zmianę')).toBeInTheDocument();
    expect(screen.getByLabelText('Ponów zmianę')).toBeInTheDocument();
    expect(screen.getByLabelText('Ułóż drzewo automatycznie')).toBeInTheDocument();
  });

  it('calls history and layout actions from toolbar buttons', async () => {
    const user = userEvent.setup();

    render(<Header />);

    await user.click(screen.getByLabelText('Cofnij zmianę'));
    await user.click(screen.getByLabelText('Ponów zmianę'));
    await user.click(screen.getByLabelText('Ułóż drzewo automatycznie'));

    expect(mockTreeContext.undo).toHaveBeenCalledOnce();
    expect(mockTreeContext.redo).toHaveBeenCalledOnce();
    expect(mockTreeContext.applyAutoLayout).toHaveBeenCalledOnce();
  });

  it('rejects imported JSON with an invalid tree shape', async () => {
    const user = userEvent.setup();
    const invalidFile = new File(
      [JSON.stringify({ nodes: null, edges: {} })],
      'invalid-tree.json',
      { type: 'application/json' },
    );

    render(<Header />);
    await user.upload(screen.getByLabelText('Importuj JSON'), invalidFile);

    expect(mockTreeContext.replaceTree).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText('Nieprawidłowy plik z danymi drzewa.')).toBeInTheDocument();
    });
  });

  it('requires confirmation before replacing the tree during import', async () => {
    const user = userEvent.setup();
    const validTree = {
      nodes: {
        '1': {
          id: '1',
          firstName: 'Anna',
          lastName: 'Nowak',
          maidenName: '',
          birthDate: '',
          deathDate: '',
          bio: '',
          gender: 'female' as const,
          avatar: '',
          x: 0,
          y: 0,
        },
      },
      edges: {},
    };
    const file = new File([JSON.stringify(validTree)], 'tree.json', { type: 'application/json' });

    render(<Header />);
    await user.upload(screen.getByLabelText('Importuj JSON'), file);

    expect(mockTreeContext.replaceTree).not.toHaveBeenCalled();
    expect(await screen.findByRole('dialog')).toHaveTextContent('Zastąpić obecne drzewo?');

    await user.click(screen.getByRole('button', { name: 'Importuj' }));

    expect(mockTreeContext.replaceTree).toHaveBeenCalledWith(validTree);
  });
});
