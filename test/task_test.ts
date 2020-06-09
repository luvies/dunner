import { Task } from "../lib/task.ts";
import { assert, assertEquals } from "./test_deps.ts";

Deno.test({
  name: "Task.constructor",
  fn() {
    const task = new Task("test", {});
    assert(task instanceof Task);
    assertEquals(task.name, "test");
  },
});

Deno.test({
  name: "Task.processTargetConfig should process a single empty top-level task",
  fn() {
    const { exact: tasks } = Task.processTaskConfig({
      "task1": {},
    });

    const task = tasks.get("task1");
    assert(task !== undefined);
    assert(task instanceof Task);
    assertEquals([...task.children.exact.keys()], []);
    assertEquals(task.deps, []);
    assertEquals(task.desc, undefined);
    assertEquals(task.hasParallelDeps, false);
  },
});
