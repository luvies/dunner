import { applyArgsToConfig, parseArgs } from "./args.ts";
import {
  colors,
  formatTaskName,
  printColorInfo,
  printTaskColorInfo,
} from "./colors.ts";
import { config } from "./config.ts";
import { dim, FormatTreeOptions, formatTreeString, TreeNode } from "./deps.ts";
import { Namespace } from "./namespace.ts";
import { rootTaskIndex, rootTaskName, Task, TaskBatchTree } from "./task.ts";
import { TaskDefinitionBatch } from "./task_definition.ts";
import { DependencyNode, TaskExecutor } from "./task_executor.ts";
import { log, useEmoji } from "./utils.ts";

const formatTreeOpts: FormatTreeOptions = {
  guideFormat: dim,
  extraSplit: dim(" | "),
};

/**
 * The main application class.
 */
export class Runner {
  /**
   * Executes the defined tasks using the given arguments.
   * 
   * @param procArgs The arguments to execute (normally `Deno.args`).
   * @param tasks The object containing the task definitions.
   */
  public static async run(
    procArgs: readonly string[],
    tasks: TaskDefinitionBatch,
  ): Promise<void> {
    // Load arguments and apply them
    const args = parseArgs(procArgs);
    applyArgsToConfig(args);

    const runner = new Runner(Task.processTaskConfig(tasks));

    // check meta options before trying to execute tasks
    if (args.listTasks) {
      printTaskColorInfo();
      log(`${useEmoji("🔎  ")}Tasks:`);
      log(runner.getTaskListString());
    } else if (args.deps) {
      const ns = Namespace.root.resolve(args.deps);
      printTaskColorInfo();
      printColorInfo(colors.skipped, colors.cyclic);
      log(`${useEmoji("🔧  ")}Dependency tree:`);
      log(runner.getTaskDepTreeString(ns));
    } else {
      // since no option was given that would prevent task execution, run them
      const names = [...args.tasks];

      // if no task was given, attempt to run the default task
      // if it doesn't exist, then the user has likely done something wrong
      if (!args.tasks.length) {
        names.push(Namespace.root.toString());
      }

      // run with the given arguments while tracking execution time
      const start = performance.now();
      await runner.run(names);
      const diff = performance.now() - start;

      // if not suppressed, output the execution time
      if (!config.quiet) {
        let time: string | number = diff / 1000;
        if (time >= 60) {
          time = `${Math.round(time / 60)}m ${time % 60}`;
        }
        log(dim(
          `${useEmoji("✨  ")}Task executed in ${time}s`,
        ));
      }
    }
  }

  /**
   * The task executor.
   */
  private readonly executor = new TaskExecutor(this.tasks);

  private constructor(
    /**
     * The tasks to run.
     */
    private readonly tasks: TaskBatchTree,
  ) {}

  /**
   * Runs the given tasks synchronously in order.
   *
   * @param names The names tasks to run.
   */
  public async run(names: string[]): Promise<void> {
    for (const name of names) {
      await this.executor.execute(Namespace.root.resolve(name));
    }
  }

  /**
   * Builds a tree displaying all available tasks.
   */
  public getTaskListString(): string {
    const processTasks = (tasks: TaskBatchTree): TreeNode[] => {
      const nodes: TreeNode[] = [];

      for (
        const task of [
          ...tasks.exact.values(),
          ...tasks.regex.map((re) => re.task),
          ...tasks.glob.map((gb) => gb.task),
        ]
      ) {
        // exclude root node
        if (!task.name) {
          continue;
        }

        // build node
        const node: TreeNode = {
          text: formatTaskName(task.name, task),
          extra: task.desc,
        };

        // build children
        node.children = processTasks(task.children);

        // add node
        nodes.push(node);
      }

      return nodes;
    };

    // build tree
    let tree: TreeNode | TreeNode[] = processTasks(this.tasks);
    const root = this.tasks.exact.get(rootTaskIndex);
    if (root) {
      tree = {
        text: formatTaskName(
          rootTaskName,
          root,
        ),
        extra: root.desc,
        children: tree,
      };
    }

    // return formatted tree
    return formatTreeString(tree, formatTreeOpts);
  }

  /**
   * Builds a dependency tree based on the given task.
   */
  public getTaskDepTreeString(ns: Namespace): string {
    // build nodes
    const processNode = (depNode: DependencyNode): TreeNode => {
      // build tree node
      let depName;
      if (depNode.cyclic) {
        depName = colors.cyclic.color(depNode.dispName);
      } else if (!depNode.execute) {
        depName = colors.skipped.color(depNode.dispName);
      } else {
        depName = formatTaskName(depNode.dispName, depNode.execData.task);
      }

      const treeNode: TreeNode = {
        text: depName,
        extra: depNode.execData.task.desc,
        children: [],
      };

      // build children
      for (const child of depNode.leaves) {
        treeNode.children!.push(processNode(child));
      }

      return treeNode;
    };

    // build tree
    const [depTree] = this.executor.buildDependencyTree(ns);
    return formatTreeString(processNode(depTree), formatTreeOpts);
  }
}
