import { Actor } from "@reactorx/core";

import {
  createRequestActor as createRequestActorOrigin,
  createRequestEpic as createRequestEpicOrigin,
  IRequestOpts,
  RequestActor as RequestActorOrigin,
  TRequestInterceptor,
} from "@reactorx/request";
import { AxiosRequestConfig } from "axios";
import { assign, map } from "lodash";
import { merge as observableMerge, Observable } from "rxjs";
import { filter as rxFilter, ignoreElements as rxIgnoreElements, tap as rxTap } from "rxjs/operators";
import uuid from "uuid";
import { errorPatch, IStatusError } from "./StatusError";

export class RequestActor<TReq = any, TResBody = any> extends RequestActorOrigin<TReq, TResBody, IStatusError> {}

export function createRequestActor<TReq, TResBody>(name: string, requestOptsFromReq: (arg: TReq) => IRequestOpts) {
  return createRequestActorOrigin<TReq, TResBody, IStatusError>(name, requestOptsFromReq);
}

export { AxiosRequestConfig };

export const createRequestEpic = (options: AxiosRequestConfig, ...interceptors: TRequestInterceptor[]) => {
  return createRequestEpicOrigin(options, errorPatch, ...interceptors);
};

export function tapWhen(next: () => void, ...actors: RequestActor[]) {
  return (actor$: Observable<Actor>) => {
    return observableMerge(...map(actors, (actor) => actor$.pipe(rxFilter(actor.done.is)))).pipe(
      rxTap(next),
      rxIgnoreElements(),
    );
  };
}

export function uniqArg<T>(arg: T): T {
  return assign(arg || {}, { _id: uuid() }) as any;
}
