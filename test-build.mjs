import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { parse } from "@swc/core";

const source = await readFile("src/index.js", "utf8");
const output = await readFile("index.js", "utf8");
const manifest = JSON.parse(await readFile("manifest.json", "utf8"));

function countAsyncSyntax(node) {
  const counts = { asyncFunctions: 0, awaitExpressions: 0 };

  function visit(value) {
    if (!value || typeof value !== "object") return;
    if (value.type === "AwaitExpression") counts.awaitExpressions += 1;
    if (value.async === true) counts.asyncFunctions += 1;
    for (const child of Object.values(value)) {
      if (Array.isArray(child)) child.forEach(visit);
      else visit(child);
    }
  }

  visit(node);
  return counts;
}

function evaluatePlugin(code) {
  const vendetta = {
    logger: { error() {}, info() {}, log() {}, warn() {} },
    metro: { common: {} },
    patcher: {},
    plugin: { storage: {} },
    storage: {},
    ui: {
      alerts: {},
      assets: {},
      components: { Forms: {} },
      toasts: {}
    },
    utils: {}
  };
  return Function("vendetta", `return ${code}`)(vendetta);
}

const sourceSyntax = countAsyncSyntax(await parse(source, { syntax: "ecmascript" }));
const outputSyntax = countAsyncSyntax(await parse(output, { syntax: "ecmascript" }));

assert.deepEqual(sourceSyntax, { asyncFunctions: 4, awaitExpressions: 8 });
assert.deepEqual(outputSyntax, { asyncFunctions: 0, awaitExpressions: 0 });
assert.match(source, /^const pluginModule = /);
assert.match(source, /export default pluginModule\.default;\s*$/);

Function("vendetta", `return vendetta => { return ${output}\n}`);

const outputPlugin = evaluatePlugin(output);
assert.deepEqual(Object.keys(outputPlugin).sort(), ["default"]);
assert.deepEqual(Object.keys(outputPlugin.default).sort(), ["onLoad", "onUnload", "settings"]);
assert.doesNotThrow(() => outputPlugin.default.onLoad());
assert.doesNotThrow(() => outputPlugin.default.onUnload());

const hash = createHash("sha256").update(output).digest("hex");
assert.equal(manifest.hash, hash);
assert.equal(manifest.main, "index.js");

console.log("Source async functions: 4; await expressions: 8");
console.log("Bundle async functions: 0; await expressions: 0");
console.log("Source wrapper shape: passed");
console.log("Kettu wrapper parse: passed");
console.log("Plugin export surface: unchanged");
console.log("Minimal onLoad/onUnload smoke test: passed");
console.log(`Manifest SHA-256: ${hash}`);
