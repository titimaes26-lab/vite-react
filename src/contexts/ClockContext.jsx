import { createContext, useContext } from "react";
export const ClockContext = createContext(0);
export const useClockNow = () => useContext(ClockContext);
