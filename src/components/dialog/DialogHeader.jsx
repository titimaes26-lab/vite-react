import { memo } from "react";
import { F } from "../../constants/gameData.js";

export const DialogHeader = memo(function DialogHeader({ line, sp, step, total, textAnim }) {
  return (
    <div style={{
      display:"flex",alignItems:"center",justifyContent:"space-between",
      opacity:textAnim?1:0,
      transform:textAnim?"translateY(0)":"translateY(-4px)",
      transition:"opacity 0.25s ease, transform 0.25s ease",
    }}>
      <div>
        {line.section&&(
          <div style={{fontSize:10,fontWeight:700,color:sp.color+"99",fontFamily:F.title,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:2}}>
            ── {line.section} ──
          </div>
        )}
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:sp.color,boxShadow:`0 0 8px ${sp.color}`,flexShrink:0}}/>
          <span style={{fontSize:12,fontWeight:700,color:sp.color,fontFamily:F.title,letterSpacing:"0.05em"}}>{sp.name}</span>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.35)",fontFamily:F.body}}>— {sp.title}</span>
        </div>
      </div>
      <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",fontFamily:F.body}}>
        {step+1} / {total}
      </div>
    </div>
  );
});
