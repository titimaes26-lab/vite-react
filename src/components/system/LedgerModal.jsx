/* ═══════════════════════════════════════════════════════
   src/components/system/LedgerModal.jsx
   Extrait du monolithe restaurant-manager.jsx
   Modal affichant l'historique des transactions (grand livre).
═══════════════════════════════════════════════════════ */
import { C, F, Z } from "../../constants/gameData";
import { useLang } from "../../i18n/index.jsx";

export function LedgerModal({ onClose, cash, transactions }) {
  const { t: tl } = useLang();

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,
      background:"rgba(0,0,0,0.45)",zIndex:Z.ledger,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div onClick={e=>e.stopPropagation()} className="modal-inner" style={{background:C.surface,borderRadius:18,
        width:"100%",maxWidth:560,maxHeight:"80vh",display:"flex",flexDirection:"column",
        boxShadow:"0 24px 60px rgba(0,0,0,0.25)"}}>
        {/* Header */}
        <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.border}`,
          display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <div style={{fontSize:17,fontWeight:700,color:C.ink,fontFamily:F.title}}>{tl("app.ledger")}</div>
            <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:2}}>
              {tl("app.balance")} <span style={{fontWeight:700,color:cash<200?C.red:C.green}}>
                {cash.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{
            background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,
            width:44,height:44,cursor:"pointer",fontSize:18,color:C.muted,
            display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        {/* Summary row */}
        {(()=>{
          const totalIn=transactions.filter(t=>t.type==="revenu").reduce((s,t)=>s+t.amount,0);
          const totalOut=transactions.filter(t=>t.type!=="revenu").reduce((s,t)=>s+t.amount,0);
          return(
            <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
              {[
                {label:tl("app.revenue"),val:totalIn,c:C.green,bg:C.greenP,icon:"📈"},
                {label:tl("app.expenses"),val:totalOut,c:C.red,bg:C.redP,icon:"📉"},
                {label:tl("app.result"),val:totalIn-totalOut,c:totalIn-totalOut>=0?C.green:C.red,bg:totalIn-totalOut>=0?C.greenP:C.redP,icon:"⚖️"},
              ].map(s=>(
                <div key={s.label} style={{flex:1,background:s.bg,padding:"10px 14px",textAlign:"center",
                  borderRight:`1px solid ${C.border}`}}>
                  <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:2}}>{s.icon} {s.label}</div>
                  <div style={{fontSize:14,fontWeight:700,color:s.c,fontFamily:F.title}}>
                    {s.val>=0?"+":""}{s.val.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
        {/* Transaction list */}
        <div style={{overflowY:"auto",flex:1,padding:"8px 0"}}>
          {transactions.length===0?(
            <div style={{padding:24,textAlign:"center",color:C.muted,fontFamily:F.body,fontSize:13}}>
              {tl("app.noTransactions")}
            </div>
          ):transactions.map(tx=>{
            const isIn=tx.type==="revenu";
            const typeColors={revenu:C.green,achat:C.terra,salaire:C.navy};
            const typeIcons={revenu:"💶",achat:"🛒",salaire:"💸"};
            const c=typeColors[tx.type]||C.muted;
            const hm=tx.gameTime??"—";
            return(
              <div key={tx.id} style={{display:"flex",alignItems:"flex-start",gap:12,
                padding:"10px 22px",borderBottom:`1px solid ${C.border}11`}}>
                <div style={{width:32,height:32,background:c+"18",border:`1px solid ${c}33`,
                  borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:15,flexShrink:0}}>
                  {typeIcons[tx.type]||"💰"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.ink,fontFamily:F.body,
                    whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                    {tx.label}
                  </div>
                  <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:2}}>
                    {hm} · {tx.type}
                  </div>
                </div>
                <div style={{fontSize:13,fontWeight:700,color:isIn?C.green:C.red,
                  fontFamily:F.title,flexShrink:0}}>
                  {isIn?"+":"-"}{tx.amount.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
