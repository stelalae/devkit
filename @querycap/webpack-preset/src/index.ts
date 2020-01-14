import { existsSync, mkdirSync, writeFileSync } from "fs";
import globby from "globby";
import { safeDump } from "js-yaml";
import { keys, last, mapKeys, mapValues } from "lodash";
import path, { join } from "path";
import { Configuration, DefinePlugin, LoaderOptionsPlugin, optimize } from "webpack";
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";

const { ModuleConcatenationPlugin, AggressiveMergingPlugin } = optimize;

export type TState = {
  cwd: string;
  appName: string;
  appFeature?: string;
  group?: string;
  targetEnv: string;
  inDev: boolean;
  config: { [key: string]: string };
  manifest?: {
    name: string;
    description?: string;
    background_color?: string;
    crossorigin?: string;
  };
};

export type TPreset = (c: Configuration, state: TState) => void;

function loadAppBases(cwd: string): { [key: string]: string } {
  const dirs = globby.sync([join(cwd, "./src-app/**")], {
    onlyDirectories: true,
  });

  return dirs.reduce(
    (apps, p) => ({
      ...apps,
      [last(p.split("/"))!]: p,
    }),
    {},
  );
}

type TEnvVarBuilder = (env: string, feature: string, appName: string) => string;

function resolveConfigFile(state: TState) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const conf = require(path.join(state.cwd, "src-app", state.appName, "./config.ts"));
  const envs = mapKeys(conf.ENVS, (key) => key.toLowerCase());

  if (conf.GROUP) {
    state.group = conf.GROUP;
  }

  if (state.targetEnv === "" || !envs[state.targetEnv]) {
    state.targetEnv = keys(envs)[0];
  }

  state.manifest = conf.APP_MANIFEST;

  state.config = mapValues(conf.APP_CONFIG, (fn: TEnvVarBuilder) =>
    fn(state.targetEnv, state.appFeature || "", state.appName),
  ) as any;

  writeConfig(state);
}

function writeConfig(state: TState) {
  const dir = path.join(state.cwd, "./config");

  const confFile = path.join(dir, "./default.yml");

  if (!existsSync(dir)) {
    mkdirSync(dir);
  }

  writeFileSync(
    confFile,
    safeDump({
      APP: state.appName,
      FULL_PATH: `${state.appName}${state.appFeature ? `--${state.appFeature}` : ""}${
        state.group ? `__${state.group}` : ""
      }${state.targetEnv ? `--${state.targetEnv}` : ""}`,
      APP_CONFIG: JSON.stringify(state.config || {}),
      PROJECT_DESCRIPTION: state.manifest?.name,
      PROJECT_GROUP: state.group,
    }),
  );

  console.log(`${confFile} written`);
}

export const appFeatureEnvFromCommitTag = (commitTag = "") => {
  const rule = commitTag.replace(/^feat(ure)?\//, "");

  const [appAndFeature, env] = rule.split(".");

  return [...appAndFeature.split("--", 2), env];
};

if (process.env.CI_COMMIT_TAG) {
  const [app, feature, env] = appFeatureEnvFromCommitTag(process.env.CI_COMMIT_TAG);
  process.env.APP = app;
  process.env.PROJECT_FEATURE = feature;
  process.env.ENV = env;
}

export const withPresetsBy = ({
  cwd = process.cwd(),
  appName = (process.env.APP || "").toLowerCase().split("--")[0],
  appFeature = (process.env.PROJECT_FEATURE || "").toLowerCase().split("--")[1] || "",
  targetEnv = (process.env.ENV || "").toLowerCase(),
  group = (process.env.PROJECT_GROUP || "").toLowerCase(),
  inDev = (process.env.NODE_ENV || "development").toLowerCase() === "development",
  config = JSON.parse(process.env.APP_CONFIG || "{}"),
  manifest = process.env.MANIFEST ? JSON.parse(process.env.MANIFEST) : undefined,
}: Partial<TState> = {}) => (...presets: TPreset[]): Configuration => {
  const state = {
    cwd,
    inDev,
    appName,
    appFeature,
    group,
    targetEnv,
    config,
    manifest,
  };

  const appBases = loadAppBases(state.cwd);

  if (state.appName === "" || !appBases[state.appName]) {
    state.appName = keys(appBases)[0];
  }

  if (state.appName === "") {
    throw new Error("need created one ore more apps under direction ./src-app");
  }

  resolveConfigFile(state);

  const c: Configuration = {
    context: join(state.cwd, `src-app/${state.appName}`),
    entry: {
      app: `./index.ts`,
    },
    output: {
      path: join(state.cwd, `public/${state.appName}`, `/__built__/`),
      publicPath: `/__built__/`,
      chunkFilename: "[name].[contenthash].chunk.js",
      filename: "[name].[contenthash].js",
    },
    mode: state.inDev ? "development" : "production",
    performance: {
      hints: state.inDev ? false : "warning",
    },
    optimization: {},
    module: {
      rules: [],
    },
    resolve: {},
    node: {},
    plugins: [
      new DefinePlugin({
        ".js'": "'",
        "process.env": {
          NODE_ENV: JSON.stringify(process.env.NODE_ENV || "development"),

          APP: JSON.stringify(state.appName),
          // no defaults in prod to make sure pkg same results
          APP_CONFIG: state.inDev ? JSON.stringify(state.config) : "{}",
        },
      }),
    ],
  };

  presets.forEach((preset) => {
    preset(c, Object.freeze(state));
  });

  if (!state.inDev) {
    c.plugins?.push(
      new LoaderOptionsPlugin({
        minimize: true,
        debug: false,
      }),
      new ModuleConcatenationPlugin(),
      new AggressiveMergingPlugin({}),
    );
  }

  if (process.env.NODE_ANALYZER && process.env.NODE_ANALYZER !== "0") {
    c.plugins = [
      ...(c.plugins || []),
      new BundleAnalyzerPlugin({
        defaultSizes: "gzip",
        openAnalyzer: true,
      }),
    ];
  }

  return c;
};

export const withPresets = withPresetsBy();
