import { composeEpics, epicOn } from "@reactorx/core";
import {
  createCombineDuplicatedRequestEpic,
  paramsSerializer,
  transformRequest,
  TRequestInterceptor,
} from "@reactorx/request";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { Dictionary, forEach } from "lodash";
import React, { createContext, ReactNode, useContext, useMemo } from "react";
import { createRequestEpic, RequestActor } from "./RequestActor";
import { urlComplete } from "./utils";

const AxiosContext = createContext<{ client?: AxiosInstance }>({});

export const useAxiosInstance = () => useContext(AxiosContext).client!;

export const AxiosProvider = ({
  children,
  baseURLs,
  options,
  interceptors = [],
}: {
  children: ReactNode;
  baseURLs?: Dictionary<string>;
  options?: AxiosRequestConfig;
  interceptors?: TRequestInterceptor[];
}) => {
  const opts = {
    ...options,
  };

  const client = useMemo(() => {
    const c = axios.create({
      ...opts,
      paramsSerializer,
      transformRequest,
    });

    if (baseURLs) {
      const complete = urlComplete(baseURLs);

      const patchURL = (axiosRequestConfig: AxiosRequestConfig) => {
        axiosRequestConfig.url = complete(axiosRequestConfig.url);
        axiosRequestConfig.baseURL = undefined;
        return axiosRequestConfig;
      };

      interceptors = [
        (req) => {
          req.use((axiosRequestConfig: AxiosRequestConfig) => {
            return patchURL(axiosRequestConfig);
          });
        },
        ...interceptors,
      ];

      const originGetURL = c.getUri.bind(c);

      const getUri = (config: AxiosRequestConfig) => {
        return originGetURL(patchURL(config));
      };

      c["getUri"] = getUri.bind(c);
    }

    forEach(interceptors, (interceptor) => {
      interceptor(c.interceptors.request, c.interceptors.response);
    });

    return c;
  }, []);

  return (
    <AxiosContext.Provider value={{ client }}>
      {epicOn(composeEpics(createCombineDuplicatedRequestEpic(), createRequestEpic(opts, ...interceptors)))}
      {children}
    </AxiosContext.Provider>
  );
};

export const A = ({
  requestActor,
  ...otherProps
}: { requestActor: RequestActor } & React.HTMLAttributes<HTMLAnchorElement>) => {
  const axiosInstance = useAxiosInstance();

  return <a {...otherProps} href={axiosInstance.getUri(requestActor.requestConfig())} />;
};
