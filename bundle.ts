// This file is required to compile our deno library into a node package, it is not part of channo.
import { writeAll } from "https://deno.land/std/io/util.ts";

await Deno.mkdir("dist/").catch(() => {});

const bundle = await Deno.emit("mod.ts", {
  bundle: "module",
}).then((results) => results.files["deno:///bundle.js"]);

const child = Deno.run({
  cmd: ["node_modules/.bin/babel", "-f", "t.js", "-o", "dist/mod.js"],
  stdin: "piped",
  stdout: "piped",
});

// Write the bundle to SWC
await writeAll(child.stdin, new TextEncoder().encode(bundle));
child.stdin.close();

// Wait for SWC to finish.
await child.output();

const files = await Deno.emit("mod.ts", {
  compilerOptions: {
    declaration: true,
  },
}).then((emitted) => emitted.files);

const nameKey = Object.keys(files).find((name) =>
  name.endsWith("channo/mod.ts.d.ts")
)!;
// We skip the first line because it's a useless comment.
const declarations = files[nameKey]!.split("\n").slice(1).join("\n");
await Deno.writeTextFile("dist/mod.d.ts", declarations);
