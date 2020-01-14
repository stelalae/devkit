import spawn from "cross-spawn";
import { createFileSync, writeFileSync } from "fs-extra";
import globby from "globby";
import { safeDump } from "js-yaml";
import { keys, last, mapKeys, mapValues } from "lodash";
import path, { join } from "path";

export type TState = {
  cwd: string;
  context: string;
  appName: string;
  appFeature?: string;
  group?: string;
  targetEnv: string;
  inDev: boolean;
  config: { [key: string]: string };
  manifest?: {
    name: string;
    description?: string;
    background_color?: string;
    crossorigin?: string;
  };
};

type TEnvVarBuilder = (env: string, feature: string, appName: string) => string;

export const createState = ({
  cwd = process.cwd(),
  appName = (process.env.APP || "").toLowerCase().split("--")[0],
  appFeature = (process.env.APP || "").toLowerCase().split("--")[1] || "",
  targetEnv = (process.env.ENV || "").toLowerCase(),
  group = (process.env.PROJECT_GROUP || "").toLowerCase(),
  inDev = (process.env.NODE_ENV || "development").toLowerCase() === "development",
  config = JSON.parse(process.env.APP_CONFIG || "{}"),
  manifest = process.env.MANIFEST ? JSON.parse(process.env.MANIFEST) : undefined,
}: Partial<TState>): TState => {
  const state: TState = {
    cwd,
    context: "",
    appName,
    appFeature,
    targetEnv,
    group,
    inDev,
    config,
    manifest,
  };

  if (process.env.CI_COMMIT_REF_NAME) {
    const { appName, appFeature, targetEnv } = fromCommitRefName(process.env.CI_COMMIT_REF_NAME);
    state.appName = appName;
    state.appFeature = appFeature;
    state.targetEnv = targetEnv;
  }

  const appBases = resolveApps(state.cwd);

  if (state.appName === "" || !appBases[state.appName]) {
    state.appName = keys(appBases)[0];
  }

  if (state.appName === "") {
    throw new Error("need created one ore more apps under direction ./src-app");
  }

  state.context = join(cwd, `src-app/${state.appName}`);

  resolveConfigFile(state);

  return state;
};

function resolveConfigFile(state: TState) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const conf = require(path.join(state.cwd, "src-app", state.appName, "./config.ts"));
  const envs = mapKeys(conf.ENVS, (key) => key.toLowerCase());

  if (conf.GROUP) {
    state.group = conf.GROUP;
  }

  if (state.targetEnv === "" || !envs[state.targetEnv]) {
    state.targetEnv = keys(envs)[0];
  }

  state.manifest = conf.APP_MANIFEST;

  state.config = mapValues(conf.APP_CONFIG, (fn: TEnvVarBuilder) =>
    fn(state.targetEnv, state.appFeature || "", state.appName),
  ) as any;
}

function resolveApps(cwd: string): { [key: string]: string } {
  const dirs = globby.sync([join(cwd, "./src-app/**")], {
    onlyDirectories: true,
  });

  return dirs.reduce(
    (apps, p) => ({
      ...apps,
      [last(p.split("/"))!]: p,
    }),
    {},
  );
}

export function initialProject(state: TState) {
  generateFile(
    join(state.cwd, ".gitlab-ci.yml"),
    safeDump({
      include: [
        {
          project: "infra/hx",
          file: "/ci/webapp.gitlab-ci.yml",
        },
      ],
    }),
  );

  generateFile(
    join(state.cwd, "web-entrypoint.sh"),
    `#!/bin/sh

envsubst '$PROJECT_REF $APP_CONFIG $ENV' < /etc/nginx/conf.d/site.template > /etc/nginx/conf.d/default.conf
nginx -g 'daemon off;'

exec "$@"  
`,
  );

  generateFile(
    join(state.cwd, "site.template"),
    `
gzip on;
gzip_comp_level 6;
gzip_types text/css application/javascript;

server {
  listen 80;
  root /usr/share/nginx/html;
  server_tokens off;

  location /favicon.ico {
      expires 1d;
      root /usr/share/nginx/html;
  }

  location /sw.js {
      expires -1;
      root /usr/share/nginx/html;
  }

  location /__built__/ {
     expires 30d;
     root /usr/share/nginx/html;
  }

  # html5 mode
  location / {
    expires -1;
    try_files $uri /index.html;

    add_header X-Frame-Options sameorigin;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    sub_filter '$PROJECT_REF' '$PROJECT_REF';
    sub_filter '$ENV' '$ENV';
    sub_filter '$APP_CONFIG' '$APP_CONFIG';
    sub_filter_once on;
  }
}`,
  );

  generateFile(
    join(state.cwd, "dockerfile.default.yml"),
    safeDump({
      from: "nginx:alpine",
      env: {
        APP_CONFIG: "{}",
        ENV: "",
      },
      add: {
        "./site.template": "/etc/nginx/conf.d/site.template",
        "./web-entrypoint.sh": "/usr/local/bin/web-entrypoint.sh",
        "./public/${APP}": "/usr/share/nginx/html",
      },
      run: "chmod +x /usr/local/bin/web-entrypoint.sh",
      entrypoint: ["web-entrypoint.sh"],
    }),
  );

  generateFile(
    join(state.cwd, "helmx.default.yml"),
    safeDump({
      service: {
        ports: ["80:80"],
        lifecycle: {
          preStop: "nginx -s quit",
        },
      },
    }),
  );

  generateFile(
    join(state.cwd, "./config/default.yml"),
    safeDump({
      APP: state.appName,
      ENV: state.targetEnv,
      FULL_PATH: toFullPath(state),
      APP_CONFIG: JSON.stringify(state.config || {}),
      PROJECT_DESCRIPTION: state.manifest?.name,
      PROJECT_FEATURE: state.appFeature || "",
      PROJECT_GROUP: state.group,
    }),
  );
}

export function generateFile(path: string, content: string) {
  createFileSync(path);
  writeFileSync(path, content, {
    mode: 644,
  });
  console.log(`generate ${path}`);
}

export function fromCommitRefName(commitTag = "") {
  const rule = commitTag.replace(/^feat(ure)?\//, "");

  const [appAndFeature, targetEnv] = rule.split(".");
  const [appName, appFeature] = appAndFeature.split("--", 2);

  return {
    appName,
    appFeature,
    targetEnv,
  };
}

export function toCommitRefName(state: TState) {
  return (
    `feat/${state.appName}` +
    `${state.appFeature ? `--${state.appFeature}` : ""}` +
    `${state.targetEnv && state.targetEnv !== "default" ? `.${state.targetEnv}` : ""}`
  );
}

export function toFullPath(state: TState) {
  return (
    `${state.appName}` +
    `${state.appFeature ? `--${state.appFeature}` : ""}` +
    `${state.group ? `__${state.group}` : ""}` +
    `${state.targetEnv && state.targetEnv !== "default" ? `--${state.targetEnv}` : ""}`
  );
}

function run(sh: string, args: string[] = []) {
  spawn.sync(sh, args, {
    stdio: "inherit",
    shell: true,
  });
}

export function release(state: TState) {
  run("git", ["tag", "-f", toCommitRefName(state)]);
  run("git", ["push", "-f", "origin", `refs/tags/${toCommitRefName(state)}`]);
}
