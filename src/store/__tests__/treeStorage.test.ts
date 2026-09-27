import { afterEach, describe, expect, it, vi } from 'vitest';

const tree = { nodes: { a: { id: 'a', firstName: 'Jan', gender: 'male' as const, x: 0, y: 0 } }, edges: {} };

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); sessionStorage.clear(); vi.resetModules(); });

describe('storage validation', () => {
  it('never overwrites a valid demo with an invalid tree', async () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true');
    vi.resetModules();
    const { treeStorage } = await import('../treeStorage');
    const version = await treeStorage.save(tree, 'v1');
    const before = await treeStorage.load();
    await expect(treeStorage.save({ ...tree, nodes: { a: { ...tree.nodes.a, firstName: '' } } }, version)).rejects.toThrow('non-empty first name');
    expect(await treeStorage.load()).toEqual(before);
  });

  it('rejects invalid data before issuing an API request', async () => {
    vi.stubEnv('VITE_DEMO_MODE', 'false');
    vi.stubGlobal('fetch', vi.fn());
    vi.resetModules();
    const { treeStorage } = await import('../treeStorage');
    await expect(treeStorage.save({ ...tree, nodes: { a: { ...tree.nodes.a, birthDate: '2000-01-01', deathDate: '1900-01-01' } } }, 'v1')).rejects.toThrow('death date');
    expect(fetch).not.toHaveBeenCalled();
  });
});
