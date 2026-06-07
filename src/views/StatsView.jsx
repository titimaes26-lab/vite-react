import { useState } from "react";
import { C, F, CHEF_LVL } from "../constants/gameData.js";
import { REP_THRESHOLDS, getRepTier } from "../constants/gameConstants.js";
import { restoLv, chefLv } from "../utils/levelUtils.js";
import { useLang } from "../i18n/index.jsx";
import { LineChart } from "./stats/LineChart.jsx";
import { FinancialPanel } from "./stats/FinancialPanel.jsx";
import { ServerPerfTable } from "./stats/ServerPerfTable.jsx";
import { DailyTable } from "./stats/DailyTable.jsx";
import { ReputationPanel } from "./stats/ReputationPanel.jsx";

export function StatsView({ dailyStats, loan, objStats, restoXp, kitchen, servers, reputation=50, transactions=[], menu=[], currentGameDay=1, bp={} }) {
  const { t: tl, lang } = useLang();
  const [period, setPeriod] = useState(7);
  const [hovRevIdx, setHovRevIdx] = useState(null);
  const [hovCliIdx, setHovCliIdx] = useState(null);
  const [hovRepIdx, setHovRepIdx] = useState(null);

  const chartDays = [...dailyStats].slice(-period);
  const days = [...chartDays].reverse();
  const locale = lang==="en"?"en-US":"fr-FR";

  const rl = restoLv(restoXp||0);
  const rlD = rl.d;
  const nextRl = rl.next;
  const cl = chefLv(kitchen?.chef?.totalXp||0);
  const clD = CHEF_LVL[Math.min(cl.l, CHEF_LVL.length-1)];
  const repTier = getRepTier(reputation);
  const nextRepTier = REP_THRESHOLDS.find(t=>t.min>reputation);

  const trend = (arr,key) => {
    if(arr.length<2) return null;
    const last=arr[arr.length-1][key]||0, prev=arr[arr.length-2][key]||0;
    if(prev===0) return null;
    return Math.round(((last-prev)/prev)*100);
  };
  const revTrend = trend(chartDays,"revenue");
  const srvTrend = trend(chartDays,"served");
  const repHistory = chartDays.map(d=>Math.min(100,Math.max(0,40+((d.ratingAvg||((objStats?.totalRating||0)/(objStats?.ratingCount||1))))*10)));
  const avgBasket = objStats?.totalRevenue ? +(objStats.totalRevenue/(objStats?.totalServed||1)).toFixed(2) : 0;

  return (
    <div style={{maxWidth:960,margin:"0 auto",padding:"10px 0"}}>

      {/* Period picker + KPIs */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",gap:5}}>
          {[5,7,15].map(p=>(
            <button key={p} onClick={()=>setPeriod(p)} style={{
              padding:"5px 14px",borderRadius:8,fontSize:12,fontWeight:600,
              background:period===p?C.navy:"transparent",
              color:period===p?"#fff":C.muted,
              border:`1.5px solid ${period===p?C.navy:C.border}`,
              cursor:"pointer",fontFamily:F.body}}>
              {p} {tl("stats.days")}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {[
            {k:"totalRevenue", v:(objStats?.totalRevenue||0).toFixed(0)+"€", c:C.amber},
            {k:"clients",      v:objStats?.totalServed||0,                   c:C.green},
            {k:"avgBasket",    v:avgBasket+"€",                              c:C.terra},
            {k:"avgRating",    v:objStats?.ratingCount>0?((objStats.totalRating||0)/objStats.ratingCount).toFixed(1)+" ★":"—", c:C.purple},
          ].map(s=>(
            <div key={s.k} style={{background:s.c+"12",border:`1px solid ${s.c}22`,borderRadius:10,padding:"7px 13px",textAlign:"center",minWidth:90}}>
              <div style={{fontSize:15,fontWeight:800,color:s.c,fontFamily:F.title,lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:9,color:C.muted,fontFamily:F.body,marginTop:2}}>{tl("stats."+s.k)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SVG line charts */}
      <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr":bp.isTablet?"1fr 1fr":"1fr 1fr 1fr",gap:bp.isMobile?10:12,marginBottom:20}}>
        <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"14px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.title}}>{"💶 "+tl("stats.revenue")}</span>
            {revTrend!==null&&<span style={{fontSize:11,fontWeight:700,color:revTrend>=0?C.green:C.red,fontFamily:F.body}}>{revTrend>=0?"↗":"↘"} {Math.abs(revTrend)}%</span>}
          </div>
          <LineChart data={chartDays.map(d=>d.revenue)} color={C.amber} unit="€" hov={hovRevIdx} setHov={setHovRevIdx} chartDays={chartDays}/>
        </div>
        <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"14px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.title}}>{"👥 "+tl("stats.clientsServed")}</span>
            {srvTrend!==null&&<span style={{fontSize:11,fontWeight:700,color:srvTrend>=0?C.green:C.red,fontFamily:F.body}}>{srvTrend>=0?"↗":"↘"} {Math.abs(srvTrend)}%</span>}
          </div>
          <LineChart data={chartDays.map(d=>d.served)} color={C.green} unit={" "+tl("stats.clients")} hov={hovCliIdx} setHov={setHovCliIdx} chartDays={chartDays}/>
        </div>
        <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"14px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.title}}>{repTier.icon} {tl("stats.reputation")}</span>
            <span style={{fontSize:11,fontWeight:700,color:repTier.color,fontFamily:F.body}}>{Math.round(reputation)}/100</span>
          </div>
          <LineChart data={repHistory} color={repTier.color} unit="/100" hov={hovRepIdx} setHov={setHovRepIdx} chartDays={chartDays} fillOpacity={0.12}/>
        </div>
      </div>

      <FinancialPanel transactions={transactions} currentGameDay={currentGameDay} menu={menu}
        kitchen={kitchen} servers={servers} bp={bp} avgBasket={avgBasket}/>

      <ReputationPanel reputation={reputation} repTier={repTier} nextRepTier={nextRepTier}
        rl={rl} rlD={rlD} nextRl={nextRl} cl={cl} clD={clD} restoXp={restoXp} loan={loan}/>

      <ServerPerfTable servers={servers}/>

      <DailyTable days={days} period={period} loan={loan} kitchen={kitchen} servers={servers} locale={locale}/>
    </div>
  );
}
