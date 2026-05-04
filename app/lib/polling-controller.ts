export type PollingControllerOptions = {
  maxErrors: number;
  timeoutMs: number;
};

export class PollingController<TTimer> {
  private errorCount = 0;
  private inFlight = false;
  private startedAt: number | null = null;
  private timer: TTimer | null = null;

  constructor(private readonly options: PollingControllerOptions) {}

  start(timer: TTimer, now = Date.now()) {
    this.stop();
    this.timer = timer;
    this.startedAt = now;
  }

  stop() {
    this.errorCount = 0;
    this.inFlight = false;
    this.startedAt = null;
    this.timer = null;
  }

  getTimer() {
    return this.timer;
  }

  beginRequest() {
    if (this.inFlight) return false;
    this.inFlight = true;
    return true;
  }

  endRequest() {
    this.inFlight = false;
  }

  hasTimedOut(now = Date.now()) {
    const startedAt = this.startedAt ?? now;
    return now - startedAt > this.options.timeoutMs;
  }

  resetErrors() {
    this.errorCount = 0;
  }

  recordError() {
    this.errorCount += 1;
    return this.errorCount >= this.options.maxErrors;
  }
}
