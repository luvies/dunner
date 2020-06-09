/**
 * The global configuration object.
 */
export const config = {
  /**
   * Whether we supress output.
   */
  quiet: false,
  /**
   * Whether we display emojis.
   * By default, only display on MacOS systems.
   */
  emojis: Deno.build.os === "darwin",
  /**
   * Whether to output full stack traces.
   */
  trace: false,
};
