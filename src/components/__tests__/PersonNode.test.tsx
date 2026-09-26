import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DragProvider } from '../../store/DragContext';
import PersonNode from '../PersonNode';
import * as TreeContextModule from '../../store/TreeContext';
import type { PersonNode as PersonNodeType, TreeContextValue } from '../../types/tree';

const mockTreeContext: TreeContextValue = {
  isDemo: false,
  retrySave: vi.fn(),
  reloadTree: vi.fn(),
  resetDemo: vi.fn(),
  nodes: {},
  edges: {},
  version: 'v1',
  saveStatus: 'saved',
  lastError: null,
  canUndo: false,
  canRedo: false,
  selectedNodeId: null,
  isPanelOpen: false,
  focusNodeId: null,
  fitViewRequest: 0,
  setSelectedNodeId: vi.fn(),
  setIsPanelOpen: vi.fn(),
  setFocusNodeId: vi.fn(),
  addNode: vi.fn(),
  updateNode: vi.fn(),
  removeNode: vi.fn(),
  addEdge: vi.fn(),
  removeEdge: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  applyAutoLayout: vi.fn(),
  replaceTree: vi.fn(),
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

    render(<DragProvider><PersonNode node={nodeData} /></DragProvider>);

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

    render(<DragProvider><PersonNode node={nodeData} /></DragProvider>);
    screen.getByLabelText('Przesuń osobę').focus();
    await user.keyboard('{ArrowRight}{ArrowDown}');

    expect(mockTreeContext.updateNode).toHaveBeenNthCalledWith(1, '1', { x: 110, y: 100 });
    expect(mockTreeContext.updateNode).toHaveBeenNthCalledWith(2, '1', { x: 100, y: 110 });
  });
});
