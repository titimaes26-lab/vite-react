/* ═══════════════════════════════════════════════════════
   src/views/HelpModal.jsx
   Extrait du monolithe restaurant-manager.jsx
   Dépendances déclarées dans les imports ci-dessous.
═══════════════════════════════════════════════════════ */
import { useState } from "react";
import { C, F } from "../constants/gameData";
import { HELP_SECTIONS } from "../constants/helpContent.js";

export function HelpModal({onClose}){
  const [sec,setSec]=useState(0);
  const s=HELP_SECTIONS[sec];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",
      zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={onClose}>
      <div style={{background:C.surface,borderRadius:20,width:"100%",maxWidth:780,
        maxHeight:"88vh",display:"flex",flexDirection:"column",overflow:"hidden",
        boxShadow:"0 24px 80px rgba(0,0,0,0.25)"}}
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"20px 24px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:38,height:38,background:C.green,borderRadius:10,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
              ❓
            </div>
            <div>
              <div style={{fontSize:17,fontWeight:700,color:C.ink,fontFamily:F.title}}>Guide utilisateur</div>
              <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>Toutes les fonctionnalités expliquées</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:C.border,border:"none",borderRadius:8,
            width:32,height:32,cursor:"pointer",fontSize:16,color:C.muted,
            display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        <div style={{display:"flex",flex:1,overflow:"hidden"}}>
          {/* Sidebar */}
          <div style={{width:170,borderRight:`1px solid ${C.border}`,padding:"12px 8px",
            display:"flex",flexDirection:"column",gap:3,flexShrink:0,overflowY:"auto",
            background:C.bg}}>
            {HELP_SECTIONS.map((hs,i)=>(
              <button key={i} onClick={()=>setSec(i)} style={{
                background:sec===i?hs.color+"18":"transparent",
                border:`1.5px solid ${sec===i?hs.color+"44":"transparent"}`,
                borderRadius:9,padding:"9px 11px",cursor:"pointer",
                display:"flex",alignItems:"center",gap:9,
                color:sec===i?hs.color:C.muted,
                fontWeight:sec===i?700:400,
                fontSize:12,fontFamily:F.body,textAlign:"left",
                transition:"all 0.15s"}}>
                <span style={{fontSize:16,flexShrink:0}}>{hs.icon}</span>
                <span>{hs.title}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{flex:1,padding:"24px 28px",overflowY:"auto"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
              <span style={{fontSize:26}}>{s.icon}</span>
              <div style={{fontSize:20,fontWeight:700,color:s.color,fontFamily:F.title}}>{s.title}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {s.items.map((it,i)=>(
                <div key={i} style={{background:C.card,border:`1.5px solid ${s.color}22`,
                  borderLeft:`4px solid ${s.color}`,borderRadius:10,padding:"14px 16px"}}>
                  <div style={{fontSize:13,fontWeight:700,color:s.color,
                    fontFamily:F.body,marginBottom:6}}>
                    {it.q}
                  </div>
                  <div style={{fontSize:12,color:C.ink,fontFamily:F.body,
                    lineHeight:1.6}}>
                    {it.a}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}