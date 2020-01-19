import { TState } from "@querycap-dev/webpack-preset";
import { existsSync } from "fs";
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import HtmlWebpackPlugin from "html-webpack-plugin";
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import OfflinePlugin from "offline-plugin";
import { join } from "path";
import { stringify } from "querystring";
import { Configuration } from "webpack";
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import WebpackPwaManifest from "webpack-pwa-manifest";

export const withHTMLPreset = ({ meta }: { meta?: { [key: string]: string } } = {}) => (
  c: Configuration,
  state: TState,
) => {
  const isProd = !state.inDev;

  const enablePWA = isProd && existsSync(join(c.context!, "./logo.png"));
  const hasFavicon = existsSync(join(c.context!, "./favicon.ico"));
  const hasIndexHTML = existsSync(join(c.context!, "./index.html"));

  const stringifyMetaContent = (o: any = {}) =>
    stringify(o, ",", "=", {
      encodeURIComponent: (v) => v,
    });

  c.plugins?.push(
    new HtmlWebpackPlugin({
      favicon: hasFavicon ? "./favicon.ico" : undefined,
      template: hasIndexHTML ? "./index.html" : join(__dirname, "../index-default.html"),
      filename: "../index.html",
      inject: true,
      showErrors: true,
      title: state.manifest?.name,
      meta: {
        ...meta,
        "devkit:app": stringifyMetaContent({
          appName: state.appName,
          env: isProd ? "__ENV__" : state.targetEnv,
          version: isProd ? "__PROJECT_VERSION__" : state.version,
        }),
        "devkit:config": isProd ? "__APP_CONFIG__" : stringifyMetaContent(state.config || {}),
      },
    }),
  );

  if (enablePWA) {
    c.plugins?.push(
      enablePWA &&
        new WebpackPwaManifest({
          ...(state.manifest as any),
          short_name: state.appName,
          // eslint-disable-next-line @typescript-eslint/camelcase
          start_url: "/",
          icons: [
            {
              src: join(c.context!, "./logo.png"),
              sizes: [144, 256, 512],
            },
          ],
        }),
      new OfflinePlugin({
        safeToUseOptionalCaches: true,
        appShell: "/", // as html5 history fallback, see more https://github.com/NekR/offline-plugin/blob/master/docs/examples/SPA.md
        caches: {
          main: [
            "/__built__/../", // ugly for HtmlWebpackPlugin index.html
            "app.*.js",
          ],
          additional: [":externals:"],
          optional: [":rest:"],
        },
        ServiceWorker: {
          output: "../sw.js",
          events: true,
          cacheName: state.appName,
        },
        AppCache: {
          caches: ["main", "additional", "optional"],
          events: true,
        },
      }),
    );
  }
};
