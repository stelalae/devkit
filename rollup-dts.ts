import path from "path";
import { rollup } from "rollup";
import dts from "rollup-plugin-dts";
import { existsSync, writeFileSync } from "fs";
import del from "del";
import { omit } from "lodash";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require(path.join(process.cwd(), "package.json"));

const dtsIndex = pkg.main.replace(/\.js$/, ".d.ts");

if (existsSync(path.join(process.cwd(), dtsIndex))) {
  writeFileSync(
    path.join(process.cwd(), "package.json"),
    JSON.stringify(
      {
        name: pkg.name,
        version: pkg.version,
        types: dtsIndex,
        ...omit(pkg, ["types", "ts"]),
      },
      null,
      2,
    ),
  );

  (async () => {
    const bundle = await rollup({
      input: dtsIndex,
      plugins: [dts()],
    });

    await bundle.write({
      file: dtsIndex,
      format: "es",
    });

    del.sync(path.join(process.cwd(), "dist/declarations"));
  })().catch((e) => {
    console.error(`${pkg.name}`, e);
    throw e;
  });
}
