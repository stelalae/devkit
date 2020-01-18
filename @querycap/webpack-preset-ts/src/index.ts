import { TState } from "@querycap/webpack-preset";
import TerserPlugin from "terser-webpack-plugin";
import { Configuration, HashedModuleIdsPlugin } from "webpack";

export const withTsPreset = (vendorGroups: { [key: string]: RegExp } = {}) => (c: Configuration, state: TState) => {
  const isProd = !state.inDev;

  const babelLoader = {
    loader: require.resolve("babel-loader"),
    options: {
      cwd: state.cwd,
      babelrc: true,
      cacheDirectory: !isProd,
      overrides: [
        {
          presets: [
            [
              "@babel/preset-env",
              {
                targets: {
                  chrome: 50,
                  ie: 11,
                  esmodules: true,
                },
              },
            ],
          ],
        },
      ],
    },
  };

  Object.assign(c.resolve, {
    extensions: [".tsx", ".ts", ".mjs", ".js", ".json"],
    modules: [process.cwd(), "node_modules"],
    enforceExtension: false,
    mainFields: ["browser", "jsnext:main", "module", "main"],
  });

  Object.assign(c.node, {
    fs: "empty",
  });

  c.plugins?.push(new HashedModuleIdsPlugin());

  Object.assign(c.optimization, {
    namedModules: state.inDev,
    minimize: !state.inDev,
    minimizer: [
      new TerserPlugin({
        cache: true,
        parallel: true,
        extractComments: false,
        terserOptions: {
          ecma: 6,
          compress: true,
          mangle: true,
          output: {
            comments: false,
          },
        },
        sourceMap: false,
      }),
    ],
    // learn from https://hackernoon.com/the-100-correct-way-to-split-your-chunks-with-webpack-f8a9df5b7758
    // with some enhance
    splitChunks: {
      chunks: "all",
      maxAsyncRequests: Infinity,
      maxInitialRequests: Infinity,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name(module: any) {
            // get the name. E.g. node_modules/packageName/not/this/part.js
            // or node_modules/packageName
            // npm package names are URL-safe, but some servers don't like @ symbols
            let packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1].replace("@", "");

            for (const groupKey in vendorGroups) {
              if (vendorGroups[groupKey].test(packageName)) {
                packageName = groupKey;
                break;
              }
            }

            return `vendor~${packageName}`;
          },
        },
      },
    },
  });

  c.module?.rules.push(
    {
      test: /\.worker\.tsx?$/,
      use: [
        {
          loader: require.resolve("worker-loader"),
          options: {
            inline: true,
            fallback: false,
          },
        },
        babelLoader,
      ],
    },
    {
      test: /\.tsx?$/,
      ...babelLoader,
    },
  );
};
