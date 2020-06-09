export class ExecError extends Error {
  public constructor(cmd: string[], public code: number) {
    super(`Exec failed with ${code} for ${Deno.inspect(cmd)}`);
  }
}
