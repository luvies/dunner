#!/usr/bin/env deno run -A
import { exec, log, run, sh, TaskError } from "./mod.ts";

run({
  default: {
    execute() {
      console.log("default task");
    },
  },

  target1: {
    desc: "target 1",
    async execute({ match }, ...args) {
      console.log(this.desc, match, args);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(this.desc, "timeout");
    },
  },

  target2: {
    desc: "target 2",
    deps: ":target1",
    async execute() {
      console.log(this.desc);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(this.desc, "timeout");
    },
  },

  target3: {
    desc: "target 3",
    deps: [":target1", ":target2"],
    execute() {
      console.log(this.desc);
    },
  },

  target4: {
    desc: "target 4",
    deps: [":target1", ":target2"],
    parallelDeps: true,
    execute() {
      console.log(this.desc);
    },
  },

  target5: {
    desc: "target 5",
    execute() {
      console.log(this.desc);
    },
    children: {
      child1: {
        desc: "target 5 child 1",
        execute() {
          console.log(this.desc, this);
        },
        children: {
          test1: {
            desc: "target5:child1:test1",
          },

          test2: {
            desc: "target5:child1:test2",
            execute() {
              console.log(this.desc);
            },
          },

          test3: {
            deps: "^",
            desc: "target5:child1:test3",
          },

          test4: {
            deps: "^:test2",
            desc: "target5:child1:test3",
          },

          test5: {
            deps: "^:^:child1",
            desc: "target5:child1:test3",
          },

          test6: {
            deps: "^:^:",
            desc: "target5:child1:test3",
          },

          test7: {
            deps: "^:^:^:target2",
            desc: "target5:child1:test3",
          },

          test8: {
            deps: "^:^:^:^:target2",
            desc: "target5:child1:test3",
          },

          test9: {
            deps: "^:test10",
            desc: "target5:child1:test3",
          },

          test10: {
            deps: "^:test9",
            desc: "target5:child1:test3",
          },

          test11: {
            deps: "^:test11",
            desc: "target5:child1:test3",
          },

          test12: {
            desc: "target5:child1:test3",
          },
        },
      },

      test: {
        desc: "target5:test",
      },
    },
  },

  target6: {
    execute() {
      console.log("target6");
    },
    children: {
      child1: {
        children: {
          test1: {
            desc: "target6:child1:test1",
          },

          test2: {
            desc: "target6:child1:test2",
          },
        },
      },
    },
  },

  target7: {
    deps: ":target8",
    execute() {
      console.log("8");
    },
  },

  target8: {
    deps: ":target7",
    execute() {
      console.log("7");
    },
  },

  echo: {
    async execute(_, ...args) {
      await sh("echo test 1");
      await exec(["echo", "test", "2"]);
      console.log(args);
    },
    children: {
      test: {
        deps: ["^"],
      },
    },
  },

  echo2: {
    deps: [":echo[test,dep]", ":echo[test2,dep]", ":echo[test,dep]"],
  },

  crash: {
    execute() {
      throw new Error("test error");
    },
    children: {
      take: {
        execute() {
          new TaskError("test error", new Error("internal error"));
        },
      },

      test: {
        desc: "crash:test",
      },
    },
  },

  collate: {
    desc: "A collation target for testing dependency tree listing",
    deps: [
      ":target4",
      ":echo2",
      "internal",
      ":crash:test",
      ":target3",
      ":",
      ":regex.Re",
      ":custom-match.m",
    ],
    children: {
      internal: {
        deps: [
          ":target7",
          ":target5:child1:test3",
        ],
      },
    },
  },

  long: {
    desc: "waits a long time",
    async execute() {
      await new Promise((resolve) => setTimeout(resolve, 65 * 1000));
    },
  },

  [`${/(.*)\.re$/i}`]: {
    match: "regex",
    async execute({ match }) {
      log("regex:", match);
    },
  },

  "*.test": {
    match: "glob",
    async execute({ match }) {
      log("glob:", match);
    },
  },

  [`${/(.*)\.m$/i}`]: {
    match: "regex",
    deps: ":$1.test",
  },

  files: {
    children: {
      fail: {
        files: {
          input: "missing.ext",
        },
      },

      succ: {
        files: {
          input: [
            "tasks.ts",
          ],
        },
      },

      exists: {
        files: {
          output: "tasks.ts",
        },
        async execute() {
          log("fired");
        },
      },

      notExist: {
        files: {
          output: "missing.ext",
        },
        async execute() {
          log("fired");
        },
      },

      newer: {
        files: {
          input: "tasks.ts",
          output: "helpers.ts",
        },
        async execute() {
          log("fired");
        },
      },

      older: {
        files: {
          input: "helpers.ts",
          output: "tasks.ts",
        },
        async execute() {
          log("fired");
        },
      },

      self: {
        files: {
          input: true,
        },
        async execute() {
          log("fired");
        },
      },
    },
  },
});
