import { describe, expect, it } from 'vitest';
import { normalizeTreeData, validateTreeData } from '../../src/utils/treeData';

const person = (id: string, overrides = {}) => ({
  id,
  firstName: `Person ${id}`,
  lastName: 'Example',
  maidenName: '',
  birthDate: '',
  deathDate: '',
  bio: '',
  gender: 'male',
  avatar: '',
  x: 0,
  y: 0,
  ...overrides,
});

describe('tree data domain validation', () => {
  it('rejects a person without a required name and gender', () => {
    const result = validateTreeData({
      nodes: {
        '1': { id: '1', firstName: '', x: 0, y: 0 },
      },
      edges: {},
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'Node 1 must have a non-empty first name.',
      'Node 1 must have gender male or female.',
    ]));
    expect(normalizeTreeData({ nodes: { '1': { id: '1', x: 0, y: 0 } }, edges: {} })).toBeNull();
  });

  it('rejects impossible dates', () => {
    const result = validateTreeData({
      nodes: {
        '1': person('1', { birthDate: '1980-13-01', deathDate: '1970-01-01' }),
      },
      edges: {},
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'Node 1 has an invalid birth date.',
      'Node 1 death date cannot be before birth date.',
    ]));
  });

  it('rejects invalid genealogical relationships', () => {
    const result = validateTreeData({
      nodes: {
        a: person('a'),
        b: person('b'),
        c: person('c'),
        d: person('d'),
      },
      edges: {
        self: { id: 'self', sourceId: 'a', targetId: 'a', type: 'parent-child' },
        ab: { id: 'ab', sourceId: 'a', targetId: 'b', type: 'parent-child' },
        ba: { id: 'ba', sourceId: 'b', targetId: 'a', type: 'parent-child' },
        cb: { id: 'cb', sourceId: 'c', targetId: 'b', type: 'parent-child' },
        db: { id: 'db', sourceId: 'd', targetId: 'b', type: 'parent-child' },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'Edge self cannot connect a person to themselves.',
      'Parent-child relationships cannot form cycles.',
      'Node b cannot have more than two parents.',
    ]));
  });

  it('normalizes valid array-shaped exports into maps', () => {
    const normalized = normalizeTreeData({
      nodes: [person('a'), person('b', { gender: 'female' })],
      edges: [{ id: 'ab', sourceId: 'a', targetId: 'b', type: 'parent-child' }],
    });

    expect(normalized).toEqual({
      nodes: {
        a: person('a'),
        b: person('b', { gender: 'female' }),
      },
      edges: {
        ab: { id: 'ab', sourceId: 'a', targetId: 'b', type: 'parent-child' },
      },
    });
  });
});
