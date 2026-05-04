import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  pollAnalysisOnce,
  type AnalysisPollerDeps,
} from '@/lib/analysis-poller';
import type { PolledAnalysisLog } from '@/lib/photo-analysis-result';
import { PollingController } from '@/lib/polling-controller';

function makeDeps(overrides: Partial<AnalysisPollerDeps> = {}): AnalysisPollerDeps {
  return {
    fetchLogStatus: vi.fn().mockResolvedValue({ data: null, error: null }),
    createSignedUrl: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

const baseLog: PolledAnalysisLog = {
  bristol_score: 4,
  recommendation: '保持目前飲食。',
  risk_level: 'normal',
  status: 'pending',
  summary: '狀況看起來正常。',
};

const baseArgs = {
  imagePath: 'user-id/poop.jpg',
  logId: 'log-1',
  previewUri: 'file:///preview.jpg',
};

function newController() {
  const c = new PollingController<unknown>({ maxErrors: 3, timeoutMs: 90_000 });
  c.start('timer-id', 0);
  return c;
}

describe('pollAnalysisOnce', () => {
  let controller: PollingController<unknown>;

  beforeEach(() => {
    controller = newController();
  });

  it('returns pending while the log status is still in-progress', async () => {
    const deps = makeDeps({
      fetchLogStatus: vi.fn().mockResolvedValue({ data: { ...baseLog, status: 'pending' }, error: null }),
    });

    const outcome = await pollAnalysisOnce({ controller, deps, now: 1_000, ...baseArgs });

    expect(outcome).toEqual({ kind: 'pending' });
    // 後續 tick 仍可進入 (endRequest 已被 finally 清掉)
    expect(controller.beginRequest()).toBe(true);
  });

  it('returns completed with the signed URL when the log finishes successfully', async () => {
    const fetchLogStatus = vi.fn().mockResolvedValue({
      data: { ...baseLog, status: 'done', risk_level: 'observe' },
      error: null,
    });
    const createSignedUrl = vi.fn().mockResolvedValue('https://signed.example/poop.jpg');
    const deps = makeDeps({ fetchLogStatus, createSignedUrl });

    const outcome = await pollAnalysisOnce({ controller, deps, now: 1_000, ...baseArgs });

    expect(outcome.kind).toBe('completed');
    if (outcome.kind !== 'completed') return;
    expect(outcome.logId).toBe('log-1');
    expect(outcome.result.imageUrl).toBe('https://signed.example/poop.jpg');
    expect(outcome.result.riskLevel).toBe('observe');
    expect(outcome.result.failed).toBe(false);
    expect(createSignedUrl).toHaveBeenCalledWith('user-id/poop.jpg');
  });

  it('falls back to the preview URI when signed URL generation returns null', async () => {
    const deps = makeDeps({
      fetchLogStatus: vi.fn().mockResolvedValue({ data: { ...baseLog, status: 'done' }, error: null }),
      createSignedUrl: vi.fn().mockResolvedValue(null),
    });

    const outcome = await pollAnalysisOnce({ controller, deps, now: 1_000, ...baseArgs });

    expect(outcome.kind).toBe('completed');
    if (outcome.kind !== 'completed') return;
    expect(outcome.result.imageUrl).toBe('file:///preview.jpg');
  });

  it('marks the result as failed when the log status is `failed`', async () => {
    const deps = makeDeps({
      fetchLogStatus: vi.fn().mockResolvedValue({ data: { ...baseLog, status: 'failed' }, error: null }),
      createSignedUrl: vi.fn().mockResolvedValue('https://signed.example/poop.jpg'),
    });

    const outcome = await pollAnalysisOnce({ controller, deps, now: 1_000, ...baseArgs });

    expect(outcome.kind).toBe('completed');
    if (outcome.kind !== 'completed') return;
    expect(outcome.result.failed).toBe(true);
    expect(outcome.result.riskLevel).toBe(null);
  });

  it('returns timeout once total elapsed exceeds timeoutMs', async () => {
    const deps = makeDeps();
    const outcome = await pollAnalysisOnce({ controller, deps, now: 90_001, ...baseArgs });

    expect(outcome).toEqual({ kind: 'timeout' });
    expect(deps.fetchLogStatus).not.toHaveBeenCalled();
  });

  it('returns skipped when a previous request is still in-flight', async () => {
    const deps = makeDeps({
      fetchLogStatus: vi.fn().mockResolvedValue({ data: { ...baseLog, status: 'pending' }, error: null }),
    });

    // 模擬上一輪還沒回來
    controller.beginRequest();

    const outcome = await pollAnalysisOnce({ controller, deps, now: 1_000, ...baseArgs });

    expect(outcome).toEqual({ kind: 'skipped' });
    expect(deps.fetchLogStatus).not.toHaveBeenCalled();
  });

  it('treats consecutive query errors as pending until reaching the threshold, then fatal', async () => {
    const deps = makeDeps({
      fetchLogStatus: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
    });

    expect((await pollAnalysisOnce({ controller, deps, now: 1_000, ...baseArgs })).kind).toBe('pending');
    expect((await pollAnalysisOnce({ controller, deps, now: 2_000, ...baseArgs })).kind).toBe('pending');

    const fatal = await pollAnalysisOnce({ controller, deps, now: 3_000, ...baseArgs });
    expect(fatal).toEqual({ kind: 'fatal-error', cause: 'query-error' });
  });

  it('treats thrown exceptions the same as query errors for the threshold', async () => {
    const deps = makeDeps({
      fetchLogStatus: vi.fn().mockRejectedValue(new Error('network down')),
    });

    expect((await pollAnalysisOnce({ controller, deps, now: 1_000, ...baseArgs })).kind).toBe('pending');
    expect((await pollAnalysisOnce({ controller, deps, now: 2_000, ...baseArgs })).kind).toBe('pending');

    const fatal = await pollAnalysisOnce({ controller, deps, now: 3_000, ...baseArgs });
    expect(fatal).toEqual({ kind: 'fatal-error', cause: 'exception' });
  });

  it('resets the error counter after a successful (non-error) response', async () => {
    const fetchLogStatus = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
      .mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
      .mockResolvedValueOnce({ data: { ...baseLog, status: 'pending' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
      .mockResolvedValueOnce({ data: null, error: { message: 'boom' } });

    const deps = makeDeps({ fetchLogStatus });

    // 兩次錯誤、一次成功（重置 counter）、再兩次錯誤 — 都應該是 pending，不應該爆 fatal
    expect((await pollAnalysisOnce({ controller, deps, now: 1_000, ...baseArgs })).kind).toBe('pending');
    expect((await pollAnalysisOnce({ controller, deps, now: 2_000, ...baseArgs })).kind).toBe('pending');
    expect((await pollAnalysisOnce({ controller, deps, now: 3_000, ...baseArgs })).kind).toBe('pending');
    expect((await pollAnalysisOnce({ controller, deps, now: 4_000, ...baseArgs })).kind).toBe('pending');
    expect((await pollAnalysisOnce({ controller, deps, now: 5_000, ...baseArgs })).kind).toBe('pending');
  });

  it('always releases the in-flight slot, even on exception', async () => {
    const deps = makeDeps({
      fetchLogStatus: vi.fn().mockRejectedValue(new Error('boom')),
    });

    await pollAnalysisOnce({ controller, deps, now: 1_000, ...baseArgs });
    expect(controller.beginRequest()).toBe(true); // slot freed
  });

  it('does not call createSignedUrl while the log is still pending', async () => {
    const createSignedUrl = vi.fn();
    const deps = makeDeps({
      fetchLogStatus: vi.fn().mockResolvedValue({ data: { ...baseLog, status: 'pending' }, error: null }),
      createSignedUrl,
    });

    await pollAnalysisOnce({ controller, deps, now: 1_000, ...baseArgs });

    expect(createSignedUrl).not.toHaveBeenCalled();
  });
});
