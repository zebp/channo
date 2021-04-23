import { Channel, ChannelFullError } from "./mod.ts";
import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std/testing/asserts.ts";

function sleep(duration: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

Deno.test({
  name: "basic",
  fn: async () => {
    const expected = ["hello", "world"];
    const channel = new Channel({
      initial: [...expected],
    });

    async function process() {
      for await (const value of channel.stream()) {
        const nextExpected = expected.shift();
        assertEquals(nextExpected, value);
      }
    }

    // Spawn a task to process the stream
    process();

    // Sleep to ensure the stream is processed
    await sleep(10);
  },
});

Deno.test({
  name: "ensure all complete",
  fn: async () => {
    const channelsExpected = 10;
    const channel = new Channel();
    let channelsDone = 0;

    const incrementWhenDone = async () => {
      // deno-lint-ignore no-empty
      for await (const _ of channel.stream()) {}
      channelsDone++;
    };

    // Spawn a bunch of streams from the channel that increment the done counter when completed.
    for (let i = 0; i < channelsExpected; i++) incrementWhenDone();

    channel.close();
    await sleep(10);

    assertEquals(channelsDone, channelsExpected);
  },
});

Deno.test({
  name: "max capacity",
  fn: () => {
    const channel = new Channel({
      maxCapacity: 1,
    });

    channel.push("allowed");
    assertThrows(() => channel.push("not allowed"), ChannelFullError);
  },
});
