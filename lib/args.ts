import { config } from "./config.ts";
import {
  args,
  BinaryFlag,
  Choice,
  EarlyExitFlag,
  PartialOption,
  Text,
} from "./deps/args.ts";
import { version } from "./version.ts";

const parser = args
  .describe("A flexible TypeScript-based task runner.")
  .with(EarlyExitFlag("help", {
    describe: "Shows this help message and exits",
    alias: ["h"],
    exit() {
      console.log("Usage: tasks.ts <options> [...tasks]");
      console.log("  [...tasks]");
      console.log(
        "    The tasks to execute (can be omitted if an option is given that prevents task execution)",
      );
      console.log();
      console.log(parser.help());
      Deno.exit(0);
    },
  }))
  .with(EarlyExitFlag("version", {
    describe: "Prints the version and exits",
    alias: ["v"],
    exit() {
      console.log(`Version ${version}`);
      Deno.exit(0);
    },
  }))
  .with(BinaryFlag("list-tasks", {
    describe: "Lists all defined tasks and exits",
    alias: ["l"],
  }))
  .with(PartialOption("deps", {
    describe: "Displays the dependency tree of a given task and exits",
    type: Text,
    default: undefined,
  }))
  .with(BinaryFlag("trace", {
    describe: "If set errors will output full traces",
    alias: ["t"],
  }))
  .with(BinaryFlag("quiet", {
    describe: "Supresses log output",
    alias: ["q"],
  }))
  .with(PartialOption("emojis", {
    describe: "Whether to output emojis",
    type: Choice({ value: "on" as const }, { value: "off" as const }),
    default: config.emojis ? "on" : "off",
    describeDefault: "MacOS: 'on', other: 'off'",
  }));

export interface Args {
  listTasks: boolean;
  deps?: string;
  trace: boolean;
  quiet: boolean;
  emojis: boolean;
  tasks: readonly string[];
}

export function parseArgs(args: readonly string[]): Args {
  const res = parser.parse(args);

  if (res.error) {
    console.error(res.error.toString());
    Deno.exit(1);
  }

  const { "list-tasks": listTasks, deps, trace, quiet, emojis } = res.value;

  return {
    listTasks,
    deps,
    trace,
    quiet,
    emojis: emojis === "on",
    tasks: res.remaining().rawValues(),
  };
}

export function applyArgsToConfig(args: Args): void {
  config.quiet = args.quiet;
  config.emojis = args.emojis;
  config.trace = args.trace;
}
