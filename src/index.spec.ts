// tslint:disable:no-shadowed-variable no-empty

import {
  Action,
  buildDispatcher,
  buildWatchedDispatcher,
  Command,
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

  describe("With Affects", () => {
    describe("Side Effects", () => {
      it("should call the fake command, dispatch the actions, and not change the state", async () => {
        const fetchAction: Action<"FETCH_STUFF"> = { type: "FETCH_STUFF" };
        const fetchSuccessAction: Action<"FETCH_STUFF_SUCCESS"> = {
          type: "FETCH_STUFF_SUCCESS",
        };

        const command: Command<typeof fetchSuccessAction> = jest.fn(async () =>
          Promise.resolve(fetchSuccessAction),
        );

        const state = { fakeKey: "fakeValue" };

        let newState: typeof state | null = null;

        const update: Update<
          typeof state,
          typeof fetchAction | typeof fetchSuccessAction
        > = action => state => {
          switch (action.type) {
            case "FETCH_STUFF":
              return { commands: [command], state };
            default:
              return { state };
          }
        };

        const dispatcher = buildWatchedDispatcher(
          () => newState || state,
          (_, f) => {
            if (f) {
              f();
            }
          },
          update,
          (_, getState) => {
            newState = getState();
          },
        );

        await dispatcher(fetchAction);

        expect(command).toHaveBeenCalled();

        expect(dispatcher.getActions()).toEqual([
          fetchAction,
          fetchSuccessAction,
        ]);

        expect(newState).toBe(state);
      });

      describe("Chaining", () => {
        it("should call the fake commands, dispatch the actions, and not change the state", async () => {
          const fetchAction: Action<"FETCH_STUFF"> = { type: "FETCH_STUFF" };
          const fetchSuccessAction: Action<"FETCH_STUFF_SUCCESS"> = {
            type: "FETCH_STUFF_SUCCESS",
          };
          const fetchOtherAction: Action<"FETCH_ANOTHER_STUFF"> = {
            type: "FETCH_ANOTHER_STUFF",
          };
          const fetchOtherSuccessAction: Action<
            "FETCH_ANOTHER_STUFF_SUCCESS"
          > = { type: "FETCH_ANOTHER_STUFF_SUCCESS" };

          const commandFetchSuccess: Command<
            typeof fetchSuccessAction
          > = jest.fn(async () => Promise.resolve(fetchSuccessAction));

          const commandFetchOther: Command<typeof fetchOtherAction> = jest.fn(
            async () => Promise.resolve(fetchOtherAction),
          );

          const commandFetchOtherSuccess: Command<
            typeof fetchOtherSuccessAction
          > = jest.fn(async () => Promise.resolve(fetchOtherSuccessAction));

          const state = { fakeKey: "fakeValue" };

          let newState: typeof state | null = null;

          const update: Update<
            typeof state,
            | typeof fetchAction
            | typeof fetchSuccessAction
            | typeof fetchOtherAction
            | typeof fetchOtherSuccessAction
          > = action => state => {
            switch (action.type) {
              case "FETCH_STUFF":
                return { commands: [commandFetchSuccess], state };
              case "FETCH_STUFF_SUCCESS":
                return { commands: [commandFetchOther], state };
              case "FETCH_ANOTHER_STUFF":
                return { commands: [commandFetchOtherSuccess], state };
              default:
                return { state };
            }
          };

          const dispatcher = buildWatchedDispatcher(
            () => newState || state,
            (_, f) => {
              if (f) {
                f();
              }
            },
            update,
            (_, getState) => {
              newState = getState();
            },
          );

          await dispatcher(fetchAction);

          expect(commandFetchSuccess).toHaveBeenCalled();
          expect(commandFetchOther).toHaveBeenCalled();
          expect(commandFetchOtherSuccess).toHaveBeenCalled();

          expect(dispatcher.getActions()).toEqual([
            fetchAction,
            fetchSuccessAction,
            fetchOtherAction,
            fetchOtherSuccessAction,
          ]);

          expect(newState).toBe(state);
        });
      });
    });

    describe("Update with Side Effects", () => {
      it("should work", () => {
        expect(true).toBe(true);
      });
    });
  });
});
