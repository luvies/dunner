import { Namespace } from "./namespace.ts";
import { rootTaskIndex, rootTaskName, Task, TaskBatchTree } from "./task.ts";
import { TaskError } from "./task_error.ts";

/**
 * Contains data that is needed to execute a task.
 */
export interface NodeExecData {
  /**
   * The task itself.
   */
  task: Task;
  /**
   * The arguments to execute the task with.
   */
  args: readonly string[];
  /**
   * The matched name of the task.
   */
  match: readonly string[];
}

/**
 * A node in the dependency tree that is built when attempting to execute a task and
 * its dependencies.
 */
export interface DependencyNode {
  /**
   * The display name of the task.
   */
  dispName: string;
  /**
   * The execute data for this node.
   */
  execData: NodeExecData;
  /**
   * The dependencies to execute first.
   */
  leaves: DependencyNode[];
  /**
   * Whether to actually execute the dependency or not.
   */
  execute: boolean;
  /**
   * Whether this node causes the tree to become cyclic.
   */
  cyclic: boolean;
}

/**
 * Provides methods for executing a task and its dependencies.
 */
export class TaskExecutor {
  public constructor(
    private tasks: TaskBatchTree,
  ) {}

  /**
   * Executes a task against the current task object with optional argument.
   */
  public async execute(task: Namespace): Promise<void> {
    // build dependency tree
    const [tree, safe] = this.buildDependencyTree(task);

    // execute tree
    if (!safe) {
      throw new TaskError(
        "Cyclic task dependency detected, aborting",
      );
    } else {
      await this.execNode(tree);
    }
  }

  /**
   * Constructs the dependency tree. It will take into account multiple occurences
   * of a task and not process them fully.
   *
   * @param ns The task to work off.
   * @param path The path the tree took to get to this node. Used for detecting cyclic dependencies.
   * @param foundTasks The hashmap of found dependencies. Used to ignore dupilcates.
   * @returns The fully constructed tree.
   */
  public buildDependencyTree(
    ns: Namespace,
    path: readonly string[] = [],
    foundTasks: Set<string> = new Set(),
  ): [DependencyNode, boolean] {
    // current node
    const node: DependencyNode = {
      dispName: ns.isRoot ? rootTaskName : ns.toString(true),
      execData: this.getTask(ns),
      leaves: [],
      execute: false,
      cyclic: false,
    };

    // whether the tree is safe to execute
    let safe = true;

    // only execute the dependency to the tree if we need to
    const fullNsArgs = ns.toString(true);
    if (!foundTasks.has(fullNsArgs)) {
      node.execute = true;
      foundTasks.add(fullNsArgs);
    }

    // detect whether this node makes the tree cyclic
    const fullNs = ns.toString();
    if (path.includes(fullNs)) {
      node.cyclic = true;
      safe = false;
    }

    // build leaves
    if (node.execData.task.deps) {
      for (const dep of node.execData.task.deps) {
        // if we should, build the dependencies
        if (node.execute && !node.cyclic) {
          const [depNode, depSafe] = this.buildDependencyTree(
            dep.format(node.execData.match),
            [...path, fullNs],
            foundTasks,
          );
          safe = safe && depSafe;
          node.leaves.push(depNode);
        }
      }
    }

    // return complete node
    return [node, safe];
  }

  /**
   * Executes a node.
   * Will execute its dependencies first, taking into account whether the node's
   * task config wanted it to be in parallel or not.
   *
   * @param node The node to execute.
   * @param args The argument to pass to the node's task.
   */
  private async execNode(node: DependencyNode): Promise<void> {
    // if we shouldn't execute this node, don't
    if (!node.execute) {
      return;
    }

    // if we have any leaves, execute them according to the task config
    if (node.leaves) {
      if (node.execData.task.hasParallelDeps) {
        // execute the leaves in parallel
        const deps: Array<Promise<void>> = [];
        for (const leaf of node.leaves) {
          deps.push(this.execNode(leaf));
        }

        // wait for all to complete
        await Promise.all(deps);
      } else {
        // execute the leaves in sequence
        for (const leaf of node.leaves) {
          await this.execNode(leaf);
        }
      }
    }

    // now the dependencies are done, execute the node itself
    await node.execData.task.execute(node.execData.match, node.execData.args);
  }

  /**
   * Converts the task string into the resolved task.
   *
   * @param name The task to search for.
   * @returns The resolved task, its arguments, and the matched name.
   */
  private getTask(name: Namespace): NodeExecData {
    if (name.isRoot) {
      const exact = this.tasks.exact.get(rootTaskIndex);
      if (!exact) {
        throw new TaskError("Unable to find default task");
      }
      return {
        task: exact,
        args: name.args,
        match: [""],
      };
    } else {
      // set up current state
      let ctask: Task;
      let cmatch: string[];
      let tasks: TaskBatchTree = this.tasks;

      // search for task in each part of the namespace
      for (const cns of name.names) {
        // perform search
        [ctask, cmatch, tasks] = this.searchForTask(cns, tasks, name);
      }

      return {
        task: ctask!,
        args: name.args,
        match: cmatch!,
      };
    }
  }

  /**
   * Searches each batch in the current batch tree object for the given task name.
   * Batches are searched in priority order.
   *
   * @param cns The current namespace path part.
   * @param tasks The current task batch tree object.
   * @param name The complete namespace that is being searched for (used for error messages).
   * @returns A tuple with the found Task, TaskMatchData and next TaskBatchTree object.
   */
  private searchForTask(
    cns: string,
    tasks: TaskBatchTree,
    name: Namespace,
  ): [Task, string[], TaskBatchTree] {
    const match: string[] = [cns];

    // Search for exact matches first.
    const exact = tasks.exact.get(cns);
    if (exact) {
      return [exact, match, exact.children];
    }

    // Search for regex then glob matches.
    for (const ctasks of [tasks.regex, tasks.glob]) {
      for (const task of ctasks) {
        const rmatch = cns.match(task.rule);
        if (rmatch) {
          return [task.task, rmatch, task.task.children];
        }
      }
    }

    // if we couldn't find the task, then throw an error
    throw new TaskError(`Unable to find task ${name}`);
  }
}
