import { Store, StoreProvider } from "@reactorx/core";
import { render } from "@testing-library/react";
import localforage from "localforage";
// @ts-ignore
import memoryStorageDriver from "localforage-memoryStorageDriver";
import React, { useEffect } from "react";
import { createPersister } from "..";

describe("Persister", () => {
  beforeAll(async () => {
    await localforage.defineDriver(memoryStorageDriver);
  });

  it("flow", async () => {
    const persister = createPersister({
      name: "test",
      driver: memoryStorageDriver._driver,
    });

    const store$ = Store.create({
      $ping: 0,
      pong: 0,
    });

    function App() {
      useEffect(() => persister.connect(store$));
      return null;
    }

    render(
      <StoreProvider value={store$}>
        <App />
      </StoreProvider>,
    );

    expect((store$.getState() as any) || {}).toEqual({
      $ping: 0,
      pong: 0,
    });

    store$.next({ ...store$.getState(), $ping: 1, pong: 1 });
    store$.next({ ...store$.getState(), $ping: 2, pong: 2 });

    await timeout(1000);

    await persister.hydrate((data) => {
      expect(data).toEqual({
        $ping: 2,
      });
    });

    store$.next({ ...store$.getState(), $ping: undefined, pong: undefined } as any);
    await timeout(200);

    await persister.hydrate((data) => {
      expect(data).toEqual({});
    });

    store$.next({ ...store$.getState(), $ping: 1, pong: 1 } as any);
    await timeout(200);

    await persister.hydrate((data) => {
      expect(data).toEqual({
        $ping: 1,
      });
    });
  });
});

function timeout(t: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, t);
  });
}
