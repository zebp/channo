import AsyncCell from "https://deno.land/x/async_cell@0.2.0/mod.ts";

/**
 * Options to configure a {@link Channel}.
 */
export interface ChannelOptions<T> {
  /**
   * The initial items to be fed into the channel.
   */
  initial?: T[];
  /**
   * The maximum capacity of the channel, if the number of queued items in the channel ever exceeds this
   * an error will be thrown when a new item is pushed.
   */
  maxCapacity?: number;
}

export class Channel<T> {
  private head: AsyncCell<T>;
  private queued: T[] = [];
  private maxCapacity?: number;

  // Promise and it's resolve function used to close the channel.
  private closed = false;
  private closePromise: Promise<void>;
  private resolveClosePromise!: () => void;

  public constructor(options: ChannelOptions<T> = {}) {
    this.head = new AsyncCell();
    this.maxCapacity = options.maxCapacity;
    this.closePromise = new Promise((resolve) => {
      this.resolveClosePromise = resolve;
    });

    if (options.initial && options.initial.length > 0) {
      this.head.insert(options.initial.shift());
      this.queued = options.initial;
    }
  }

  /**
   * @returns a generator yielding items pushed to the channel.
   */
  public async *stream(): AsyncGenerator<T, void, void> {
    while (true) {
      try {
        yield await this.pop();
      } catch (_error) {
        // A ChannelClosedError is thrown if the stream is closed, so we can just stop the generator.
        return;
      }
    }
  }

  /**
   * Pushes an item to the channel.
   * @param value the item to be sent to a stream listening to the channel.
   */
  public push(value: T): void {
    if (this.maxCapacity && this.length >= this.maxCapacity) {
      throw new ChannelFullError(this.maxCapacity);
    }

    if (this.length == 0) {
      this.head.insert(value);
    } else {
      this.queued.push(value);
    }
  }

  /**
   * All of the remaining items in the channel.
   * @returns the remaining items still in the channel.
   */
  public async remaining(): Promise<T[]> {
    return [await this.head.take(), ...this.queued];
  }

  /**
   * Closes the channel stopping all streams.
   */
  public close(): void {
    this.closed = true;
    this.resolveClosePromise();
  }

  public get length(): number {
    const additional = this.head.peek() !== undefined ? 1 : 0;
    return this.queued.length + additional;
  }

  private async pop(): Promise<T> {
    if (this.closed) {
      throw new ChannelClosedError();
    }

    // Races to the completion of the close promise or the actual taking of the value at the head.
    // The race is required incase we close while trying to pop the channel.
    const value = await Promise.race([
      this.closePromise.then(() => undefined),
      (async () => {
        const value = await this.head.take();
        this.head.insert(this.queued.shift());
        return value;
      })(),
    ]);

    if (value === undefined) {
      throw new ChannelClosedError();
    }

    return value;
  }
}

export class ChannelClosedError extends Error {
  public constructor() {
    super("channel was closed");
  }
}

export class ChannelFullError extends Error {
  public constructor(maxCapacity: number) {
    super(`channel already reached it's max maxCapacity of ${maxCapacity}`);
  }
}
