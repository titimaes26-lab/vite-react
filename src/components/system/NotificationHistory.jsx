/* ═══════════════════════════════════════════════════════
   src/components/system/NotificationHistory.jsx
   Extrait du monolithe restaurant-manager.jsx
   Panneau latéral affichant l'historique des notifications.
═══════════════════════════════════════════════════════ */
import { F } from "../../constants/gameData";
import { useC } from "../../contexts/ThemeContext.jsx";

export function NotificationHistory({ onClose, toastHistory, setToastHistory }) {
  const C = useC();
  return (
    <div onClick={onClose}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:2000,
        display:"flex",alignItems:"flex-start",justifyContent:"flex-end",padding:16}}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:18,
          width:"100%",maxWidth:400,maxHeight:"80vh",display:"flex",flexDirection:"column",
          boxShadow:"0 20px 60px rgba(0,0,0,0.2)",marginTop:8}}>

        {/* Header */}
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,
          display:"flex",justifyContent:"space-between",alignItems:"center",
          position:"sticky",top:0,background:C.surface,borderRadius:"18px 18px 0 0",zIndex:1}}>
          <div style={{fontSize:14,fontWeight:700,color:C.ink,fontFamily:F.title,display:"flex",alignItems:"center",gap:8}}>
            🔔 Notifications
            <span style={{fontSize:10,color:C.muted,fontFamily:F.body,fontWeight:500}}>
              {toastHistory.length} au total
            </span>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {toastHistory.length>0&&(
              <button onClick={()=>setToastHistory([])} style={{
                fontSize:10,color:C.muted,background:"none",border:`1px solid ${C.border}`,
                borderRadius:6,padding:"3px 8px",cursor:"pointer",fontFamily:F.body}}>
                Effacer
              </button>
            )}
            <button onClick={onClose} style={{
              background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,
              width:28,height:28,cursor:"pointer",fontSize:14,color:C.muted,
              display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </div>
        </div>

        {/* Liste */}
        <div style={{overflowY:"auto",flex:1,padding:"8px 0"}}>
          {toastHistory.length===0?(
            <div style={{textAlign:"center",padding:"40px 20px",color:C.muted,fontFamily:F.body,fontSize:12}}>
              Aucune notification
            </div>
          ):toastHistory.map(t=>(
            <div key={t.id} style={{
              padding:"10px 18px",borderBottom:`1px solid ${C.border}22`,
              display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{width:32,height:32,borderRadius:9,flexShrink:0,
                background:(t.color||C.green)+"18",border:`1px solid ${(t.color||C.green)}33`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
                {t.icon||"🔔"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.body,
                  whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                  {t.title}
                </div>
                {t.msg&&<div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:2,
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {t.msg}
                </div>}
              </div>
              <div style={{fontSize:9,color:C.muted,fontFamily:F.body,flexShrink:0,whiteSpace:"nowrap"}}>
                {t.at}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
