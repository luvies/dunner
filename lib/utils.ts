import { config } from "./config.ts";
import { decode } from "./deps.ts";
import { ExecError } from "./exec_error.ts";

/**
   * Logs a message to stdout, abiding by the quiet setting.
   *
   * @param messages The list of objects to print.
   */
export function log(...messages: any[]): void {
  if (!config.quiet) {
    console.log(...messages);
  }
}

/**
   * Logs a message to stderr, abiding by the quiet setting.
   *
   * @param messages The list of objects to print.
   */
export function logError(...messages: any[]): void {
  if (!config.quiet) {
    console.error(...messages);
  }
}

/**
   * Will return the given input if emojis are enabled in the current environment,
   * or an empty string if not.
   *
   * @param emoji The emoji string to use.
   * @returns The emoji string if emojis are enabled, an empty string otherwise.
   */
export function useEmoji(emoji: string): string {
  return config.emojis ? emoji : "";
}

/**
 * The options for executing a command.
 * This is just the standard `Deno.RunOptions` without the `cmd`
 * property, since this is given in explicitly.
 */
export type ExecOptions = Omit<Deno.RunOptions, "cmd">;

/**
 * The result of the command.
 * 
 * If stdout or stderr were set to `piped`, then these are set here.
 */
export interface ExecResult {
  stdout?: string;
  stderr?: string;
}

async function readAll(buf?: Deno.Reader): Promise<string | undefined> {
  if (buf) {
    return decode(await Deno.readAll(buf));
  } else {
    return undefined;
  }
}

/**
 * Executes a given command.
 * If the command returns a non-zero code, then `ExecError` is thrown.
 * 
 * @param cmd The command array to execute (from `Deno.RunOptions`).
 * @param opts Extra options to pass into `Deno.run`.
 * @returns The result of the command.
 */
export async function exec(
  cmd: string[],
  opts?: ExecOptions,
): Promise<ExecResult> {
  const proc = Deno.run({ cmd, ...opts });

  try {
    const [res, stdout, stderr] = await Promise.all<
      Deno.ProcessStatus,
      string | undefined,
      string | undefined
    >(
      [proc.status(), readAll(proc.stdout), readAll(proc.stderr)],
    );

    if (!res.success) {
      throw new ExecError(cmd, res.code);
    }

    return {
      stdout,
      stderr,
    };
  } finally {
    proc.close();
  }
}

/**
 * Executes a command in the current shell.
 * 
 * @param cmd The command to execute.
 * @param opts Same as `exec`.
 * @returns The result of the command.
 */
export async function sh(
  cmd: string,
  opts?: ExecOptions,
): Promise<ExecResult> {
  // Derived from https://deno.land/x/drake/lib/utils.ts

  if (Deno.build.os === "windows") {
    const cmdFile = await Deno.makeTempFile(
      { prefix: "task_cmd_", suffix: ".cmd" },
    );

    try {
      await Deno.writeTextFile(cmdFile, `@echo off\n${cmd}`);

      return await exec([cmdFile], opts);
    } finally {
      await Deno.remove(cmdFile);
    }
  } else {
    const shell = Deno.env.get("SHELL");
    if (!shell) {
      throw new Error("Cannot determine current shell");
    }

    return exec([shell, "-c", cmd], opts);
  }
}
