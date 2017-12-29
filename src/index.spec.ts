// tslint:disable:no-shadowed-variable no-empty

import {
  Action,
  buildDispatcher,
  buildWatchedDispatcher,
  Dispatcher,
  Update,
} from "./index";

describe("Dispatcher", () => {
  describe("No Affects", () => {
    describe("NoOp", () => {
      it("should return the exact same state when the update function simply returns it", async () => {
        const action: Action<"NOOP"> = { type: "NOOP" };

        const state = { fakeKey: "fakeValue" };

        let newState: typeof state | null = null;

        const update: Update<typeof state, typeof action> = _ => state => ({
          state,
        });

        const dispatcher = buildWatchedDispatcher(
          () => state,
          () => {},
          update,
          (action, getState) => {
            newState = getState();
          },
        );

        await dispatcher(action);

        expect(newState).toBe(state);
        expect(dispatcher.getActions()).toEqual([action]);
      });

      it("should return the exact same state when performing a noop like actions", async () => {
        const action: Action<"NOOP"> = { type: "NOOP" };

        const state = { fakeKey: "fakeValue" };

        let newState: typeof state | null = null;

        const update: Update<typeof state, typeof action> = action => state => {
          switch (action.type) {
            case "NOOP":
              return { state };
          }
        };

        const dispatcher = buildWatchedDispatcher(
          () => state,
          () => {},
          update,
          (action, getState) => {
            newState = getState();
          },
        );

        await dispatcher(action);

        expect(newState).toBe(state);
        expect(dispatcher.getActions()).toEqual([action]);
      });
    });
  });

  describe("Update", () => {
    it("should return a new state with value incremented by 1", async () => {
      const action: Action<"INCREMENT"> = { type: "INCREMENT" };

      const state = { value: 2 };

      let newState: typeof state | null = null;

      const update: Update<typeof state, typeof action> = action => state => {
        switch (action.type) {
          case "INCREMENT":
            return { state: { ...state, value: state.value + 1 } };
        }
      };

      const dispatcher = buildWatchedDispatcher(
        () => state,
        (state, f) => {
          newState = state;

          if (f) {
            f();
          }
        },
        update,
      );

      await dispatcher(action);

      expect(newState).toEqual({
        value: 3,
      });

      expect(dispatcher.getActions()).toEqual([action]);
    });

    describe("Chaining", () => {
      it("should return a new state with counter incremented by 2 and value set to 'test'", async () => {
        const incrementAction: Action<"INCREMENT"> = { type: "INCREMENT" };
        const setValueAction: Action<"SET_VALUE"> & { value: string } = {
          type: "SET_VALUE",
          value: "test",
        };

        const state = { counter: 1, value: "" };

        let newState: typeof state | null = null;

        const update: Update<
          typeof state,
          typeof incrementAction | typeof setValueAction
        > = action => state => {
          switch (action.type) {
            case "INCREMENT":
              return { state: { ...state, counter: state.counter + 1 } };
            case "SET_VALUE":
              return { state: { ...state, value: action.value } };
          }
        };

        const dispatcher = buildWatchedDispatcher(
          () => newState || state,
          (state, f) => {
            newState = state;

            if (f) {
              f();
            }
          },
          update,
        );

        await dispatcher(incrementAction);
        await dispatcher(setValueAction);
        await dispatcher(incrementAction);

        expect(newState).toEqual({
          counter: 3,
          value: "test",
        });

        expect(dispatcher.getActions()).toEqual([
          incrementAction,
          setValueAction,
          incrementAction,
        ]);
      });
    });
  });
});
