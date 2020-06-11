import { formatList } from "./deps/format_list.ts";
import { globToRegExp } from "./deps/std.ts";
import { tryGetLStat } from "./deps/utils.ts";
import { Namespace, namespaceParent, namespaceSeparator } from "./namespace.ts";
import { TaskDefinition, TaskDefinitionBatch } from "./task_definition.ts";
import { TaskError } from "./task_error.ts";

export const defaultTask = ":default";

/**
 * A batch of tasks that are using exact names.
 */
type ExactTaskBatch = Map<string, Task>;

/**
 * A regex rule task.
 */
type RegexTaskBatch = Array<{
  rule: RegExp;
  task: Task;
}>;

/**
 * A glob rule task.
 */
type GlobTaskBatch = Array<{
  rule: RegExp;
  task: Task;
}>;

/**
 * A tree of task batches.
 */
export interface TaskBatchTree {
  exact: ExactTaskBatch;
  regex: RegexTaskBatch;
  glob: GlobTaskBatch;
}

/**
 * Contains information about a task and its children, and can perform the execution.
 */
export class Task {
  /**
   * Converts the task config into an object that contains all the tasks it declares.
   *
   * @returns The base task set object.
   */
  public static processTaskConfig(
    config: TaskDefinitionBatch,
    path?: Namespace,
  ): TaskBatchTree {
    // init batches
    const exact: ExactTaskBatch = new Map();
    const regex: RegexTaskBatch = [];
    const glob: GlobTaskBatch = [];

    // extract tasks
    for (const name of Object.keys(config)) {
      const taskConf = config[name];

      // helper fn
      const getTask = (tname: string) => new Task(tname, taskConf, path);

      switch (taskConf.match) {
        case "regex":
          // convert string key into regex object
          const match = name.match(/^\/(.*)\/(.*)$/);
          if (!match) {
            throw new TaskError(`'${name}' is not a valid RegExp literal`);
          }
          const re = new RegExp(match[1], match[2]);

          regex.push({
            rule: re,
            task: getTask(name),
          });
          break;
        case "glob":
          glob.push({
            rule: globToRegExp(name, { extended: true, globstar: true }),
            task: getTask(name),
          });
          break;
        default:
          exact.set(name, getTask(name));
          break;
      }
    }

    // create tree batch
    return {
      exact,
      regex,
      glob,
    };
  }

  /**
   * The tasks dependencies.
   */
  public deps: Namespace[] = [];
  /**
   * The child tasks.
   */
  public children: TaskBatchTree;

  private readonly files: {
    input: readonly string[];
    output: readonly string[];
  };

  public constructor(
    /**
     * The name of the task. This is the last item in the namespace path.
     */
    public name: string,
    private config: TaskDefinition,
    /**
     * The path to get to this task.
     */
    path: Namespace = Namespace.root,
  ) {
    // validate task name
    if (!name) {
      throw new TaskError(
        "Empty task name not allowed in config",
      );
    }
    if (name.includes(namespaceSeparator)) {
      throw new TaskError(
        `Task '${name}' cannot have the namespace separator in`,
      );
    }
    if (name === namespaceParent) {
      throw new TaskError(`'${namespaceParent}' is not allowed as a task name`);
    }

    // get the base namespace to work dependencies off
    const baseNs = path.resolve(name);

    // convert the given deps config into an array
    let givenDeps: string[];
    if (Array.isArray(config.deps)) {
      givenDeps = config.deps;
    } else {
      givenDeps = [];
      if (typeof config.deps !== "undefined") {
        givenDeps.push(config.deps);
      }
    }
    for (const dep of givenDeps) {
      if (dep === "") {
        throw new TaskError("Dependency cannot be an empty string");
      }

      const depNs = baseNs.resolve(dep);
      if (depNs.isRoot) {
        throw new TaskError(`'${depNs}' is not a valid dependency`);
      }

      this.deps.push(depNs);
    }

    // convert file options
    this.files = {
      input: [],
      output: [],
    };
    if (config.files) {
      if (config.files.input) {
        switch (typeof config.files.input) {
          case "boolean":
            this.files.input = [name];
            break;
          case "string":
            this.files.input = [config.files.input];
            break;
          case "object":
            if (Array.isArray(config.files.input)) {
              this.files.input = config.files.input;
            } else {
              throw new TaskError(
                "files.in can only be a boolean, string or list of strings",
              );
            }
            break;
        }
      }
      if (config.files.output) {
        switch (typeof config.files.output) {
          case "boolean":
            this.files.output = [name];
            break;
          case "string":
            this.files.output = [config.files.output];
            break;
          case "object":
            if (Array.isArray(config.files.output)) {
              this.files.output = config.files.output;
            } else {
              throw new TaskError(
                "files.out can only be a boolean, string or list of strings",
              );
            }
            break;
        }
      }
    }

    // build the children tasks
    this.children = Task.processTaskConfig(
      config.children || {},
      path.resolve(name),
    );
  }

  /**
   * The task's description if it was given.
   */
  public get desc(): string | undefined {
    return this.config.desc;
  }

  /**
   * Whether the dependencies should be ran in parallel.
   */
  public get hasParallelDeps(): boolean {
    return this.config.parallelDeps !== undefined;
  }

  /**
   * Returns whether this task has an execute function or not.
   */
  public get executes(): boolean {
    return Boolean(this.config.execute);
  }

  /**
   * Executes the task's suppied execute function if it was given.
   * If the function returns an awaitable object, it is awaited before returning.
   */
  public async execute(
    match: readonly string[],
    args: readonly string[] = [],
  ): Promise<void> {
    // perform file in check
    let latestModifyTime: Date | undefined;
    for (const fin of this.files.input.map((f) => formatList(f, match))) {
      const stats = await tryGetLStat(fin);
      if (stats) {
        if (
          stats.mtime && (!latestModifyTime || latestModifyTime < stats.mtime)
        ) {
          latestModifyTime = stats.mtime;
        }
      } else {
        throw new TaskError(`file ${fin} could not be found`);
      }
    }

    // perform file out check
    let shouldExecute: boolean;
    if (this.files.output.length && latestModifyTime) {
      shouldExecute = false;
      for (const fout of this.files.output.map((f) => formatList(f, match))) {
        const stats = await tryGetLStat(fout);
        if (!stats || !stats.mtime || latestModifyTime > stats.mtime) {
          shouldExecute = true;
        }
      }
    } else {
      shouldExecute = true;
    }

    // execute the main function if it was defined
    if (shouldExecute && this.config.execute) {
      // await regardless, since void results can be awaited
      // (they just return immediately)
      await this.config.execute(
        { match },
        ...args,
      );
    }
  }
}
