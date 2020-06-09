import { Namespace } from "./namespace.ts";

/**
 * The kind of matching to apply to the target name.
 */
export type TaskMatch = "exact" | "regex" | "glob";

/**
 * A batch of target configs.
 */
export type TaskDefinitionBatch = Record<string, TaskDefinition>;

/**
 * This object provides various properties of the current execution that
 * can be used for more complex execute functions.
 */
export interface ExecuteInfo {
  /**
   * The current namespace that the target is executing in.
   */
  ns: Namespace;
  /**
   * The match array for the target name. For exact matched targets, it is a length 1
   * array with the full match at index 0, for regex/glob matched targets, it is the RegExpMatchArray
   * object that was matched (i.e. index 0 is the full match, the rest of the list are the groups).
   */
  match: readonly string[];
}

/**
 * The spec for the target config object.
 */
export interface TaskDefinition {
  /**
   * How to match the target name. If not given, then the name is matched exactly.
   *
   * Match search order:
   * - exact (default)
   * - regex
   * - glob
   */
  match?: TaskMatch;
  /**
   * The target description.
   */
  desc?: string;
  /**
   * The dependency or list of dependencies that need to be ran before
   * this target.
   *
   * The strings you pass in are formatted against the target name match.
   */
  deps?: string | string[];
  /**
   * Whether the dependencies can be executed in parallel.
   */
  parallelDeps?: boolean;
  /**
   * The children targets of this target. Allows for namespacing.
   */
  children?: TaskDefinitionBatch;
  /**
   * The input and output files that this target depends on and creates.
   * If any of the inputs are missing, execution is aborted. If any of the outputs
   * are missing, or any of the inputs are newer than the outputs, then the target
   * is executed. If no outputs are specified, the target is always executed.
   * Both properties will use the current working directory as the default base path.
   */
  files?: {
    /**
     * The input files this target depends on. If any are missing, execution is aborted.
     * If any of these files are newer than any of the output files, then the target
     * is executed (it is executed regardless if no output files are given). You can
     * pass `true` to this property to use the target's name.
     *
     * The strings you pass in are formatted against the target name match.
     */
    input?: boolean | string | string[];
    /**
     * The output files this target creates. If any are missing, or any of the input
     * files are newer that any of the output files, then this target is executed. If
     * no input files are given, then only existence is checked. You can pass `true`
     * to this property to use the target's name.
     *
     * The strings you pass in are formatted against the target name match.
     */
    output?: boolean | string | string[];
  };
  /**
   * The function used to perform the target.
   */
  execute?(info: ExecuteInfo, ...args: string[]): void | Promise<void>;
}
