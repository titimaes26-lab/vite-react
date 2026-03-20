/* ═══════════════════════════════════════════════════════
   src/components/ui/Btn.jsx
   Bouton polymorphe — 7 variantes visuelles.

   Props :
     children  {ReactNode}
     onClick   {Function?}
     v         {"primary"|"secondary"|"terra"|"ghost"|"danger"|"navy"|"disabled"}
     sm        {boolean}   taille réduite
     disabled  {boolean}
     full      {boolean}   width: 100%
     icon      {ReactNode?} affiché avant le label
═══════════════════════════════════════════════════════ */
import { C, F } from "./theme";

const VARIANTS = {
  primary  : { bg: C.green,       fg: "#fff",   bdr: C.green   },
  secondary: { bg: "transparent", fg: C.green,  bdr: C.green   },
  terra    : { bg: C.terra,       fg: "#fff",   bdr: C.terra   },
  ghost    : { bg: "transparent", fg: C.muted,  bdr: C.border  },
  danger   : { bg: C.red,        fg: "#fff",   bdr: C.red     },
  navy     : { bg: C.navy,        fg: "#fff",   bdr: C.navy    },
  amber    : { bg: C.amber,       fg: "#fff",   bdr: C.amber   },
  disabled : { bg: C.border,      fg: C.muted,  bdr: C.border  },
};

export const Btn = ({
  children, onClick, v = "primary",
  sm = false, disabled = false, full = false, icon,
}) => {
  const vv = VARIANTS[v] ?? VARIANTS.primary;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background    : vv.bg,
        color         : vv.fg,
        border        : `1.5px solid ${vv.bdr}`,
        borderRadius  : 9,
        padding       : sm ? "5px 13px" : "9px 20px",
        fontSize      : sm ? 11 : 13,
        fontWeight    : 600,
        cursor        : disabled ? "not-allowed" : "pointer",
        opacity       : disabled ? 0.45 : 1,
        fontFamily    : F.body,
        width         : full ? "100%" : undefined,
        display       : "inline-flex",
        alignItems    : "center",
        justifyContent: "center",
        gap           : 6,
        transition    : "opacity 0.15s",
      }}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};
