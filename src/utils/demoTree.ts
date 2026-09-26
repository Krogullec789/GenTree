import type { TreeData } from '../types/tree';

/** Fictional people only. Every visitor receives an independent editable copy. */
export const createDemoTree = (): TreeData => ({
  nodes: {
    jan: { id: 'jan', firstName: 'Jan', lastName: 'Kowalski', gender: 'male', birthDate: '1950-05-12', x: 360, y: 80 },
    maria: { id: 'maria', firstName: 'Maria', lastName: 'Kowalska', gender: 'female', birthDate: '1952-08-20', x: 680, y: 80 },
    adam: { id: 'adam', firstName: 'Adam', lastName: 'Kowalski', gender: 'male', birthDate: '1975-03-15', x: 80, y: 320 },
    ewa: { id: 'ewa', firstName: 'Ewa', lastName: 'Kowalska', gender: 'female', birthDate: '1977-07-04', x: 400, y: 320 },
    anna: { id: 'anna', firstName: 'Anna', lastName: 'Zielińska', gender: 'female', birthDate: '1980-11-02', x: 860, y: 320 },
    piotr: { id: 'piotr', firstName: 'Piotr', lastName: 'Kowalski', gender: 'male', birthDate: '2005-06-10', x: 240, y: 560 },
  },
  edges: Object.fromEntries([
    ['jan', 'maria', 'partner'], ['adam', 'ewa', 'partner'],
    ['jan', 'adam', 'parent-child'], ['maria', 'adam', 'parent-child'],
    ['jan', 'anna', 'parent-child'], ['maria', 'anna', 'parent-child'],
    ['adam', 'piotr', 'parent-child'], ['ewa', 'piotr', 'parent-child'],
  ].map(([sourceId, targetId, type]) => {
    const id = `${sourceId}-${targetId}`;
    return [id, { id, sourceId, targetId, type: type as 'partner' | 'parent-child' }];
  })),
});
