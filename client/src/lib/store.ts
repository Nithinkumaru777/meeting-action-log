import { useSyncExternalStore } from 'react';

export type SetState<T> = (
  partial: Partial<T> | ((state: T) => Partial<T>)
) => void;

export interface StoreApi<T> {
  getState: () => T;
  setState: SetState<T>;
  subscribe: (listener: () => void) => () => void;
  (): T;
}

export function createStore<T extends object>(
  initializer: (set: SetState<T>, get: () => T) => T
): StoreApi<T> {
  let state: T;
  const listeners = new Set<() => void>();

  const setState: SetState<T> = (partial) => {
    const nextPartial = typeof partial === 'function' ? partial(state) : partial;
    const nextState = Object.assign({}, state, nextPartial);
    if (!Object.is(nextState, state)) {
      state = nextState;
      listeners.forEach((l) => l());
    }
  };

  const getState = (): T => state;

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  state = initializer(setState, getState);

  const useStore = (): T => useSyncExternalStore(subscribe, getState, getState);

  return Object.assign(useStore, {
    getState,
    setState,
    subscribe,
  });
}
