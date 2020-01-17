const r = (pkg) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires,no-undef
  const m = require(pkg);
  return m.default || m;
};

module.exports = () => ({
  plugins: [
    [r("@babel/plugin-transform-runtime")],
    [r("babel-plugin-typescript-iife-enum")],
    [r("@babel/plugin-transform-typescript"), { isTSX: true }],
    [r("@babel/plugin-transform-react-jsx")],
    [r("@babel/plugin-proposal-class-properties")],
    [r("@babel/plugin-proposal-object-rest-spread")],
    [r("@babel/plugin-proposal-optional-chaining")],
    [r("@babel/plugin-proposal-nullish-coalescing-operator")],
    [r("babel-plugin-pure-calls-annotation")]
  ]
});
