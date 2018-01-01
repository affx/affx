import {
  Action,
  ActionCreator,
  createDispatcher,
  createLogWatcher,
  Update,
} from "./index";
import { mapCommands, mapDispatcher } from "./mappers";

describe("Mappers", () => {
  it(`should create a new dispatcher that, when called, dispatch an action built with
      the provided action creator, and call the update function accordingly`, async () => {
    let receivedAction: any;

    type FakeChildActions = Action<"CHILD_ACTION_1"> | Action<"CHILD_ACTION_1">;

    const fakeChildAction: Action<"CHILD_ACTION_1"> = {
      type: "CHILD_ACTION_1",
    };

    const parentState = { child1: {}, child2: {} };

    interface FakeParentAction extends Action<"PARENT_ACTION"> {
      action: FakeChildActions;
    }

    const parentActionCreator: ActionCreator<
      FakeChildActions,
      FakeParentAction
    > = action => ({
      action,
      type: "PARENT_ACTION",
    });

    const logWatcher = createLogWatcher<typeof parentState, FakeParentAction>();

    const update: Update<
      typeof parentState,
      FakeParentAction
    > = action => state => {
      receivedAction = action;

      return { state };
    };

    const dispatcher = createDispatcher(
      () => parentState,
      // tslint:disable-next-line:no-empty
      () => {},
      update,
      logWatcher,
    );

    const childDispatcher = mapDispatcher(parentActionCreator, dispatcher);

    await childDispatcher({ type: "CHILD_ACTION_1" });

    expect(receivedAction).toEqual(parentActionCreator(fakeChildAction));

    expect(logWatcher.getActionsTypes()).toEqual(["PARENT_ACTION"]);
  });

  describe("Chaining", () => {
    it(`should create a new dispatcher that, when called, dispatch an action built with
       the provided action creator, and call the update function accordingly, including commands`, async () => {
      type FakeChildActions =
        | Action<"CHILD_ACTION_1">
        | Action<"CHILD_ACTION_2">;

      const fakeChildAction: Action<"CHILD_ACTION_1"> = {
        type: "CHILD_ACTION_1",
      };

      const parentState = { child1: { counter: 1 }, child2: { counter: 3 } };

      let newState: typeof parentState | null = null;

      interface FakeParentAction extends Action<"PARENT_ACTION"> {
        action: FakeChildActions;
      }

      const parentActionCreator: ActionCreator<
        FakeChildActions,
        FakeParentAction
      > = action => ({
        action,
        type: "PARENT_ACTION",
      });

      const childUpdate: Update<
        typeof parentState.child1,
        FakeChildActions
      > = action => state => {
        switch (action.type) {
          case "CHILD_ACTION_1":
            return {
              commands: [async () => ({ type: "CHILD_ACTION_2" })],
              state: { ...state, counter: state.counter + 1 },
            };

          case "CHILD_ACTION_2":
            return {
              state: { ...state, counter: state.counter + 3 },
            };

          default:
            return { state };
        }
      };

      const logWatcher = createLogWatcher<
        typeof parentState,
        FakeParentAction
      >();

      const update: Update<
        typeof parentState,
        FakeParentAction
      > = action => state => {
        switch (action.type) {
          case "PARENT_ACTION": {
            const { commands, state: child1 } = childUpdate(action.action)(
              state.child1,
            );

            return !commands
              ? { state: { ...state, child1 } }
              : {
                  commands: mapCommands(parentActionCreator, commands),
                  state: { ...state, child1 },
                };
          }

          default:
            return { state };
        }
      };

      const dispatcher = createDispatcher(
        () => newState || parentState,
        (state, f) => {
          newState = state;

          if (f) {
            f();
          }
        },
        update,
        logWatcher,
      );

      const childDispatcher = mapDispatcher(parentActionCreator, dispatcher);

      await childDispatcher({ type: "CHILD_ACTION_1" });

      expect(
        logWatcher.getActions().map(action => action && action.action.type),
      ).toEqual(["CHILD_ACTION_1", "CHILD_ACTION_2"]);

      expect(newState).toEqual({
        child1: { counter: 5 },
        child2: { counter: 3 },
      });
    });
  });
});
