import { useState, useEffect } from "react";
import { F } from "../../constants/gameData.js";
import { useLang } from "../../i18n/index.jsx";
import { SPEAKERS_FR, SPEAKERS_EN } from "../../constants/dialogData.js";
import { DialogHeader } from "./DialogHeader.jsx";
import { DialogImage } from "./DialogImage.jsx";
import { DialogControls } from "./DialogControls.jsx";

export function DialogScene({ dialogData, ctaLabel = "OK", onDone }) {
  const { lang, t } = useLang();
  const SPEAKERS = lang === "en" ? SPEAKERS_EN : SPEAKERS_FR;

  const [step,     setStep]     = useState(0);
  const [visible,  setVisible]  = useState(false);
  const [textAnim, setTextAnim] = useState(true);
  const [imgKey,   setImgKey]   = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 480);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 480);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    const tm = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(tm);
  }, []);

  useEffect(() => {
    setTextAnim(false);
    const tm = setTimeout(() => setTextAnim(true), 60);
    return () => clearTimeout(tm);
  }, [step]);

  const line   = dialogData[step];
  const sp     = SPEAKERS[line.speaker];
  const isLast = line.isLast || step === dialogData.length - 1;
  const nextSp = !isLast ? SPEAKERS[dialogData[step + 1]?.speaker] : null;

  const next = () => {
    if (isLast) { setVisible(false); setTimeout(onDone, 350); return; }
    if (dialogData[step + 1].speaker !== line.speaker) setImgKey(k => k + 1);
    setStep(s => s + 1);
  };

  const skip = (e) => { e.stopPropagation(); setVisible(false); setTimeout(onDone, 350); };

  return (
    <div onClick={next} style={{position:"fixed",inset:0,zIndex:99999,background:"rgba(8,6,4,0.92)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"12px 12px 16px",opacity:visible?1:0,transition:"opacity 0.35s ease",cursor:"pointer"}}>
      <button onClick={skip} style={{position:"absolute",top:14,right:14,padding:"5px 14px",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:20,color:"rgba(255,255,255,0.6)",fontSize:11,cursor:"pointer",fontFamily:F.body,zIndex:1}}>
        {t("dialog.skip")}
      </button>

      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:860,display:"flex",flexDirection:"column",gap:10}}>
        <DialogHeader line={line} sp={sp} step={step} total={dialogData.length} textAnim={textAnim}/>
        <DialogImage line={line} sp={sp} imgKey={imgKey} isMobile={isMobile} isLast={isLast} textAnim={textAnim}/>

        {line.note&&(
          <div style={{textAlign:"center",fontSize:11,color:"#c8a96a",fontFamily:F.body,fontStyle:"italic",opacity:textAnim?1:0,transition:"opacity 0.35s ease 0.1s"}}>
            ✦ {line.note}
          </div>
        )}

        <DialogControls
          dialogData={dialogData} SPEAKERS={SPEAKERS}
          step={step} sp={sp} nextSp={nextSp}
          isLast={isLast} ctaLabel={ctaLabel}
          onNext={e=>{e.stopPropagation();next();}}/>
      </div>

      <style>{`
        @keyframes introImgIn { from{opacity:0;transform:scale(1.03)} to{opacity:1;transform:scale(1)} }
        @keyframes tapPulse { 0%,100%{opacity:0.45} 50%{opacity:0.9} }
      `}</style>
    </div>
  );
}
