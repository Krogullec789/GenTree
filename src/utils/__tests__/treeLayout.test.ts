import { describe, expect, it } from 'vitest';
import { layoutTree } from '../treeLayout';
import type { PersonNode, TreeData } from '../../types/tree';

const person = (id: string, overrides: Partial<PersonNode> = {}): PersonNode => ({
  id,
  firstName: id,
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

describe('layoutTree', () => {
  it('places parents above children and spreads siblings horizontally', () => {
    const tree: TreeData = {
      nodes: {
        parent: person('parent'),
        childA: person('childA'),
        childB: person('childB'),
      },
      edges: {
        a: { id: 'a', sourceId: 'parent', targetId: 'childA', type: 'parent-child' },
        b: { id: 'b', sourceId: 'parent', targetId: 'childB', type: 'parent-child' },
      },
    };

    const result = layoutTree(tree);

    expect(result.nodes.parent.y).toBeLessThan(result.nodes.childA.y);
    expect(result.nodes.childA.y).toBe(result.nodes.childB.y);
    expect(result.nodes.childA.x).toBeLessThan(result.nodes.childB.x);
  });

  it('keeps partners on the same generation and close to one another', () => {
    const tree: TreeData = {
      nodes: {
        first: person('first'),
        second: person('second', { gender: 'female' }),
        child: person('child'),
      },
      edges: {
        partner: { id: 'partner', sourceId: 'first', targetId: 'second', type: 'partner' },
        child: { id: 'child', sourceId: 'first', targetId: 'child', type: 'parent-child' },
      },
    };

    const result = layoutTree(tree);

    expect(result.nodes.first.y).toBe(result.nodes.second.y);
    expect(Math.abs(result.nodes.first.x - result.nodes.second.x)).toBeLessThanOrEqual(320);
    expect(result.nodes.child.y).toBeGreaterThan(result.nodes.first.y);
  });

  it('returns stable coordinates for isolated people', () => {
    const tree: TreeData = {
      nodes: {
        a: person('a'),
        b: person('b'),
      },
      edges: {},
    };

    const result = layoutTree(tree);

    expect(result.nodes.a.x).toBeLessThan(result.nodes.b.x);
    expect(result.nodes.a.y).toBe(result.nodes.b.y);
  });

  it('keeps spouse groups in their generation and orders children by family branch', () => {
    const tree: TreeData = {
      nodes: {
        jan: person('jan', { firstName: 'Jan', lastName: 'Kowalski', birthDate: '1948-01-01' }),
        helena: person('helena', { firstName: 'Helena', lastName: 'Kowalska', birthDate: '1950-01-01', gender: 'female' }),
        piotr: person('piotr', { firstName: 'Piotr', lastName: 'Kowalski', birthDate: '1974-01-01' }),
        ewa: person('ewa', { firstName: 'Ewa', lastName: 'Kowalska', birthDate: '1976-01-01', gender: 'female' }),
        anna: person('anna', { firstName: 'Anna', lastName: 'Wisniewska', birthDate: '1978-01-01', gender: 'female' }),
        tomasz: person('tomasz', { firstName: 'Tomasz', lastName: 'Wisniewski', birthDate: '1977-01-01' }),
        marek: person('marek', { firstName: 'Marek', lastName: 'Kowalski', birthDate: '1982-01-01' }),
        magdalena: person('magdalena', { firstName: 'Magdalena', lastName: 'Kowalska', birthDate: '1984-01-01', gender: 'female' }),
        kuba: person('kuba', { firstName: 'Kuba', lastName: 'Kowalski', birthDate: '2003-01-01' }),
        natalia: person('natalia', { firstName: 'Natalia', lastName: 'Kowalska', birthDate: '2007-01-01', gender: 'female' }),
        alicja: person('alicja', { firstName: 'Alicja', lastName: 'Wisniewska', birthDate: '2006-01-01', gender: 'female' }),
        filip: person('filip', { firstName: 'Filip', lastName: 'Wisniewski', birthDate: '2010-01-01' }),
        zofia: person('zofia', { firstName: 'Zofia', lastName: 'Kowalska', birthDate: '2012-01-01', gender: 'female' }),
        kacper: person('kacper', { firstName: 'Kacper', lastName: 'Kowalski', birthDate: '2015-01-01' }),
      },
      edges: {
        janHelena: { id: 'janHelena', sourceId: 'jan', targetId: 'helena', type: 'partner' },
        piotrEwa: { id: 'piotrEwa', sourceId: 'piotr', targetId: 'ewa', type: 'partner' },
        annaTomasz: { id: 'annaTomasz', sourceId: 'anna', targetId: 'tomasz', type: 'partner' },
        marekMagdalena: { id: 'marekMagdalena', sourceId: 'marek', targetId: 'magdalena', type: 'partner' },
        janPiotr: { id: 'janPiotr', sourceId: 'jan', targetId: 'piotr', type: 'parent-child' },
        helenaPiotr: { id: 'helenaPiotr', sourceId: 'helena', targetId: 'piotr', type: 'parent-child' },
        janAnna: { id: 'janAnna', sourceId: 'jan', targetId: 'anna', type: 'parent-child' },
        helenaAnna: { id: 'helenaAnna', sourceId: 'helena', targetId: 'anna', type: 'parent-child' },
        janMarek: { id: 'janMarek', sourceId: 'jan', targetId: 'marek', type: 'parent-child' },
        helenaMarek: { id: 'helenaMarek', sourceId: 'helena', targetId: 'marek', type: 'parent-child' },
        piotrKuba: { id: 'piotrKuba', sourceId: 'piotr', targetId: 'kuba', type: 'parent-child' },
        ewaKuba: { id: 'ewaKuba', sourceId: 'ewa', targetId: 'kuba', type: 'parent-child' },
        piotrNatalia: { id: 'piotrNatalia', sourceId: 'piotr', targetId: 'natalia', type: 'parent-child' },
        ewaNatalia: { id: 'ewaNatalia', sourceId: 'ewa', targetId: 'natalia', type: 'parent-child' },
        annaAlicja: { id: 'annaAlicja', sourceId: 'anna', targetId: 'alicja', type: 'parent-child' },
        tomaszAlicja: { id: 'tomaszAlicja', sourceId: 'tomasz', targetId: 'alicja', type: 'parent-child' },
        annaFilip: { id: 'annaFilip', sourceId: 'anna', targetId: 'filip', type: 'parent-child' },
        tomaszFilip: { id: 'tomaszFilip', sourceId: 'tomasz', targetId: 'filip', type: 'parent-child' },
        marekZofia: { id: 'marekZofia', sourceId: 'marek', targetId: 'zofia', type: 'parent-child' },
        magdalenaZofia: { id: 'magdalenaZofia', sourceId: 'magdalena', targetId: 'zofia', type: 'parent-child' },
        marekKacper: { id: 'marekKacper', sourceId: 'marek', targetId: 'kacper', type: 'parent-child' },
        magdalenaKacper: { id: 'magdalenaKacper', sourceId: 'magdalena', targetId: 'kacper', type: 'parent-child' },
      },
    };

    const result = layoutTree(tree);

    expect(result.nodes.jan.y).toBe(result.nodes.helena.y);
    expect(result.nodes.piotr.y).toBe(result.nodes.ewa.y);
    expect(result.nodes.anna.y).toBe(result.nodes.tomasz.y);
    expect(result.nodes.marek.y).toBe(result.nodes.magdalena.y);
    expect(result.nodes.piotr.y).toBeGreaterThan(result.nodes.jan.y);
    expect(result.nodes.kuba.y).toBeGreaterThan(result.nodes.piotr.y);

    expect(Math.min(result.nodes.piotr.x, result.nodes.ewa.x)).toBeLessThan(Math.min(result.nodes.anna.x, result.nodes.tomasz.x));
    expect(Math.min(result.nodes.anna.x, result.nodes.tomasz.x)).toBeLessThan(Math.min(result.nodes.marek.x, result.nodes.magdalena.x));
    expect(result.nodes.kuba.x).toBeLessThan(result.nodes.natalia.x);
    expect(result.nodes.natalia.x).toBeLessThan(result.nodes.alicja.x);
    expect(result.nodes.alicja.x).toBeLessThan(result.nodes.filip.x);
    expect(result.nodes.filip.x).toBeLessThan(result.nodes.zofia.x);
    expect(result.nodes.zofia.x).toBeLessThan(result.nodes.kacper.x);
  });
});
