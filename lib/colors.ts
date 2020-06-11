import { blue, dim, green, magenta, red } from "./deps/std.ts";
import { Task } from "./task.ts";
import { log } from "./utils.ts";
/**
 * The structure for the colour data objects.
 */
export interface ColorData {
  color: (str: string) => string;
  desc: string;
}

/**
 * The colours used to denote task types.
 */
export const colors: Record<
  "executes" | "depsOnly" | "noops" | "skipped" | "cyclic",
  ColorData
> = {
  executes: {
    color: green,
    desc: `${green("Green")} ${dim("tasks have an execute function")}`,
  },
  depsOnly: {
    color: blue,
    desc: `${blue("Blue")} ${dim("tasks only have dependencies")}`,
  },
  noops: {
    color: magenta,
    desc: `${magenta("Magenta")} ${
      dim("tasks don't have an execute function or dependencies")
    }`,
  },
  skipped: {
    color: dim,
    desc: dim("Dimmed tasks would be skipped"),
  },
  cyclic: {
    color: red,
    desc: `${red("Red")} ${dim("tasks cause a cyclic dependency")}`,
  },
};

/**
 * Prints the description of a given colour to stdout.
 *
 * @param env The environment object to log with.
 * @param color The colour data to print the description of.
 */
export function printColorInfo(
  ...colorData: ColorData[]
): void {
  for (const color of colorData) {
    log(color.desc);
  }
}

/**
 * Formats the task name using the task object.
 *
 * @param name The task's name.
 * @param task The task to get the info from.
 * @returns The formatted name.
 */
export function formatTaskName(name: string, task: Task): string {
  if (task.executes) {
    return colors.executes.color(name);
  } else if (task.deps.length) {
    return colors.depsOnly.color(name);
  } else {
    return colors.noops.color(name);
  }
}

/**
 * Prints the colour descriptions of the colours that are used with just the task
 * object formatting.
 *
 * @param env The environment object to log with.
 */
export function printTaskColorInfo(): void {
  printColorInfo(colors.executes, colors.depsOnly, colors.noops);
}
