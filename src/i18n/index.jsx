/* ═══════════════════════════════════════════════════════
   src/i18n/index.js
   Système d'internationalisation — FR / EN
═══════════════════════════════════════════════════════ */
import { createContext, useContext, useState, useCallback } from "react";
import { fr } from "./fr.js";
import { en } from "./en.js";

const LANGS = { fr, en };

const LangCtx = createContext({ lang: "fr", setLang: () => {}, t: k => k });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem("lang") || null; } catch { return null; }
  });

  const setLang = useCallback((code) => {
    try { localStorage.setItem("lang", code); } catch {}
    setLangState(code);
  }, []);

  const t = useCallback((key, vars) => {
    const dict = LANGS[lang] || LANGS.fr;
    const val = key.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), dict);
    const str = val !== undefined ? val : key;
    if (!vars) return str;
    return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, v), str);
  }, [lang]);

  return (
    <LangCtx.Provider value={{ lang, setLang, t }}>
      {children}
    </LangCtx.Provider>
  );
}

export function useLang() {
  return useContext(LangCtx);
}
