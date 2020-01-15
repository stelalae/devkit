# WebApp 开发套件

基于 [Feature PR Flow](https://github.com/querycap/feature-pr-flow)，
TypeScript 和 Webpack 开发 Web App

## 项目结构

* 支持多个应用并行开发，便于公用模块的复用
* 通过 tag 触发 CI/CD 流程，`feat/<APP_NAME>[--<FEATURE>][.<ENV>]`

```
src-app/
    app-one/
        index.ts
        config.ts
        index.html  # 可选
        icon.png    # 和 config 中的 APP_MANIFEST 共同触发构建为 PWA
    app-two/
        index.ts
        config.ts     
helmx.project.yml
webpack.config.ts
package.json
```

```typescript
// webpack.config.ts

import { release, withPresetsBy } from "@querycap/webpack-preset";
import { withAssetsPreset } from "@querycap/webpack-preset-assets";
import { withHTMLPreset } from "@querycap/webpack-preset-html";
import { withTsPreset } from "@querycap/webpack-preset-ts";

export = withPresetsBy({
  cwd: __dirname
})(
  (_, state) => {
    console.log(state);

    if (process.env.TO_RELEASE) {
      release(state);
    }
  },
  withTsPreset(),
  withAssetsPreset(),
  withHTMLPreset()
);
```

```yaml
# helmx.project.yml
project:
  name: web-${APP}
  feature: "${PROJECT_FEATURE}"
  group: gis
  version: 0.0.0
```

```typescript
// src-app/<APP_NAME>/config.ts
import { confLoader } from "@querycap/config";

// 部署环境列表，最后会处理为小写
export enum ENVS {
  STAGING,
  TEST,
  DEMO,
  ONLINE,
  LOCAL,
}

export const APP_MANIFEST = {
  name: "测试",
  background_color: "#19C7B1",
  crossorigin: "use-credentials"
};

export const APP_CONFIG = {
  SRV_TEST: (env: string, feature: string) => {
    if (env === "local") {
      return `//127.0.0.1:80`;
    }

    if (feature === "demo") {
      return `//api.demo.com`;
    }

    return `//api.com`;
  }
};

// conf() 将返回从 meta 中读取的配置信息，也方便在容器中注入
// 另外，当应用以插件的形式使用的时候，也方便对应页面配置
// <meta name="devkit:app" content="appName=demo,env=demo,version=__PROJECT_VERSION__">
// <meta name="devkit:config" content="SRV_TEST=//demo.querycap.com">
export const conf = confLoader<keyof typeof APP_CONFIG>()
```