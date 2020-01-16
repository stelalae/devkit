import { displayPermissions, ShouldEnterResolver, TShouldRender, useAccessControl } from "@querycap/access";
import { Dictionary, forEach, some } from "lodash";
import React, { Children, cloneElement, lazy, ReactNode, Suspense, useMemo } from "react";
import { RouteTree } from "./RouteTree";

function resolveShouldRender(route: RouteTree): Promise<TShouldRender> {
  if (!route.state) {
    route.state = {};
  }
  if (!(route.state as any).resolveShouldRender) {
    (route.state as any).resolveShouldRender = resolveShouldRenderBase(route);
  }
  return (route.state as any).resolveShouldRender;
}

function resolveShouldRenderBase(route: RouteTree): Promise<TShouldRender> {
  if (route.Component) {
    if ((route.Component as ShouldEnterResolver).resolveShouldRender) {
      // route Component 自己已经定义，则直接使用
      return (route.Component as ShouldEnterResolver).resolveShouldRender!();
    }
  }

  // 找子路由
  const subShouldRenders: Promise<TShouldRender>[] = [];

  let hasIndex = false;

  forEach(route.routes, (subRoute) => {
    // 辅助类不处理
    if (subRoute.Component && (subRoute.Component as any).assistant) {
      return;
    }

    // 无 index 路由找其他路由
    // 否则使用子路由权限
    if (!hasIndex) {
      subShouldRenders.push(resolveShouldRender(subRoute));
    }

    if (subRoute.exact) {
      hasIndex = true;
    }
  });

  if (subShouldRenders.length !== 0) {
    return Promise.all(subShouldRenders).then((subShouldRenders) => {
      const needPermissions: string[] = [];

      forEach(subShouldRenders, (shouldRender) => {
        needPermissions.push(shouldRender && shouldRender.ac ? shouldRender.ac : "any");
      });

      const shouldRender = (permissions: Dictionary<boolean>, context: Dictionary<string[]>) =>
        some(subShouldRenders, (shouldRender) => {
          return shouldRender ? shouldRender(permissions, context) : true;
        });

      shouldRender.needPermissions = displayPermissions(" | ", needPermissions);

      return shouldRender;
    });
  }

  return Promise.resolve(() => true);
}

export function RBACShouldEnter({ children, route }: { children: ReactNode; route: RouteTree }) {
  const C = useMemo(() => {
    return lazy(() => {
      if (!route.state) {
        route.state = {};
      }

      if (!(route.state as any).resolveShouldRender) {
        (route.state as any).resolveShouldRender = resolveShouldRender(route);
      }

      return (route.state as any).resolveShouldRender.then((shouldRender: TShouldRender) => {
        function RBACShouldEnter({ children }: { children: ReactNode }) {
          const { permissions, attrs } = useAccessControl();

          if (!shouldRender || shouldRender(permissions || {}, attrs || ({} as any))) {
            return (
              <>
                {cloneElement(Children.only(children as any), {
                  ["data-access-control"]: shouldRender?.ac,
                })}
              </>
            );
          }

          return null;
        }

        return {
          default: RBACShouldEnter,
        };
      });
    });
  }, []);

  return (
    <Suspense fallback={<></>}>
      <C>{children}</C>
    </Suspense>
  );
}