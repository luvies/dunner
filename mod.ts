export * from "./lib/mod.ts";
import {
  config,
  logError,
  Runner,
  TaskDefinitionBatch,
  TaskError,
} from "./lib/mod.ts";

export async function run(tasks: TaskDefinitionBatch): Promise<void> {
  try {
    await Runner.run(Deno.args, tasks);
  } catch (err) {
    let exitCode = 3;

    // Exit code 1 means TaskError was thrown, exit code 3 is all other errors.
    if (err instanceof TaskError) {
      // if a TakeError was thrown, then it was intentional
      err.log(config.trace);
      exitCode = 1;
    } else {
      logError("Unhandled exception, execution aborted");
    }

    // check trace option and output stack if it is set
    if (err.stack && config.trace) {
      logError("Stack trace:");
      logError(err.stack);
    }
  }
}
