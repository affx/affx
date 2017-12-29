export interface Action<T extends string = string> {
  type: T;
}

export type Command<Actions> = () => Promise<Actions | void>;

export type ActionCreator<T, Actions> = (payload: T) => Actions | void;

export type FailableActionCreator<T, Actions> = (
  payload: { data?: T; error?: Error },
) => Actions | void;

export type CommandBuilder<T = null> = <Actions extends Action>(
  actionCreator: ActionCreator<T, Actions>,
) => Command<Actions>;

export type FailableCommandBuilder<T = null> = <Actions extends Action>(
  failableActionCreator: FailableActionCreator<T, Actions>,
) => Command<Actions>;

export interface Operation<State extends object, Actions extends Action> {
  state: State;
  commands?: Array<Command<Actions>>;
}

export type Update<State extends object, Actions extends Action> = (
  action: Actions,
) => (state: State) => Operation<State, Actions>;

export type Dispatcher<Actions extends Action> = (action: Actions) => void;

export interface Updatable<Actions extends Action> {
  dispatch: Dispatcher<Actions>;
}

export const buildDispatcher = <State extends object, Actions extends Action>(
  getState: () => State,
  setState: (state: State, f?: () => void) => void,
  update: Update<State, Actions>,
): Dispatcher<Actions> =>
  async function dispatcher(action: Actions | void): Promise<void | void[]> {
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
      return await Promise.all(
        operation.commands.map(async effect => {
          dispatcher(await effect());
        }),
      );
    }

    // UpdateWithSideEffects
    if (operation.commands && state !== operation.state) {
      return new Promise<void>((resolve, reject) => {
        setState(operation.state, async () => {
          try {
            await Promise.all(
              operation.commands!.map(async effect => {
                dispatcher(await effect());
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
