import { normalizeTreeDocument, validateTreeData } from '../utils/treeData';
import { createDemoTree } from '../utils/demoTree';
import { VersionConflict, type TreeStorage } from './saveQueue';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || new URLSearchParams(window.location.search).has('demo');
const DEMO_KEY = 'gentree-demo-v1';
const headers = (extra = {}) => ({ ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}), ...extra });

export const treeStorage: TreeStorage = {
  async load() {
    let data: unknown;
    if (DEMO_MODE) {
      const saved = sessionStorage.getItem(DEMO_KEY);
      data = saved ? JSON.parse(saved) : { ...createDemoTree(), version: crypto.randomUUID() };
      if (!saved) sessionStorage.setItem(DEMO_KEY, JSON.stringify(data));
    } else {
      const response = await fetch(`${API_URL}/api/tree`, { headers: headers() });
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      data = await response.json();
    }
    const document = normalizeTreeDocument(data);
    if (!document) throw new Error('Server returned invalid tree data. Local state was not replaced.');
    return document;
  },
  async save(tree, version) {
    const validation = validateTreeData(tree);
    if (!validation.valid) throw new Error(validation.errors[0]);
    if (DEMO_MODE) {
      const nextVersion = crypto.randomUUID();
      sessionStorage.setItem(DEMO_KEY, JSON.stringify({ ...validation.data, version: nextVersion }));
      return nextVersion;
    }
    const response = await fetch(`${API_URL}/api/tree`, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json', 'If-Match': version }),
      body: JSON.stringify(validation.data),
    });
    if (response.status === 409) throw new VersionConflict();
    const body = await response.json();
    if (!response.ok || typeof body.version !== 'string') throw new Error('Invalid save response');
    return body.version;
  },
};
