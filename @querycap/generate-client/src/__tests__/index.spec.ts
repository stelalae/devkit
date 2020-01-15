import { join } from "path";
import { generateClient } from "..";

test("generate-client", async () => {
  await generateClient("idp", "https://api.demo.querycap.com/idp", {
    cwd: join(__dirname, "./.tmp"),
    clientCreator: "../../../request.createRequest",
    force: true,
  });
});
