export { mapCommands, mapDispatcher } from "./mappers";

export interface Action<T extends string = string> {
  type: T;
}

export type Command<Actions extends Action> = () => Promise<Actions | void>;

export type ActionCreator<T, Actions extends Action> = (
  payload: T,
) => Actions | void;

export type FailableActionCreator<T, Actions extends Action> = (
  error: Error | null,
  payload?: T,
) => Actions | void;

export type CommandCreator<T = null> = <Actions extends Action>(
  actionCreator: ActionCreator<T, Actions>,
) => Command<Actions>;

export type FailableCommandCreator<T = null> = <Actions extends Action>(
  failableActionCreator: FailableActionCreator<T, Actions>,
) => Command<Actions>;

export interface Operation<State extends object, Actions extends Action> {
  state: State;
  commands?: ReadonlyArray<Command<Actions>> | void;
}

export type Update<State extends object, Actions extends Action> = (
  action: Actions,
) => (state: State) => Operation<State, Actions>;

export type Watcher<State extends object, Actions extends Action> = (
  action: Actions | void,
  getState: () => State,
) => void;

export type Dispatcher<Actions extends Action> = (
  action: Actions | void,
) => Promise<void>;

export const createDispatcher = <State extends object, Actions extends Action>(
  getState: () => State,
  setState: (state: State, f?: () => void) => void,
  update: Update<State, Actions>,
  watcher?: Watcher<State, Actions>,
): Dispatcher<Actions> =>
  async function dispatcher(action: Actions | void): Promise<void> {
    if (watcher) {
      watcher(action, getState);
    }

    if (!action) {
      return;
    }

    const state = getState();

    const operation = update(action)(state);

    // NoOp
    if (!operation.commands && state === operation.state) {
      return;
    }

    // Update
    if (!operation.commands && state !== operation.state) {
      return new Promise<void>(resolve => {
        setState(operation.state, () => {
          resolve();
        });
      });
    }

    // SideEffects
    if (operation.commands && state === operation.state) {
      await Promise.all(
        operation.commands.map(async command => {
          dispatcher(await command());
        }),
      );

      return;
    }

    // UpdateWithSideEffects
    if (operation.commands && state !== operation.state) {
      return new Promise<void>((resolve, reject) => {
        setState(operation.state, async () => {
          try {
            await Promise.all(
              operation.commands!.map(async command => {
                dispatcher(await command());
              }),
            );

            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    }
  };

// The LogWatcher is useful for testing purposes
export interface LogWatcher<State extends object, Actions extends Action>
  extends Watcher<State, Actions> {
  getActions(): ReadonlyArray<Actions | void>;
  getActionsTypes(): ReadonlyArray<Actions["type"]>;
}

export const createLogWatcher = <
  State extends object,
  Actions extends Action
>(): LogWatcher<State, Actions> => {
  const actions: Array<Actions | void> = [];

  return Object.assign(
    (action: Actions | void) => {
      actions.push(action);
    },
    {
      getActions(): ReadonlyArray<Actions | void> {
        return actions;
      },
      getActionsTypes(): ReadonlyArray<Actions["type"]> {
        return actions.reduce(
          (acc, action) => {
            if (!action) {
              return acc;
            }

            return [...acc, action.type];
          },
          [] as ReadonlyArray<Actions["type"]>,
        );
      },
    },
  );
};
