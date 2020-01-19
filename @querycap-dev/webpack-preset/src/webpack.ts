import { join } from "path";
import { Configuration, DefinePlugin, LoaderOptionsPlugin, optimize } from "webpack";
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import { createState, initialProject, TState } from "./State";

const { ModuleConcatenationPlugin, AggressiveMergingPlugin } = optimize;

export type TPreset = (c: Configuration, state: TState) => void;

export const withPresetsBy = (stateOpts: Partial<TState> = {}) => (...presets: TPreset[]): Configuration => {
  const state = createState(stateOpts);

  initialProject(state);

  const c: Configuration = {
    context: state.context,
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
