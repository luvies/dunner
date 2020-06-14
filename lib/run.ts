import { config } from "./config.ts";
import { Runner } from "./runner.ts";
import { TaskDefinitionBatch } from "./task_definition.ts";
import { TaskError } from "./task_error.ts";
import { logError } from "./utils.ts";

/**
 * Runs the task runner using the given arguments, or from `Deno.args` by default.
 * 
 * @param tasks The defined tasks.
 * @param args Allows manually passing in arguments to run. Will override `Deno.args`.
 */
export async function run(
  tasks: TaskDefinitionBatch,
  args?: readonly string[],
): Promise<void> {
  try {
    await Runner.run(args ?? Deno.args, tasks);
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
