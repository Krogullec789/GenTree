import { afterEach, describe, expect, it, vi } from 'vitest';
import { SaveQueue, VersionConflict } from '../saveQueue';
import type { TreeData } from '../../types/tree';

const tree = (name: string): TreeData => ({ nodes: { a: { id: 'a', firstName: name, gender: 'male', x: 0, y: 0 } }, edges: {} });
const deferred = () => {
  let resolve!: (version: string) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<string>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

describe('serialized autosave', () => {
  afterEach(() => vi.useRealTimers());

  it('coalesces edits during a slow request and uses its returned version', async () => {
    vi.useFakeTimers();
    const first = deferred();
    const save = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue('v3');
    const report = vi.fn();
    const queue = new SaveQueue('v1', save, report);
    queue.enqueue(tree('Adam'));
    await vi.advanceTimersByTimeAsync(500);
    queue.enqueue(tree('Ewa'));
    queue.enqueue(tree('Anna'));
    await vi.advanceTimersByTimeAsync(1500);
    expect(save).toHaveBeenCalledTimes(1);
    expect(queue.dirty).toBe(true);
    first.resolve('v2');
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenLastCalledWith(tree('Anna'), 'v2');
    expect(report).toHaveBeenLastCalledWith('saved', null, 'v3');
    expect(queue.dirty).toBe(false);
    queue.dispose();
  });

  it('saves an empty tree and retains the latest edits for an explicit retry', async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('v2');
    const report = vi.fn();
    const queue = new SaveQueue('v1', save, report);
    queue.enqueue(tree('Jan'));
    await vi.advanceTimersByTimeAsync(500);
    queue.enqueue({ nodes: {}, edges: {} });
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(report.mock.calls.at(-1)?.[0]).toBe('error');
    queue.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenLastCalledWith({ nodes: {}, edges: {} }, 'v1');
    expect(queue.dirty).toBe(false);
    queue.dispose();
  });

  it('keeps a conflict visible and never retries stale writes automatically or manually', async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockRejectedValue(new VersionConflict());
    const report = vi.fn();
    const queue = new SaveQueue('v1', save, report);
    queue.enqueue(tree('Jan'));
    await vi.advanceTimersByTimeAsync(500);
    queue.enqueue(tree('Anna'));
    queue.retry();
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(report.mock.calls.at(-1)?.[0]).toBe('conflict');
    expect(queue.dirty).toBe(true);
    queue.dispose();
  });

  it('does not send pending data or report late responses after disposal', async () => {
    vi.useFakeTimers();
    const first = deferred();
    const save = vi.fn().mockReturnValue(first.promise);
    const report = vi.fn();
    const queue = new SaveQueue('v1', save, report);
    queue.enqueue(tree('Jan'));
    await vi.advanceTimersByTimeAsync(500);
    queue.enqueue(tree('Anna'));
    queue.dispose();
    report.mockClear();
    first.resolve('v2');
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(report).not.toHaveBeenCalled();
  });
});
