import { Action, CommandBuilder } from "./index";
import { SimpleStore, Timer } from "./utils";

export type FetchBodyMethod =
  | "arrayBuffer"
  | "blob"
  | "json"
  | "text"
  | "formData";

const timerStore = new SimpleStore(Timer);

export const delay = (ms: number): CommandBuilder => <Actions extends Action>(
  actionCreator: (arg: null) => Actions | void,
) => async () =>
  new Promise<Actions | void>(resolve => {
    window.setTimeout(() => resolve(actionCreator(null)), ms);
  });

export const getDate = (): CommandBuilder<Date> => actionCreator => async () =>
  actionCreator(new Date());

export const debounce = (ms: number, id: symbol): CommandBuilder => {
  const timer = timerStore.get(id);

  return <Actions extends Action>(
    actionCreator: (arg: null) => Actions | void,
  ) => async () =>
    new Promise<Actions | void>(resolve => {
      if (timer.compare(Date.now()) < ms) {
        timer.start(ms, () => {
          resolve(actionCreator(null));
          timer.reset();
        });

        return;
      }
    });
};

export const ajax = <Schema extends object>(
  input: RequestInfo,
  method: FetchBodyMethod,
  init?: RequestInit,
): CommandBuilder<{
  data?: Schema;
  error?: Error;
}> => actionCreator => async () => {
  try {
    const response = await fetch(input, init);
    const data: Schema = await response[method]();

    return actionCreator({ data });
  } catch (error) {
    return actionCreator({ error });
  }
};
