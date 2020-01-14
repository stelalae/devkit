import path from "path";
import { createState, fromCommitTag, initialProject } from "../index";

describe("#State", () => {
  describe("fromCommitTag", () => {
    it("full", () => {
      const state = fromCommitTag("feature/demo--xxx.test");

      expect(state).toEqual({
        appName: "demo",
        appFeature: "xxx",
        targetEnv: "test",
      });
    });

    it("partial", () => {
      const state = fromCommitTag("feature/demo");

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
