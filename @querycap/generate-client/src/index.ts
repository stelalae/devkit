import { TParameter } from "@morlay/ts-gen-client-from-openapi";
import { generate } from "@querycap/generate-client/src/generate";
import { patchOpenAPI } from "@querycap/generate-client/src/openapi-patch";
import axios from "axios";
import { createHash } from "crypto";
import { writeFileSync } from "fs";
import { createFileSync, readFileSync } from "fs-extra";
import { pickBy, startsWith, toLower } from "lodash";
import path from "path";

export const prefixProtocol = (uri: string) => (uri.startsWith("//") ? `http:${uri}` : uri);

export const defaultFilterParameter = (parameter: TParameter): boolean => {
  if (parameter.in === "cookie") {
    return false;
  }
  if (parameter.in === "header") {
    return !["authorization", "referer"].includes(toLower(parameter.name));
  }
  return true;
};

export interface GenOpts {
  cwd: string;
  ignorePaths: string[];
  filterParameter: (parameter: TParameter) => boolean;
  clientCreator: string;
  force: boolean;
}

export const generateClient = async (
  clientID: string,
  uri: string,
  {
    cwd = process.cwd(),
    clientCreator = "src-core/request.createRequestActor",
    filterParameter = defaultFilterParameter,
    ignorePaths,
    force,
  }: Partial<GenOpts>,
) => {
  try {
    console.log(`generating clients if needed from ${uri}`);

    const res = await axios.get(uri);

    const clientFile = path.join(cwd, `src-clients/${clientID}/index.ts`);
    const sumFile = path.join(cwd, `src-clients/${clientID}/index.sum`);

    let prevSum = "";

    try {
      prevSum = String(readFileSync(sumFile));
    } catch (e) {
      //
    }

    const sum = hash(JSON.stringify(res.data));

    if (force || sum !== prevSum) {
      const patchedOpenAPI = patchOpenAPI(res.data, { filterParameter, ignorePaths });

      generateFile(clientFile, generate(clientID, patchedOpenAPI, clientCreator));

      generateFile(sumFile, sum);
    }
  } catch (e) {
    console.log(`generate client failed for service ${clientID}`, e);
  }
};

export const generateClientFromConfig = async (config: { [key: string]: string }, opts: Partial<GenOpts>) => {
  const services = pickBy(config, (_, k) => startsWith(k, "SRV_"));

  for (const serviceName in services) {
    if (services[serviceName]) {
      try {
        const clientID = serviceName
          .replace("SRV_", "")
          .toLowerCase()
          .replace(/_/g, "-");
        const uri = prefixProtocol(services[serviceName] + "/" + clientID);

        await generateClient(clientID, uri, opts);
      } catch (e) {
        console.log(e);
      }
    }
  }
};

function hash(data: string) {
  const h = createHash("md5");
  h.update(data);
  return String(h.digest("hex"));
}

function generateFile(path: string, content: string) {
  createFileSync(path);
  writeFileSync(path, content);
  console.log(`generated ${path}`);
}
