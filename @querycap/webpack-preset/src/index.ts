import path from "path";
import { Configuration, DefinePlugin, LoaderOptionsPlugin, optimize } from "webpack";
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";

const { ModuleConcatenationPlugin, AggressiveMergingPlugin } = optimize;

export type TState = {
  cwd: string;
  appName: string;
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

export const withPresets = (...presets: TPreset[]): Configuration => {
  const state = Object.freeze({
    cwd: process.cwd(),
    inDev: (process.env.NODE_ENV || "development").toLowerCase() === "development",
    appName: (process.env.APP || "").toLowerCase().split("--")[0],
    config: JSON.parse(process.env.CONFIG || "{}"),
    manifest: process.env.MANIFEST ? JSON.parse(process.env.MANIFEST) : undefined,
  });

  const c: Configuration = {
    context: path.join(state.cwd, `src-app/${state.appName}`),
    entry: {
      app: `./index.ts`,
    },
    output: {
      path: path.join(state.cwd, `public/${state.appName}`, `/__built__/`),
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
    preset(c, state);
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
