import { Store, StoreProvider } from "@reactorx/core";
import { StatusOK } from "@reactorx/request";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import React from "react";
import { render } from "react-dom";
import { act } from "react-dom/test-utils";
import { A, AxiosProvider, baseURLsFromConfig, createRequestActor, useTempDataOfRequest } from "..";

const getEmojis = createRequestActor<void, { [k: string]: string }>("test.emojis", () => ({
  method: "GET",
  url: "/test/emojis",
}));

describe("full flow", () => {
  const mock = (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    return new Promise<AxiosResponse>((resolve) => {
      console.log(config.url);

      resolve({
        status: StatusOK,
        statusText: "OK",
        data: {
          "100": "https://assets-cdn.github.com/images/icons/emoji/unicode/1f4af.png?v8",
        },
        headers: {},
        config,
      });
    });
  };

  const store$ = Store.create({});

  function Emojis() {
    const [emojis] = useTempDataOfRequest(getEmojis, undefined);

    return (
      <div>
        {JSON.stringify(emojis || {})}
        <A requestActor={getEmojis} />
      </div>
    );
  }

  it("in react", async () => {
    const root = (
      <StoreProvider value={store$}>
        <AxiosProvider
          baseURLs={baseURLsFromConfig({
            SRV_TEST: "//api.github.com",
          })}
          options={{
            adapter: mock,
          }}>
          <Emojis />
        </AxiosProvider>
      </StoreProvider>
    );

    const $root = document.createElement("div");

    act(() => {
      render(root, $root);
    });

    await act(async () => {
      await sleep(100);
    });

    expect($root.innerHTML).toContain("100");
    expect($root.innerHTML).toContain("http://api.github.com/test/emojis");
  });
});

function sleep(period: number) {
  return new Promise((resolve) => setTimeout(resolve, period));
}
