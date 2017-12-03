export interface SimpleEvent {
  preventDefault(): void;
  stopPropagation(): void;
}

export interface Action<T extends string = string> {
  type: T;
}

export type Command<Actions> = () => Promise<Actions | void>;

export type CommandBuilder<T = null> = <Actions extends Action>(
  actionCreator: (payload: T) => Actions | void,
) => Command<Actions>;

export interface Operation<State extends object, Actions extends Action> {
  state: State;
  commands?: Array<Command<Actions>>;
}

export type Reducer<State extends object, Actions extends Action> = (
  action: Actions,
) => (state: State) => Operation<State, Actions>;

export interface DispatcherOptions {
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export type SimpleDispatcher<Actions extends Action> = (
  action: Actions,
) => void;

export interface Dispatcher<Actions extends Action>
  extends SimpleDispatcher<Actions> {
  always<Event extends SimpleEvent>(
    action: Actions,
    options?: DispatcherOptions,
  ): (event: Event) => void;
}

export interface Reduceable<Actions extends Action> {
  dispatch: Dispatcher<Actions>;
}

const defaultDispatcherOptions: DispatcherOptions = {
  preventDefault: false,
  stopPropagation: false,
};

const addToolsToDispatcher = <Actions extends Action>(
  dispatcher: SimpleDispatcher<Actions>,
): Dispatcher<Actions> => {
  return Object.assign(dispatcher, {
    always<Event extends SimpleEvent>(
      action: Actions,
      options: DispatcherOptions = defaultDispatcherOptions,
    ) {
      return (event: Event) => {
        if (options.preventDefault) {
          event.preventDefault();
        }

        if (options.stopPropagation) {
          event.stopPropagation();
        }

        dispatcher(action);
      };
    },
  });
};

export const buildDispatcher = <State extends object, Actions extends Action>(
  getState: () => State,
  setState: (state: State, f?: () => void) => void,
  reducer: Reducer<State, Actions>,
): Dispatcher<Actions> =>
  addToolsToDispatcher<Actions>(async function dispatcher(
    action: Actions | void,
  ): Promise<void | void[]> {
    if (!action) {
      return;
    }

    const state = getState();

    const operation = reducer(action)(state);

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
  });
