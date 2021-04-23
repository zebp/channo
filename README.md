# channo

A channel library for Deno that provideds Rust-like channels backed by
[async-cell](https://github.com/zebp/async-cell).

## Example

```typescript
import { Channel } from "https://deno.land/x/channo/mod.ts";

const printerChannel = new Channel();

async function listenForMessages() {
  for await (const message of printerChannel.stream()) {
    console.log(message);
  }
}

// Spawns a promise to listen for messages pushed to the channel.
listenForMessages();

printerChannel.push("Hello, world!");

// Sleep for 100ms to allow time for the listener to process the messages.
await new Promise((resolve) => setTimeout(resolve, 100));
```
