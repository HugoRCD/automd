import { readFile } from "node:fs/promises";
import { codeBlock } from "omark";
import { findExportNames, resolvePath } from "mlly";
import { getPkg } from "../_utils";
import { defineGenerator } from "../generator";

const DEFAULT_CDN = "https://esm.sh/";

export const jsimport = defineGenerator({
  name: "jsimport",
  async generate({ config, args }) {
    const { name } = await getPkg(config.dir, args);

    const importPath = name + (args.path || "");

    const importNames: string[] = ([] as string[])
      .concat(args.import, args.imports) // eslint-disable-line unicorn/prefer-spread
      .filter(Boolean)
      .flatMap((i) => i.split(/\s*,\s*/));

    if (args.src) {
      const resolved = await resolvePath(args.src, { url: config.dir });
      const contents = await readFile(resolved, "utf8");
      const exportNames = findExportNames(contents);
      if (exportNames && exportNames.length > 0) {
        importNames.push(...exportNames);
      }
    }

    const lines: string[] = [];

    const fmtImports =
      importNames.length > 1
        ? `\n${importNames.map((i) => "  " + i + ",").join("\n")}\n`
        : (importNames[0] && ` ${importNames[0]} `) || "";

    if (args.esm !== false) {
      const code = `import {${fmtImports}} from "${importPath}";`;
      lines.push("**ESM** (Node.js, Bun)", codeBlock(code, "js"));
    }

    if (args.cjs) {
      const code = `const {${fmtImports}} = require("${importPath}");`;
      lines.push("**CommonJS** (Legacy Node.js)", codeBlock(code, "js"));
    }

    if (args.cdn) {
      const cdnBase = typeof args.cdn === "string" ? args.cdn : DEFAULT_CDN;
      const code = `import {${fmtImports}} from "${cdnBase}${importPath}";`;
      lines.push("**CDN** (Deno, Bun and Browsers)", codeBlock(code, "js"));
    }

    return {
      contents: lines.join("\n\n"),
    };
  },
});
