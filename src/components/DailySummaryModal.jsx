/* ═══════════════════════════════════════════════════════
   src/components/DailySummaryModal.jsx
   Résumé de fin de journée.
═══════════════════════════════════════════════════════ */
import { C, F } from "../constants/gameData.js";

export function DailySummaryModal({ onClose, dailyStats, objStats, servers, transactions, isRecord }) {
  const today      = dailyStats[dailyStats.length - 1] || { served: 0, lost: 0, revenue: 0, date: "" };
  const totalClients = today.served + today.lost;
  const rate       = totalClients > 0 ? Math.round((today.served / totalClients) * 100) : 0;
  const rateColor  = rate >= 80 ? C.green : rate >= 50 ? C.amber : C.red;

  const bestSrv = [...servers].sort((a, b) => b.totalXp - a.totalXp)[0];

  const dishCount = {};
  transactions.filter(t => t.type === "revenu" && t.label.includes("×")).forEach(t => {
    const m = t.label.match(/(\d+)× ([^,)]+)/g);
    if (m) m.forEach(s => {
      const [, q, n] = s.match(/(\d+)× (.+)/);
      dishCount[n] = (dishCount[n] || 0) + parseInt(q);
    });
  });
  const topDish = Object.entries(dishCount).sort((a, b) => b[1] - a[1])[0];

  const nextRevTarget = [500, 1000, 2000, 5000, 10000].find(t => t > objStats.totalRevenue) || 10000;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:10050,
      display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:22,width:"100%",maxWidth:460,
        boxShadow:"0 32px 80px rgba(0,0,0,0.35)",overflow:"hidden",
        animation:"popIn 0.4s ease"}}>

        <div style={{background:`linear-gradient(135deg,${C.green},${C.greenL})`,
          padding:"24px 28px 20px",textAlign:"center",position:"relative"}}>
          {isRecord && (
            <div style={{position:"absolute",top:12,right:16,
              background:"#f5d878",color:"#7a5a00",borderRadius:20,
              padding:"3px 10px",fontSize:10,fontWeight:800,letterSpacing:"0.06em"}}>
              🏆 RECORD !
            </div>
          )}
          <div style={{fontSize:40,marginBottom:8}}>📊</div>
          <div style={{fontSize:22,fontWeight:800,color:"#fff",fontFamily:F.title}}>
            Bilan de la journée
          </div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.75)",fontFamily:F.body,marginTop:4}}>
            {today.day!=null?`Jour ${today.day}`:""}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:0,
          borderBottom:`1px solid ${C.border}`}}>
          {[
            {icon:"✅",val:today.served,label:"Servis",color:C.green,bg:C.greenP},
            {icon:"😤",val:today.lost,label:"Perdus",color:C.red,bg:C.redP},
            {icon:"💶",val:today.revenue.toFixed(0)+"€",label:"Revenus",color:C.amber,bg:C.amberP},
          ].map(s => (
            <div key={s.label} style={{background:s.bg,padding:"16px 10px",textAlign:"center",
              borderRight:`1px solid ${C.border}`}}>
              <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
              <div style={{fontSize:22,fontWeight:800,color:s.color,fontFamily:F.title,lineHeight:1}}>{s.val}</div>
              <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:3}}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",
              fontSize:11,fontFamily:F.body,marginBottom:6}}>
              <span style={{color:C.muted}}>Taux de service</span>
              <span style={{fontWeight:700,color:rateColor}}>{rate}%</span>
            </div>
            <div style={{height:8,background:C.border,borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${rate}%`,background:rateColor,
                borderRadius:99,transition:"width 1s ease"}}/>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {bestSrv && (
              <div style={{background:C.navyP,border:`1px solid ${C.navy}22`,
                borderRadius:12,padding:"12px 14px"}}>
                <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:4}}>⭐ Meilleur serveur</div>
                <div style={{fontSize:13,fontWeight:700,color:C.navy,fontFamily:F.title}}>{bestSrv.name}</div>
                <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:2}}>{bestSrv.totalXp} XP</div>
              </div>
            )}
            {topDish && (
              <div style={{background:C.terraP,border:`1px solid ${C.terra}22`,
                borderRadius:12,padding:"12px 14px"}}>
                <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:4}}>🍽 Plat n°1</div>
                <div style={{fontSize:13,fontWeight:700,color:C.terra,fontFamily:F.title,
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{topDish[0]}</div>
                <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:2}}>{topDish[1]}× commandé</div>
              </div>
            )}
          </div>

          <div style={{background:C.purpleP,border:`1px solid ${C.purple}22`,
            borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:22}}>🎯</span>
            <div>
              <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:2}}>Objectif demain</div>
              <div style={{fontSize:13,fontWeight:700,color:C.purple,fontFamily:F.title}}>
                Atteindre {nextRevTarget.toLocaleString("fr-FR")} € de CA total
              </div>
              <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:2}}>
                {(nextRevTarget - objStats.totalRevenue).toLocaleString("fr-FR")} € restants
              </div>
            </div>
          </div>

          <button onClick={onClose} style={{
            padding:"12px",borderRadius:12,border:"none",
            background:C.green,color:"#fff",cursor:"pointer",
            fontSize:14,fontWeight:700,fontFamily:F.body,
            boxShadow:`0 4px 16px ${C.green}44`}}>
            🌅 Nouvelle journée
          </button>
        </div>
      </div>
    </div>
  );
}
