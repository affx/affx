import { Action, ActionCreator, Command, Dispatcher } from "./index";

export type CommandsMapper = <
  Actions extends Action,
  MappedActions extends Action
>(
  actionCreator: ActionCreator<MappedActions, Actions>,
  commands: ReadonlyArray<Command<MappedActions>>,
) => ReadonlyArray<Command<Actions>>;

export type DispatcherMapper = <
  Actions extends Action,
  MappedActions extends Action
>(
  actionCreator: ActionCreator<MappedActions, Actions>,
  dispatcher: Dispatcher<Actions>,
) => Dispatcher<MappedActions>;

export const mapCommands: CommandsMapper = (actionCreator, commands) => {
  return commands.map(command => async () => {
    const action = await command();

    if (action) {
      return actionCreator(action);
    }
  });
};

export const mapDispatcher: DispatcherMapper = (
  actionCreator,
  dispatcher,
) => async action => {
  if (action) {
    await dispatcher(actionCreator(action));
  }
};
