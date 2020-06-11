import { formatList } from "./deps/format_list.ts";
import { TaskError } from "./task_error.ts";

export const namespaceSeparator = ":";
export const namespaceParent = "^";

/**
 * Provides methods for dealing with namespaces.
 */
export class Namespace {
  /**
   * The root namespace that can be used to resolve other namespaces from.
   */
  public static readonly root = new Namespace([]);

  private constructor(
    private readonly path: readonly string[],
    public readonly args: readonly string[] = [],
  ) {}

  /**
   * Returns the parent namespace.
   * If this is the root namespace, returns itself.
   */
  public get parent(): Namespace {
    if (this.path.length) {
      return new Namespace(this.path.slice(0, this.path.length - 1));
    } else {
      return this;
    }
  }

  /**
   * Returns whether the namespace is the root or not.
   */
  public get isRoot(): boolean {
    return !this.path.length;
  }

  /**
   * Gets the list of names that make up this namespace.
   */
  public get names(): string[] {
    return [...this.path];
  }

  /**
   * Resolves a namespace from another, or the current.
   * If the name is empty, the current or given namespace is returned.
   *
   * @param fullName The name to resolve.
   * @param cwns The current working namespace to resolve from.
   * Defaults to the current namespace.
   * @returns The resolved namespace.
   */
  public resolve(fullName: string, cwns: Namespace = this): Namespace {
    // extract arguments and name
    const match = fullName.match(/^(.*?)(?:\[([^[\]]*)\])?$/);
    let name: string;
    let args: string[];
    if (match) {
      name = match[1];
      args = match[2]?.split(",") ?? [];
    } else {
      throw new TaskError(`'${fullName}' is an invalid target name`);
    }

    // check if this is an absolute namespace first
    let root = false;
    if (name.length > 0) {
      if (name[0] === namespaceSeparator) {
        root = true;
      }
    } else {
      return cwns;
    }

    // split name into path list and strip empty ones
    let path: string[] = name.split(namespaceSeparator).filter(
      (value) => value,
    );

    // if this isn't an absolute name, add the working namespace to it
    if (!root) {
      path = cwns.path.concat(path);
    }

    // resolve parent directives
    for (let i = 0; i < path.length; i++) {
      if (path[i] === namespaceParent) {
        // strip out the directive and previous item
        path.splice(i, 1);
        i--;

        if (i >= 0) {
          path.splice(i, 1);
          i--;
        }
      }
    }

    return new Namespace(path, args);
  }

  /**
   * Formats a list into the namespace, replacing `$n` tags with the list values.
   *
   * @param fmt The list of values to format into the namespace.
   * @returns The formatted namespace.
   */
  public format(fmt: readonly string[]): Namespace {
    return new Namespace(
      this.path.map((p) => formatList(p, fmt)),
      this.args,
    );
  }

  /**
   * Returns whether the given namespace object refers to the same namespace
   * as the current object.
   *
   * @param ns The namespace to check against this one.
   * @param args Whether to also check that the arguments are the same.
   * @returns Whether the namespaces are equal.
   */
  public equalTo(ns: Namespace, args = false): boolean {
    return this.toString(args) === ns.toString(args);
  }

  /**
   * Converts the list of namespace names into a single string.
   * Can optionally include arguments in string.
   *
   * @param args Whether to also output the arguments in the string.
   */
  public toString(args = false): string {
    let argString = "";
    if (args && this.args.length > 0) {
      argString = `[${this.args.join(",")}]`;
    }
    return namespaceSeparator + this.path.join(namespaceSeparator) + argString;
  }
}
