import { createContext, useContext } from 'react';

export const NowContext = createContext<number | null>(null);

export function useNow() {
  return useContext(NowContext);
}
