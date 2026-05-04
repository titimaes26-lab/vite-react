import { F } from "../constants/gameData.js";
import { getPrestigeTier } from "../constants/prestigeData.js";
import { useLang } from "../i18n/index.jsx";
import { useC } from "../contexts/ThemeContext.jsx";

export function PrestigeModal({ prestige, onConfirm, onClose }) {
  const C = useC();
  const { t: tl } = useLang();
  const current = getPrestigeTier(prestige);
  const next    = getPrestigeTier(prestige + 1);

  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.70)",
      zIndex:10010, display:"flex", alignItems:"center", justifyContent:"center", padding:20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:C.surface, borderRadius:22, padding:"32px 28px",
        width:"100%", maxWidth:420, textAlign:"center",
        border:`2px solid ${next.color}55`,
        boxShadow:`0 24px 60px rgba(0,0,0,0.45), 0 0 40px ${next.color}22`,
      }}>

        {/* Icon + title */}
        <div style={{fontSize:56, marginBottom:6}}>{next.icon}</div>
        <div style={{fontSize:22, fontWeight:800, color:next.color, fontFamily:F.title, marginBottom:4}}>
          {tl("prestige.title")}
        </div>
        <div style={{fontSize:13, fontWeight:600, color:C.ink, fontFamily:F.body, marginBottom:20}}>
          {prestige > 0
            ? `${current.icon} ${current.name} → ${next.icon} ${next.name}`
            : `→ ${next.icon} ${next.name}`}
        </div>

        {/* Bonuses */}
        <div style={{display:"flex", gap:10, marginBottom:18}}>
          <div style={{
            flex:1, background:next.color+"14", border:`1.5px solid ${next.color}33`,
            borderRadius:12, padding:"12px 10px",
          }}>
            <div style={{fontSize:22, marginBottom:4}}>⚡</div>
            <div style={{fontSize:20, fontWeight:800, color:next.color, fontFamily:F.title, lineHeight:1}}>
              +{Math.round((next.xpMultiplier - 1) * 100)}%
            </div>
            <div style={{fontSize:10, color:C.muted, fontFamily:F.body, marginTop:4}}>
              {tl("prestige.xpBonus")}
            </div>
          </div>
          <div style={{
            flex:1, background:C.amberP, border:`1.5px solid ${C.amber}33`,
            borderRadius:12, padding:"12px 10px",
          }}>
            <div style={{fontSize:22, marginBottom:4}}>💰</div>
            <div style={{fontSize:20, fontWeight:800, color:C.amber, fontFamily:F.title, lineHeight:1}}>
              +{next.cashReward.toLocaleString()}€
            </div>
            <div style={{fontSize:10, color:C.muted, fontFamily:F.body, marginTop:4}}>
              {tl("prestige.cashReward")}
            </div>
          </div>
        </div>

        {/* Reset / keep summary */}
        <div style={{
          background:C.card, border:`1px solid ${C.border}`,
          borderRadius:12, padding:"12px 14px", marginBottom:22, textAlign:"left",
        }}>
          <div style={{fontSize:11, fontWeight:700, color:C.red, fontFamily:F.body, marginBottom:5}}>
            🔄 {tl("prestige.resets")}
          </div>
          <div style={{fontSize:11, color:C.muted, fontFamily:F.body, lineHeight:1.9}}>
            • {tl("prestige.resetLevel")} &nbsp;·&nbsp; {tl("prestige.resetObjectives")}
          </div>
          <div style={{fontSize:11, fontWeight:700, color:C.green, fontFamily:F.body, marginBottom:5, marginTop:8}}>
            ✅ {tl("prestige.keeps")}
          </div>
          <div style={{fontSize:11, color:C.muted, fontFamily:F.body, lineHeight:1.9}}>
            • {tl("prestige.keepsCash")} &nbsp;·&nbsp; {tl("prestige.keepsEquip")} &nbsp;·&nbsp; {tl("prestige.keepsHistory")}
          </div>
        </div>

        {/* Buttons */}
        <div style={{display:"flex", gap:10}}>
          <button onClick={onClose} style={{
            flex:1, padding:"11px 0", borderRadius:10,
            border:`1.5px solid ${C.border}`, background:"transparent",
            color:C.muted, fontSize:13, fontWeight:600, fontFamily:F.body, cursor:"pointer",
          }}>
            {tl("prestige.cancel")}
          </button>
          <button onClick={() => { onConfirm(); onClose(); }} style={{
            flex:2, padding:"11px 0", borderRadius:10, border:"none",
            background:`linear-gradient(135deg,${next.color},${next.color}bb)`,
            color:"#fff", fontSize:13, fontWeight:800, fontFamily:F.body,
            cursor:"pointer", boxShadow:`0 4px 14px ${next.color}44`,
          }}>
            {next.icon} {tl("prestige.confirm")}
          </button>
        </div>

      </div>
    </div>
  );
}
