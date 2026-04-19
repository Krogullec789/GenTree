import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PersonNode from '../PersonNode';
import * as TreeContextModule from '../../store/TreeContext';

vi.spyOn(TreeContextModule, 'useTreeInfo').mockReturnValue({
  selectedNodeId: null,
  setSelectedNodeId: vi.fn(),
  setIsPanelOpen: vi.fn(),
  updateNode: vi.fn()
});

describe('PersonNode Component', () => {
  it('renders student data correctly', () => {
    const nodeData = {
      id: '1',
      firstName: 'Jan',
      lastName: 'Kowalski',
      birthDate: '1980-01-01',
      gender: 'male',
      x: 100,
      y: 100
    };

    render(<PersonNode node={nodeData} />);
    
    expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
    expect(screen.getByText('1980')).toBeInTheDocument();
  });
});
