import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PersonNode from '../PersonNode';
import * as TreeContextModule from '../../store/TreeContext';
import type { PersonNode as PersonNodeType, TreeContextValue } from '../../types/tree';

const mockTreeContext: TreeContextValue = {
  nodes: {},
  edges: {},
  version: 'v1',
  saveStatus: 'saved',
  lastError: null,
  canUndo: false,
  canRedo: false,
  selectedNodeId: null,
  isPanelOpen: false,
  dragPositions: {},
  focusNodeId: null,
  setSelectedNodeId: vi.fn(),
  setIsPanelOpen: vi.fn(),
  setCanvasScale: vi.fn(),
  setFocusNodeId: vi.fn(),
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
  canvasScale: 1,
  setDragPosition: vi.fn(),
  clearDragPosition: vi.fn(),
};

vi.spyOn(TreeContextModule, 'useTreeInfo').mockReturnValue(mockTreeContext);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PersonNode Component', () => {
  it('renders person data correctly', () => {
    const nodeData: PersonNodeType = {
      id: '1',
      firstName: 'Jan',
      lastName: 'Kowalski',
      birthDate: '1980-01-01',
      gender: 'male',
      x: 100,
      y: 100,
    };

    render(<PersonNode node={nodeData} />);

    expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
    expect(screen.getByText('1980')).toBeInTheDocument();
    expect(screen.getByLabelText('Otwórz profil: Jan Kowalski')).toBeInTheDocument();
  });

  it('moves the node with keyboard arrows when the drag handle is focused', async () => {
    const user = userEvent.setup();
    const nodeData: PersonNodeType = {
      id: '1',
      firstName: 'Jan',
      lastName: 'Kowalski',
      birthDate: '1980-01-01',
      gender: 'male',
      x: 100,
      y: 100,
    };

    render(<PersonNode node={nodeData} />);
    screen.getByLabelText('Przesuń osobę').focus();
    await user.keyboard('{ArrowRight}{ArrowDown}');

    expect(mockTreeContext.updateNode).toHaveBeenNthCalledWith(1, '1', { x: 110, y: 100 });
    expect(mockTreeContext.updateNode).toHaveBeenNthCalledWith(2, '1', { x: 100, y: 110 });
  });
});
