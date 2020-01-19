module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          node: true,
        },
      },
    ],
    "./@querycap-dev/babel-preset",
  ],
};
