import { createHash } from "node:crypto";
import { extname } from "node:path";
import { readFile, writeFile } from "node:fs/promises";

import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import swc from "@swc/core";
import { rollup } from "rollup";
import esbuild from "rollup-plugin-esbuild";

const sourcePath = "src/index.js";
const outputPath = "index.js";
const manifestPath = "manifest.json";
const extensions = [".js", ".jsx", ".mjs", ".ts", ".tsx", ".cts", ".mts"];

const plugins = [
  nodeResolve(),
  commonjs(),
  {
    name: "swc",
    async transform(code, id) {
      const extension = extname(id);
      if (!extensions.includes(extension)) return null;

      const typescript = extension.includes("ts");
      const result = await swc.transform(code, {
        filename: id,
        jsc: {
          externalHelpers: true,
          parser: {
            syntax: typescript ? "typescript" : "ecmascript",
            tsx: typescript ? extension.endsWith("x") : undefined,
            jsx: !typescript ? extension.endsWith("x") : undefined
          }
        },
        env: {
          targets: "fully supports es6",
          include: [
            "transform-block-scoping",
            "transform-classes",
            "transform-async-to-generator",
            "transform-async-generator-functions"
          ],
          exclude: [
            "transform-parameters",
            "transform-template-literals",
            "transform-exponentiation-operator",
            "transform-named-capturing-groups-regex",
            "transform-nullish-coalescing-operator",
            "transform-object-rest-spread",
            "transform-optional-chaining",
            "transform-logical-assignment-operators"
          ]
        }
      });

      return result.code;
    }
  },
  esbuild({ minify: true })
];

const bundle = await rollup({
  input: sourcePath,
  onwarn() {},
  plugins,
  treeshake: false
});

await bundle.write({
  file: outputPath,
  format: "iife",
  compact: true,
  exports: "named"
});
await bundle.close();

const output = await readFile(outputPath);
const hash = createHash("sha256").update(output).digest("hex");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

manifest.hash = hash;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Built ${outputPath}`);
console.log(`SHA-256 ${hash}`);
