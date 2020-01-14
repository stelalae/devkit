import { appFeatureEnvFromCommitTag, withPresetsBy } from "../index";

describe("#appFeatureEnvFromCommitTag", () => {
  it("full", () => {
    const [app, feature, env] = appFeatureEnvFromCommitTag("feature/demo--xxx.test");

    expect(app).toBe("demo");
    expect(feature).toBe("xxx");
    expect(env).toBe("test");
  });

  it("partial", () => {
    const [app, feature, env] = appFeatureEnvFromCommitTag("feature/demo");

    expect(app).toBe("demo");
    expect(feature).toBe(undefined);
    expect(env).toBe(undefined);
  });
});

test("webpack-preset", () => {
  withPresetsBy({
    cwd: __dirname,
  })((_, state) => {
    console.log(state);
  });
});
