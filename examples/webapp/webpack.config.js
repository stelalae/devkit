// eslint-disable-next-line no-undef
module.exports = require("@querycap/webpack-preset").withPresets(
  // eslint-disable-next-line no-undef
  require("@querycap/webpack-preset-assets").withAssetsPreset(),
  // eslint-disable-next-line no-undef
  require("@querycap/webpack-preset-ts").withTsPreset(),
  // eslint-disable-next-line no-undef
  require("@querycap/webpack-preset-html").withHTMLPreset()
);