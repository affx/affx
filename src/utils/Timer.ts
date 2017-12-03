export class Timer {
  private timestamp: number | null = null;
  private timerId: number | null = null;

  public start(ms: number, f: () => void) {
    window.clearInterval(this.timerId!);
    this.timestamp = Date.now();
    this.timerId = window.setTimeout(f, ms);
  }

  public reset() {
    Object.assign(this, { timestamp: null, timerId: null });
  }

  public compare(timestamp: number): number {
    if (!this.timestamp) {
      return -1;
    }

    return timestamp - this.timestamp;
  }
}
