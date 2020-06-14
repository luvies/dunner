import { logError, useEmoji } from "./utils.ts";

/**
 * A custom error used to distinguish between intentional errors
 * and unhandled errors due to bad logic.
 */
export class TaskError extends Error {
  public name: string = "TaskError";

  public constructor(
    message?: string,
    /**
     * If this error was caused by another one, it can be stored here for printing to
     * stderr later.
     */
    public internalError?: Error | string,
  ) {
    super(message);
  }

  /**
   * Outputs the error message to the console.
   *
   * @param outputInternal Whether to also output the internal error if it was given.
   */
  public log(outputInternal = true): void {
    logError(`${useEmoji("💥  ")}Error: ${this.message}`);
    if (outputInternal && this.internalError) {
      logError("Internal error:");
      logError(this.internalError);
    }
  }
}
