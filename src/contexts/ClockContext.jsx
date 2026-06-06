import { createContext, useContext } from "react";
export const ClockContext = createContext(Date.now());
export const useClockNow = () => useContext(ClockContext);
