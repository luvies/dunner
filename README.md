# Dunner - A flexible task runner

![CI](https://github.com/luvies/dunner/workflows/CI/badge.svg)

Dunner is a task runner that allows you to delcare tasks using a simple object structure.

- Tasks can have dependencies that can optionally run in parallel
  - Dependency resolution uses the current task by default, to access the root of the tasks definitions, prefix the task name with `:`
    - Thus `task` with a dependency of `child` would resolve to `:task:child`
    - A dependency of `:child` would resolve to `:child`
- Task names can be matched via glob or regex
  - Matches can be used as part of the task logic
- Tasks can be run conditionally depending on input and output files
  - Task using glob/regex can use the match as part of the file name
- Various utility methods are provided to make building tasks easy
- Tasks can have children tasks to aid with organisation
  - Children tasks are accessed using a pathing system
    - To run a task called `child` which is a child of `task` you can run `task:child`
    - Task paths starting with `:` (e.g. `:task:child`) are resolved from the root of the definition

## Task file

Tasks can be defined all in a single file or spread across multiple and imported into a root task file. A basic task file could look like this:

`tasks.ts`

```ts
#!/usr/bin/env deno run -A
import { log, run } from "https://deno.land/x/dunner/mod.ts";

run({
  default: {
    execute() {
      log("default task");
    },
  },
});
```

The `run` call means that Dunner will be ran against the arguments present in `Deno.args`. To see the available command line options, you can run the example task file with the `-h` flag:

`deno run -A https://deno.land/x/dunner/tasks.ts -h`

This file provides a collection of examples tasks that can be used to explore CLI options without needing a custom task file.

## API

To see the API you can visit the [docs](https://doc.deno.land/https/deno.land/x/dunner/mod.ts).

For complex file-system operations, you can use [`std/fs`](https://deno.land/std/fs).
