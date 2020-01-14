import { TState } from "@querycap/webpack-preset";
import { Configuration } from "webpack";

export const withAssetsPreset = () => (c: Configuration, _2: TState) => {
  c.module?.rules.push(
    {
      test: /\.css$/,
      use: [require.resolve("style-loader"), require.resolve("css-loader")],
    },
    {
      test: /\.md$/,
      use: [require.resolve("html-loader"), require.resolve("markdownit-loader")],
    },
    {
      test: /\.f\.json$/,
      use: [require.resolve("file-loader")],
      type: "javascript/auto",
    },
    {
      test: /\.(eot|woff2?|ttf)$/,
      use: [require.resolve("url-loader")],
    },
    {
      // xxx.raw.svg
      test: /\.raw\.svg$/,
      use: [require.resolve("raw-loader")],
    },
    {
      // xxx.glsl
      test: /\.(glsl|frag|vert)$/,
      use: [glslLoader],
    },
    {
      // xxx.svg
      test: /^.*(?<!\.raw)\.svg$/,
      use: [require.resolve("file-loader")],
    },
    {
      // xxx.svga
      test: /\.svga$/,
      use: [require.resolve("file-loader")],
    },
    {
      test: /\.(png|jpg)$/,
      use: [
        {
          loader: require.resolve("file-loader"),
          options: {
            esModule: false,
          },
        },
      ],
    },
  );
};

function glslLoader(content: string) {
  const code = content
    .trim() // strip whitespace at the start/end
    .replace(/\s*\/\/[^\n]*\n/g, "\n") // strip double-slash comments
    .replace(/\n+/g, "\n") // collapse multi line breaks
    .replace(/\n\s+/g, "\n") // strip identation
    .replace(/\s?([+-/*=,])\s?/g, "$1") // strip whitespace around operators
    .replace(/([;(),{}])\n(?=[^#])/g, "$1"); // strip more line breaks

  return `export default ${JSON.stringify(code)};`;
}

glslLoader.seperable = true;
