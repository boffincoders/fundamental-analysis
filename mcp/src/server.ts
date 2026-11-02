import { createInterface } from "node:readline";
import { handleLine, SERVER_NAME, SERVER_VERSION } from "./protocol";

// stdout carries protocol messages only; anything for a human goes to stderr.
const rl = createInterface({ input: process.stdin, terminal: false });
rl.on("line", (line) => {
  const reply = handleLine(line);
  if (reply) process.stdout.write(JSON.stringify(reply) + "\n");
});
rl.on("close", () => process.exit(0));
process.stderr.write(`${SERVER_NAME} ${SERVER_VERSION} ready on stdio\n`);
