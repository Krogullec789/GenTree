import type { SaveStatus, TreeData, TreeDocument } from '../types/tree';

export class VersionConflict extends Error {}

/** One request in flight; unsent edits are coalesced into the latest snapshot. */
export class SaveQueue {
  private pending: TreeData | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private saving = false;
  private stopped = false;
  private blocked: 'error' | 'conflict' | null = null;

  constructor(
    private version: string,
    private readonly save: (tree: TreeData, version: string) => Promise<string>,
    private readonly report: (status: SaveStatus, error: string | null, version: string) => void,
  ) {}

  get dirty() { return this.saving || this.pending !== null; }

  enqueue(tree: TreeData) {
    this.pending = tree;
    if (this.blocked || this.stopped) return;
    this.report('idle', null, this.version);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), 500);
  }

  retry() {
    if (this.blocked === 'conflict' || this.stopped) return;
    this.blocked = null;
    void this.flush();
  }

  dispose() {
    this.stopped = true;
    clearTimeout(this.timer);
  }

  private async flush(): Promise<void> {
    if (this.saving || this.blocked || this.stopped || !this.pending) return;
    clearTimeout(this.timer);
    const tree = this.pending;
    this.pending = null;
    this.saving = true;
    this.report('saving', null, this.version);
    try {
      this.version = await this.save(tree, this.version);
      if (!this.stopped) this.report(this.pending ? 'idle' : 'saved', null, this.version);
    } catch (error) {
      this.pending ??= tree;
      this.blocked = error instanceof VersionConflict ? 'conflict' : 'error';
      if (!this.stopped) this.report(this.blocked,
        this.blocked === 'conflict'
          ? 'Drzewo zmieniło się w innym oknie. Pobierz swoje zmiany przed wczytaniem wersji serwera.'
          : 'Nie udało się zapisać zmian. Twoje zmiany pozostają w tym oknie. Spróbuj ponownie lub pobierz kopię.',
        this.version);
    } finally {
      this.saving = false;
    }
    if (this.pending && !this.blocked && !this.stopped) await this.flush();
  }
}

export interface TreeStorage {
  load(): Promise<TreeDocument>;
  save(tree: TreeData, version: string): Promise<string>;
}
