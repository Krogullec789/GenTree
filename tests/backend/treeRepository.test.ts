import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { TreeRepository } from '../../src/server/treeRepository';

const tempDirs: string[] = [];

const createTempDbPath = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gentree-repository-'));
  tempDirs.push(dir);
  return path.join(dir, 'db.json');
};

describe('TreeRepository', () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('recovers a null-filled database file as an empty tree document', async () => {
    const dbPath = createTempDbPath();
    fs.writeFileSync(dbPath, Buffer.alloc(128));

    const repository = new TreeRepository(dbPath);
    const document = await repository.read();

    expect(document.nodes).toEqual({});
    expect(document.edges).toEqual({});
    expect(document.version).toEqual(expect.any(String));

    expect(() => JSON.parse(fs.readFileSync(dbPath, 'utf8'))).not.toThrow();
  });
});
