import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Header from '../Header';
import * as TreeContextModule from '../../store/TreeContext';

vi.spyOn(TreeContextModule, 'useTreeInfo').mockReturnValue({
  nodes: {},
  edges: {},
  setNodes: vi.fn(),
  setEdges: vi.fn(),
  setSelectedNodeId: vi.fn(),
  setIsPanelOpen: vi.fn(),
  setFocusNodeId: vi.fn()
});

describe('Header Component', () => {
  it('renders correctly with title and buttons', () => {
    render(<Header />);
    expect(screen.getByText('GenTree')).toBeInTheDocument();
    expect(screen.getByText('Premium Family Tree')).toBeInTheDocument();
    expect(screen.getByText('Importuj JSON')).toBeInTheDocument();
    expect(screen.getByText('Eksportuj')).toBeInTheDocument();
  });
});
