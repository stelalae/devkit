import path from "path";
import { createState, fromCommitRefName, initialProject } from "../index";

describe("#State", () => {
  describe("fromCommitTag", () => {
    it("full", () => {
      const state = fromCommitRefName("feature/demo--xxx.test");

      expect(state).toEqual({
        appName: "demo",
        appFeature: "xxx",
        targetEnv: "test",
      });
    });

    it("partial", () => {
      const state = fromCommitRefName("feature/demo");

      expect(state).toEqual({
        appName: "demo",
        appFeature: undefined,
        targetEnv: undefined,
      });
    });
  });

  describe("#createState", () => {
    const state = createState({
      cwd: path.join(__dirname, "../__examples__"),
    });

    console.log(state);

    it("#initialProject", () => {
      initialProject(state);
    });
  });
});
