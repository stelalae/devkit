import { some } from "lodash";
import React from "react";

export type NonNullableArray<TArr> = { [I in keyof TArr]: NonNullable<TArr[I]> };

export function must<TProps extends {}, TPrepare extends Readonly<any[]>>(usePrepare: (props: TProps) => TPrepare) {
  return function(render: (props: TProps, ...prepare: NonNullableArray<TPrepare>) => JSX.Element | null) {
    const C = ({ "data-prepare": dataPrepare, ...props }: TProps & { ["data-prepare"]: NonNullableArray<TPrepare> }) =>
      render(props as any, ...(dataPrepare as any));

    return function Must(props: TProps) {
      const prepare = usePrepare(props);

      if (some(prepare, (a) => !a)) {
        return null;
      }

      return <C {...props} data-prepare={prepare as NonNullableArray<TPrepare>} />;
    };
  };
}
