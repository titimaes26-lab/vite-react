import { memo } from "react";
import { C, F } from "../../constants/gameData.js";
import { useLang } from "../../i18n/index.jsx";

export const DialogControls = memo(function DialogControls({
  dialogData, SPEAKERS, step, sp, nextSp, isLast, ctaLabel, onNext,
}) {
  const { t } = useLang();
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0 2px",marginTop:2}}>
      <div style={{display:"flex",gap:4,alignItems:"center"}}>
        {dialogData.map((d, i) => {
          const isCurrent = i === step;
          const isDone    = i < step;
          const dot       = SPEAKERS[d.speaker];
          return (
            <div key={i} style={{width:isCurrent?16:6,height:6,borderRadius:99,background:isCurrent?dot.color:isDone?dot.color+"66":"rgba(255,255,255,0.18)",transition:"all 0.3s ease"}}/>
          );
        })}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        {nextSp&&nextSp.name!==sp.name&&(
          <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",fontFamily:F.body}}>
            {t("dialog.nextSpeaker",{name:nextSp.name})}
          </div>
        )}
        <button onClick={onNext} style={{padding:"11px 28px",background:isLast?`linear-gradient(135deg,${C.green},#2d7a50)`:sp.color,border:"none",borderRadius:10,color:"#fff",fontSize:14,fontWeight:700,fontFamily:F.body,cursor:"pointer",boxShadow:`0 4px 18px ${isLast?C.green:sp.color}55`,transition:"background 0.3s, box-shadow 0.3s",letterSpacing:"0.01em"}}>
          {isLast?`✅ ${ctaLabel}`:t("dialog.next")}
        </button>
      </div>
    </div>
  );
});
