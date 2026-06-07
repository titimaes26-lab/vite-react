import { memo } from "react";
import { F } from "../../constants/gameData.js";
import { useLang } from "../../i18n/index.jsx";

export const DialogImage = memo(function DialogImage({ line, sp, imgKey, isMobile, isLast, textAnim }) {
  const { t } = useLang();
  const bub = sp.bubble;
  return (
    <div style={{position:"relative",width:"100%",paddingBottom:"56.25%",borderRadius:16,overflow:"hidden",background:"#111"}}>
      <img
        key={`${line.speaker}-${imgKey}`}
        src={sp.img} alt={sp.name}
        style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",borderRadius:16,animation:"introImgIn 0.32s ease both"}}
      />
      <div style={{position:"absolute",left:bub.left,top:bub.top,width:bub.width,height:bub.height,display:"flex",alignItems:"center",justifyContent:"center",padding:"1% 5% 9%",pointerEvents:"none"}}>
        <p style={{margin:0,fontSize:"clamp(10px, 1.55vw, 14px)",color:"#1a120a",fontFamily:F.body,lineHeight:1.5,textAlign:"center",fontWeight:500,opacity:textAnim?1:0,transform:textAnim?"translateY(0)":"translateY(5px)",transition:"opacity 0.28s ease, transform 0.28s ease"}}>
          {(isMobile&&line.short)?line.short:line.text}
        </p>
      </div>
      <div style={{position:"absolute",bottom:10,right:14,fontSize:11,color:"rgba(255,255,255,0.45)",fontFamily:F.body,animation:"tapPulse 2s ease-in-out infinite"}}>
        {!isLast&&t("dialog.tapContinue")}
      </div>
    </div>
  );
});
