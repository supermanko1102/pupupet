import { describe, expect, it } from 'vitest';

import { PollingController } from '@/lib/polling-controller';

describe('PollingController', () => {
  it('tracks timeout from the start time', () => {
    const controller = new PollingController<string>({ maxErrors: 3, timeoutMs: 1000 });

    controller.start('timer', 100);

    expect(controller.hasTimedOut(1099)).toBe(false);
    expect(controller.hasTimedOut(1101)).toBe(true);
  });

  it('blocks overlapping requests until the active request ends', () => {
    const controller = new PollingController<string>({ maxErrors: 3, timeoutMs: 1000 });

    expect(controller.beginRequest()).toBe(true);
    expect(controller.beginRequest()).toBe(false);

    controller.endRequest();
    expect(controller.beginRequest()).toBe(true);
  });

  it('reports when the max error threshold is reached', () => {
    const controller = new PollingController<string>({ maxErrors: 3, timeoutMs: 1000 });

    expect(controller.recordError()).toBe(false);
    expect(controller.recordError()).toBe(false);
    expect(controller.recordError()).toBe(true);
  });

  it('resets state when stopped', () => {
    const controller = new PollingController<string>({ maxErrors: 2, timeoutMs: 1000 });

    controller.start('timer', 100);
    controller.beginRequest();
    controller.recordError();
    controller.stop();

    expect(controller.getTimer()).toBe(null);
    expect(controller.beginRequest()).toBe(true);
    expect(controller.recordError()).toBe(false);
    expect(controller.hasTimedOut(10_000)).toBe(false);
  });

  it('clears previous state when started again', () => {
    const controller = new PollingController<string>({ maxErrors: 2, timeoutMs: 1000 });

    controller.start('first', 100);
    controller.recordError();
    controller.start('second', 500);

    expect(controller.getTimer()).toBe('second');
    expect(controller.recordError()).toBe(false);
    expect(controller.hasTimedOut(1400)).toBe(false);
  });
});
