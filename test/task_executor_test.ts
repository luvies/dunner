import { Namespace } from "../lib/namespace.ts";
import { Task } from "../lib/task.ts";
import { TaskExecutor } from "../lib/task_executor.ts";
import { ExecuteInfo, TaskDefinition } from "../mod.ts";
import { taskSample } from "./task_executor_sample.ts";
import { assert, assertEquals } from "./test_deps.ts";

interface Execution {
  target: string;
  args: string[];
}

interface TestData {
  conf: TaskDefinition;
  executor: TaskExecutor;
  executions: Execution[];
  exec(ns: string, args?: string[] | undefined): Promise<void>;
}

function getTestData(): TestData {
  let executions: Execution[] = [];

  // deno-lint-ignore no-explicit-any
  const execute = (target: any) =>
    (_: ExecuteInfo, ...args: string[]) => {
      executions.push({ target: target.toString(), args });
    };
  const conf = taskSample(execute);
  const executor = new TaskExecutor(Task.processTaskConfig(conf));
  const exec = async (ns: string, args?: string[]) => {
    let argString = "";
    if (typeof args !== "undefined") {
      argString = `[${args.join(",")}]`;
    }
    await executor.execute(Namespace.root.resolve(ns + argString));
  };

  return {
    conf,
    executor,
    executions,
    exec,
  };
}

Deno.test({
  name: "TaskExecutor.constructor",
  fn() {
    const { executor } = getTestData();

    assert(executor instanceof TaskExecutor);
  },
});

Deno.test({
  name: "TaskExecutor.execute should not execute root as empty name target",
  async fn() {
    const { exec, executions } = getTestData();

    await exec("default");

    assertEquals(executions, [
      { target: "default", args: [] },
    ]);
  },
});

Deno.test({
  name: "TaskExecutor.execute should execute top-level complex target",
  async fn() {
    const { exec, executions } = getTestData();

    await exec("1");

    assertEquals(executions, [
      { target: "1", args: [] },
    ]);
  },
});

Deno.test({
  name: "TaskExecutor.execute should execute second-level complex target",
  async fn() {
    const { exec, executions } = getTestData();

    await exec(":1:2");

    assertEquals(executions, [
      { target: "2", args: [] },
    ]);
  },
});

Deno.test({
  name:
    "TaskExecutor.execute should execute a top-level target with a single string dependent",
  async fn() {
    const { exec, executions } = getTestData();

    await exec(":10");

    assertEquals(executions, [
      { target: "1", args: [] },
      { target: "10", args: [] },
    ]);
  },
});

Deno.test({
  name:
    "TaskExecutor.execute should execute a top-level target with a single array dependent",
  async fn() {
    const { exec, executions } = getTestData();

    await exec(":18");

    assertEquals(executions, [
      { target: "1", args: [] },
      { target: "18", args: [] },
    ]);
  },
});

Deno.test({
  name:
    "TaskExecutor.execute should execute a top-level target with a 2 dependents",
  async fn() {
    const { exec, executions } = getTestData();

    await exec(":19");

    assertEquals(executions, [
      { target: "1", args: [] },
      { target: "2", args: [] },
      { target: "19", args: [] },
    ]);
  },
});

Deno.test({
  name:
    "TaskExecutor.execute should execute a top-level target with a 2 dependents that are repeated",
  async fn() {
    const { exec, executions } = getTestData();

    await exec(":20");

    assertEquals(executions, [
      { target: "1", args: [] },
      { target: "20", args: [] },
    ]);
  },
});

Deno.test({
  name:
    "TaskExecutor.execute should execute a top-level target with a 2 dependents that have repeated sub-dependents",
  async fn() {
    const { exec, executions } = getTestData();

    await exec(":21");

    assertEquals(executions, [
      { target: "1", args: [] },
      { target: "10", args: [] },
      { target: "21", args: [] },
    ]);
  },
});

Deno.test({
  name: "TaskExecutor.buildDependencyTree should not mutate the path",
  fn() {},
  ignore: true,
});

Deno.test({
  name:
    "TaskExecutor.buildDependencyTree should build up a correctly ordered tree",
  fn() {},
  ignore: true,
});

Deno.test({
  name:
    "TaskExecutor.buildDependencyTree should not allow the execution of repeated dependencies",
  fn() {},
  ignore: true,
});

Deno.test({
  name:
    "TaskExecutor.buildDependencyTree should detect cyclic dependencies and return a false safe value",
  fn() {},
  ignore: true,
});
