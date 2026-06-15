import fs from 'fs';
import path from 'path';
import { createHash, randomUUID } from 'crypto';
import { normalizeTreeData, validateTreeData } from '../utils/treeData';
import type { TreeData, TreeDocument } from '../types/tree';

interface StoredTreeDocument {
  version: string;
  updatedAt: string;
  data: TreeData;
}

const emptyTree = (): TreeData => ({ nodes: {}, edges: {} });

const isRecoverableEmptyFile = (raw: string) =>
  raw.length === 0 || raw.replace(/\0/g, '').trim().length === 0;

const contentVersion = (data: TreeData) =>
  createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16);

const createDocument = (data: TreeData, version = contentVersion(data)): TreeDocument => ({
  ...data,
  version,
});

export class TreeRepository {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly dbFile: string) {}

  async ensureInitialized() {
    await fs.promises.mkdir(path.dirname(this.dbFile), { recursive: true });
    try {
      await fs.promises.access(this.dbFile);
    } catch {
      await this.writeStoredDocument(emptyTree(), randomUUID());
    }
  }

  async read(): Promise<TreeDocument> {
    try {
      const raw = await fs.promises.readFile(this.dbFile, 'utf8');
      if (isRecoverableEmptyFile(raw)) {
        return this.replaceWithEmptyDocument();
      }

      const parsed = JSON.parse(raw) as unknown;

      const stored = this.parseStoredDocument(parsed);
      if (!stored) {
        throw new Error('Stored tree data is invalid.');
      }

      return createDocument(stored.data, stored.version);
    } catch (error) {
      const readError = error as NodeJS.ErrnoException;
      if (readError.code === 'ENOENT') {
        const data = emptyTree();
        return createDocument(data, contentVersion(data));
      }
      throw error;
    }
  }

  async save(data: TreeData, expectedVersion: string): Promise<TreeDocument> {
    let savedDocument: TreeDocument | null = null;

    this.writeQueue = this.writeQueue
      .catch(() => {})
      .then(async () => {
        const current = await this.read();
        if (current.version !== expectedVersion) {
          const conflict = new Error('Version conflict') as Error & { statusCode: number; version: string };
          conflict.statusCode = 409;
          conflict.version = current.version;
          throw conflict;
        }

        const nextVersion = randomUUID();
        await this.writeStoredDocument(data, nextVersion);
        savedDocument = createDocument(data, nextVersion);
      });

    await this.writeQueue;
    if (!savedDocument) throw new Error('Failed to save tree data.');
    return savedDocument;
  }

  private parseStoredDocument(parsed: unknown): StoredTreeDocument | null {
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      'data' in parsed &&
      'version' in parsed &&
      typeof (parsed as { version?: unknown }).version === 'string'
    ) {
      const record = parsed as { data: unknown; version: string; updatedAt?: unknown };
      const normalized = normalizeTreeData(record.data);
      if (!normalized) return null;

      return {
        data: normalized,
        version: record.version,
        updatedAt: typeof record.updatedAt === 'string'
          ? record.updatedAt
          : new Date().toISOString(),
      };
    }

    const validation = validateTreeData(parsed);
    if (!validation.valid) return null;

    return {
      data: validation.data,
      version: contentVersion(validation.data),
      updatedAt: new Date().toISOString(),
    };
  }

  private async writeStoredDocument(data: TreeData, version: string): Promise<void> {
    const stored: StoredTreeDocument = {
      version,
      updatedAt: new Date().toISOString(),
      data,
    };
    const tmpFile = `${this.dbFile}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    await fs.promises.writeFile(tmpFile, JSON.stringify(stored, null, 2));
    await fs.promises.rename(tmpFile, this.dbFile);
  }

  private async replaceWithEmptyDocument(): Promise<TreeDocument> {
    const data = emptyTree();
    const version = randomUUID();
    await this.writeStoredDocument(data, version);
    return createDocument(data, version);
  }
}
