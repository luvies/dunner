import { Namespace } from "../lib/namespace.ts";
import { assertEquals, assertThrows } from "./test_deps.ts";

const root = Namespace.root;

Deno.test({
  name: "Namespace.root should return a namespace with no path or arguments",
  fn() {
    const ns = Namespace.root;

    assertEquals(ns.names, []);
    assertEquals(ns.args, []);
  },
});

Deno.test({
  name: "Namespace.parent should return itself if it is the root",
  fn() {
    assertEquals(root.parent, root);
  },
});

Deno.test({
  name: "Namespace.parent should return the next namespace up",
  fn() {
    assertEquals(root.resolve("target1").parent.toString(), root.toString());
    assertEquals(
      root.resolve("target1:target2").parent.toString(),
      root.resolve("target1").toString(),
    );
    assertEquals(
      root.resolve("target1:target2:target3").parent.toString(),
      root.resolve("target1:target2").toString(),
    );
    assertEquals(
      root.resolve("target1:target2:target3:target4").parent.toString(),
      root.resolve("target1:target2:target3").toString(),
    );
  },
});

Deno.test({
  name: "Namespace.isRoot should return true for root namespace",
  fn() {
    assertEquals(root.isRoot, true);
  },
});

Deno.test({
  name: "Namespace.isRoot should return false for non-root namespace",
  fn() {
    assertEquals(root.resolve("target1").isRoot, false);
    assertEquals(root.resolve("target1:target2").isRoot, false);
    assertEquals(root.resolve("target1:target2:target3").isRoot, false);
  },
});

Deno.test({
  name: "Namespace.name should return an empty list for root",
  fn() {
    assertEquals(root.names, []);
  },
});

Deno.test({
  name: "Namespace.names should return a list of names",
  fn() {
    assertEquals(root.resolve("target1").names, ["target1"]);
    assertEquals(root.resolve("target1:target2").names, ["target1", "target2"]);
    assertEquals(
      root.resolve("target1:target2:target3").names,
      ["target1", "target2", "target3"],
    );
  },
});

Deno.test({
  name: "Namespace.names should not include the arguments in any item",
  fn() {
    assertEquals(root.resolve("target1[a]").names, ["target1"]);
    assertEquals(
      root.resolve("target1:target2[a,b]").names,
      ["target1", "target2"],
    );
    assertEquals(
      root.resolve("target1:target2:target3[a,b,c]").names,
      ["target1", "target2", "target3"],
    );
  },
});

Deno.test({
  name: "Namespace.resolve should chain",
  fn() {
    assertEquals(
      root.resolve("target1").resolve("target2").toString(),
      ":target1:target2",
    );
    assertEquals(
      root.resolve("target1").resolve("target2").resolve("target3").toString(),
      ":target1:target2:target3",
    );
    assertEquals(
      root.resolve("target1").resolve("target2").resolve("target3").resolve(
        "target4",
      ).toString(),
      ":target1:target2:target3:target4",
    );
  },
});

Deno.test({
  name: "Namespace.resolve should resolve to itself if empty string passed in",
  fn() {
    assertEquals(root.resolve("").toString(), ":");
    assertEquals(root.resolve("target1").resolve("").toString(), ":target1");
    assertEquals(
      root.resolve("target1:target2").resolve("").toString(),
      ":target1:target2",
    );
    assertEquals(
      root.resolve("target1:target2:target3").resolve("").toString(),
      ":target1:target2:target3",
    );
  },
});

Deno.test({
  name: "Namespace.resolve should use given working namespace",
  fn() {
    const ns = root.resolve("ns");
    assertEquals(root.resolve("target1", ns).toString(), ":ns:target1");
    assertEquals(
      root.resolve("target1:target2", ns).toString(),
      ":ns:target1:target2",
    );
    assertEquals(
      root.resolve("target1:target2:target3", ns).toString(),
      ":ns:target1:target2:target3",
    );
  },
});

Deno.test({
  name: "Namespace.resolve should respect absolute namespaces",
  fn() {
    assertEquals(root.resolve(":target1").toString(), ":target1");
    assertEquals(
      root.resolve(":target1:target2").toString(),
      ":target1:target2",
    );
    assertEquals(
      root.resolve(":target1:target2:target3").toString(),
      ":target1:target2:target3",
    );

    const ns = root.resolve("ns");
    assertEquals(root.resolve(":target1", ns).toString(), ":target1");
    assertEquals(
      root.resolve(":target1:target2", ns).toString(),
      ":target1:target2",
    );
    assertEquals(
      root.resolve(":target1:target2:target3", ns).toString(),
      ":target1:target2:target3",
    );
  },
});

Deno.test({
  name: "Namespace.resolve should resolve parent directives",
  fn() {
    assertEquals(root.resolve("target1:^").toString(), ":");
    assertEquals(root.resolve("target1:target2:^").toString(), ":target1");
    assertEquals(root.resolve("target1:^:target2").toString(), ":target2");
    assertEquals(root.resolve("target1:target2:^:^").toString(), ":");
    assertEquals(
      root.resolve("target1:target2:^:^:target3").toString(),
      ":target3",
    );
    assertEquals(root.resolve("target1:target2:^:^:target3:^").toString(), ":");
  },
});

Deno.test({
  name:
    "Namespace.resolve should return the root if a parent directive resolves to above",
  fn() {
    assertEquals(root.resolve("^").toString(), ":");
    assertEquals(root.resolve("^:^").toString(), ":");
    assertEquals(root.resolve("^:^:^").toString(), ":");
    assertEquals(root.resolve("target1:^:^").toString(), ":");
    assertEquals(root.resolve("target1:target2:^:^:^").toString(), ":");
    assertEquals(
      root.resolve("target1:^:target2:target3:^:^:^").toString(),
      ":",
    );
  },
});

Deno.test({
  name: "Namespace.resolve should throw an error on invalid target names",
  fn() {
    assertThrows(() => root.resolve("target1:target \n 2"));
  },
});

Deno.test({
  name: "Namespace.format should leave namespaces with no tags in unchanged",
  fn() {
    assertEquals(root.resolve("").format(["a", "b"]).toString(), ":");
    assertEquals(
      root.resolve("target1").format(["a", "b"]).toString(),
      ":target1",
    );
    assertEquals(
      root.resolve("target1:target2").format(["a", "b"]).toString(),
      ":target1:target2",
    );
    assertEquals(
      root.resolve("target1:target2:target3").format(["a", "b"]).toString(),
      ":target1:target2:target3",
    );
  },
});

Deno.test({
  name: "Namespace.format should format the tags in correctly",
  fn() {
    assertEquals(
      root.resolve("target$0").format(["a", "b"]).toString(),
      ":targeta",
    );
    assertEquals(
      root.resolve("target$0:target$1").format(["a", "b"]).toString(),
      ":targeta:targetb",
    );
    assertEquals(
      root.resolve("target$1:target$3:target$2").format(["a", "b", "c", "d"])
        .toString(),
      ":targetb:targetd:targetc",
    );
    assertEquals(
      root.resolve("$1target$1:$2target$1:target$2").format(
        ["a", "b", "c", "d"],
      ).toString(),
      ":btargetb:ctargetb:targetc",
    );
  },
});

Deno.test({
  name:
    "Namespace.format should leave tags unchanged if there isn\'t a matching list item",
  fn() {
    assertEquals(root.resolve("target$0").format([]).toString(), ":target$0");
    assertEquals(
      root.resolve("target$1").format(["a"]).toString(),
      ":target$1",
    );
    assertEquals(
      root.resolve("target$2").format(["a", "b"]).toString(),
      ":target$2",
    );
    assertEquals(
      root.resolve("target$5:target$2").format(["a", "b"]).toString(),
      ":target$5:target$2",
    );
    assertEquals(
      root.resolve("target$3:target$4:target$5").format(["a", "b", "c"])
        .toString(),
      ":target$3:target$4:target$5",
    );
  },
});

Deno.test({
  name: "Namespace.equalTo should return true for equal namespaces",
  fn() {
    assertEquals(root.equalTo(root), true);
    assertEquals(
      root.resolve("target1").equalTo(root.resolve("target1")),
      true,
    );
    assertEquals(
      root.resolve("target1:target2").equalTo(
        root.resolve("target1:target2"),
      ),
      true,
    );
    assertEquals(
      root.resolve("target1:target2:target3").equalTo(
        root.resolve("target1:target2:target3"),
      ),
      true,
    );
  },
});

Deno.test({
  name: "Namespace.equalTo should return false for non-equal namespaces",
  fn() {
    assertEquals(
      root.resolve("target1").equalTo(root.resolve("target2")),
      false,
    );
    assertEquals(
      root.resolve("target1:target3").equalTo(
        root.resolve("target1:target2"),
      ),
      false,
    );
    assertEquals(
      root.resolve("target1:target5:target3").equalTo(
        root.resolve("target1:target2:target3"),
      ),
      false,
    );
  },
});

Deno.test({
  name: "Namespace.toString should return a full qualified namespace string",
  fn() {
    assertEquals(root.toString(), ":");
    assertEquals(root.resolve("target1").toString(), ":target1");
    assertEquals(root.resolve("target2").toString(), ":target2");
    assertEquals(root.resolve("target3").toString(), ":target3");
    assertEquals(
      root.resolve("target1:target2").toString(),
      ":target1:target2",
    );
    assertEquals(
      root.resolve("target2:target3").toString(),
      ":target2:target3",
    );
    assertEquals(
      root.resolve("target3:target4").toString(),
      ":target3:target4",
    );
    assertEquals(
      root.resolve("target1:target2:target3").toString(),
      ":target1:target2:target3",
    );
    assertEquals(
      root.resolve("target2:target3:target4").toString(),
      ":target2:target3:target4",
    );
    assertEquals(
      root.resolve("target3:target4:target5").toString(),
      ":target3:target4:target5",
    );
  },
});

Deno.test({
  name:
    "Namespace.toString should return a full qualified namespace string with arguments",
  fn() {
    assertEquals(root.resolve("target1").toString(true), ":target1");
    assertEquals(root.resolve("target2[]").toString(true), ":target2[]");
    assertEquals(root.resolve("target3[a]").toString(true), ":target3[a]");
    assertEquals(
      root.resolve("target1[a,b]").toString(true),
      ":target1[a,b]",
    );
    assertEquals(
      root.resolve("target2[a,b,c]").toString(true),
      ":target2[a,b,c]",
    );
    assertEquals(
      root.resolve("target3[a,b, c]").toString(true),
      ":target3[a,b, c]",
    );
    assertEquals(
      root.resolve("target1:target2").toString(true),
      ":target1:target2",
    );
    assertEquals(
      root.resolve("target2:target3[]").toString(true),
      ":target2:target3[]",
    );
    assertEquals(
      root.resolve("target3:target4[a]").toString(true),
      ":target3:target4[a]",
    );
    assertEquals(
      root.resolve("target1:target2[a,b]").toString(true),
      ":target1:target2[a,b]",
    );
    assertEquals(
      root.resolve("target2:target3[a,b,c]").toString(true),
      ":target2:target3[a,b,c]",
    );
    assertEquals(
      root.resolve("target3:target4[a,b, c]").toString(true),
      ":target3:target4[a,b, c]",
    );
  },
});
