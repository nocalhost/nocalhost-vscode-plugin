import { CancellationError } from "vscode";

export type ValueCallback<T = unknown> = (value: T | Promise<T>) => void;

/**
 * Creates a promise whose resolution or rejection can be controlled imperatively.
 */
export class DeferredPromise<T> {
  private completeCallback!: ValueCallback<T>;
  private errorCallback!: (err: unknown) => void;
  private rejected = false;
  private resolved = false;

  public get isRejected() {
    return this.rejected;
  }

  public get isResolved() {
    return this.resolved;
  }

  public get isSettled() {
    return this.rejected || this.resolved;
  }

  public p: Promise<T>;

  constructor() {
    this.p = new Promise<T>((c, e) => {
      this.completeCallback = c;
      this.errorCallback = e;
    });
  }

  public complete(value: T) {
    return new Promise<void>((resolve) => {
      this.completeCallback(value);
      this.resolved = true;
      resolve();
    });
  }

  public error(err: unknown) {
    return new Promise<void>((resolve) => {
      this.errorCallback(err);
      this.rejected = true;
      resolve();
    });
  }

  public cancel() {
    new Promise<void>((resolve) => {
      this.errorCallback(new CancellationError());
      this.rejected = true;
      resolve();
    });
  }
}

export class RunOnceScheduler {
  protected runner: ((...args: unknown[]) => void) | null;

  private timeoutToken: any;
  private timeout: number;
  private timeoutHandler: () => void;

  constructor(runner: (...args: any[]) => void, delay: number) {
    this.timeoutToken = -1;
    this.runner = runner;
    this.timeout = delay;
    this.timeoutHandler = this.onTimeout.bind(this);
  }

  /**
   * Dispose RunOnceScheduler
   */
  dispose(): void {
    this.cancel();
    this.runner = null;
  }

  /**
   * Cancel current scheduled runner (if any).
   */
  cancel(): void {
    if (this.isScheduled()) {
      clearTimeout(this.timeoutToken);
      this.timeoutToken = -1;
    }
  }

  /**
   * Cancel previous runner (if any) & schedule a new runner.
   */
  schedule(delay = this.timeout): void {
    this.cancel();
    this.timeoutToken = setTimeout(this.timeoutHandler, delay);
  }

  get delay(): number {
    return this.timeout;
  }

  set delay(value: number) {
    this.timeout = value;
  }

  /**
   * Returns true if scheduled.
   */
  isScheduled(): boolean {
    return this.timeoutToken !== -1;
  }

  private onTimeout() {
    this.timeoutToken = -1;
    if (this.runner) {
      this.doRun();
    }
  }

  protected doRun(): void {
    if (this.runner) {
      this.runner();
    }
  }
}
