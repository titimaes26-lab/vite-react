import { createContext, useContext, useState, useCallback } from "react";
import { C as C_LIGHT } from "../constants/gameData.js";

export const C_DARK = {
  bg:      "#1c1915",
  surface: "#242118",
  surface2:"#2a261d",
  card:    "#2e2b22",
  border:  "#423e35",
  green:   "#3dba77",
  greenL:  "#4ed086",
  greenP:  "#182e22",
  terra:   "#e07640",
  terraP:  "#321b0e",
  terraL:  "#e88a55",
  navy:    "#6aa3d5",
  navyP:   "#13253a",
  ink:     "#f0ebe3",
  ink2:    "#d4cdc5",
  muted:   "#9a8a75",
  red:     "#e05050",
  redP:    "#2e1515",
  amber:   "#d48c20",
  amberP:  "#2e2108",
  purple:  "#9b6dd6",
  purpleP: "#1e1432",
  white:   "#ffffff",
  shadow1: "rgba(0,0,0,0.20)",
  shadow2: "rgba(0,0,0,0.35)",
  shadow3: "rgba(0,0,0,0.50)",
};

const ThemeContext = createContext({ C: C_LIGHT, dark: false, toggle: () => {} });

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("dark_mode") === "1"; } catch { return false; }
  });

  const toggle = useCallback(() => {
    setDark(d => {
      const next = !d;
      try { localStorage.setItem("dark_mode", next ? "1" : "0"); } catch {}
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ C: dark ? C_DARK : C_LIGHT, dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useC    = () => useContext(ThemeContext).C;
export const useDark = () => {
  const { dark, toggle } = useContext(ThemeContext);
  return { dark, toggle };
};
