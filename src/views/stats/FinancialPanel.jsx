import { memo } from "react";
import { C, F } from "../../constants/gameData.js";
import { useLang } from "../../i18n/index.jsx";
import { PieChart } from "./PieChart.jsx";

const CAT_COLORS = { Entrées:C.green, Plats:C.terra, Desserts:C.purple, Boissons:C.navy, Formules:C.amber };

export const FinancialPanel = memo(function FinancialPanel({ transactions, currentGameDay, menu, kitchen, servers, bp, avgBasket }) {
  const { t: tl } = useLang();

  const todayTx = transactions.filter(t=>t.type==="revenu"&&t.gameDay===currentGameDay);
  const totalRevToday = todayTx.reduce((s,t)=>s+t.amount, 0);
  const expTodayTx = transactions.filter(t=>t.type!=="revenu"&&t.gameDay===currentGameDay);
  const totalExpToday = expTodayTx.reduce((s,t)=>s+t.amount, 0);
  const netToday = +(totalRevToday-totalExpToday).toFixed(2);
  const expByType = {};
  expTodayTx.forEach(t=>{ if(!expByType[t.type]) expByType[t.type]=0; expByType[t.type]+=t.amount; });
  const expTypeInfo = {
    achat:         { l:tl("stats.expPurchase"),   icon:"🛒", c:"#e07b39" },
    salaire:       { l:tl("stats.expSalary"),     icon:"💼", c:C.navy    },
    remboursement: { l:tl("stats.expLoan"),       icon:"🏦", c:C.purple  },
    dépense:       { l:tl("stats.expEquipment"),  icon:"🔧", c:C.muted   },
  };

  const catRevenue = { Entrées:0, Plats:0, Desserts:0, Boissons:0, Formules:0 };
  menu.forEach(m=>{
    if(catRevenue[m.cat]!==undefined) catRevenue[m.cat] += m.price*(m.dayOrderCount||0);
    catRevenue.Formules += m.dayFormulaRevenue||0;
  });
  const totalCatRev = Object.values(catRevenue).reduce((s,v)=>s+v, 0) || 1;

  const chefSalary = kitchen?.chef?.salary||0;
  const commissSalary = (kitchen?.commis||[]).filter(c=>c.status==="actif").reduce((s,c)=>s+(c.salary||0),0);
  const serverSalary = (servers||[]).filter(s=>s.status==="actif").reduce((s,sv)=>s+(sv.salary||0),0);
  const totalSalaryPerHour = chefSalary+commissSalary+serverSalary;

  return (
    <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr":"1fr 1fr",gap:bp.isMobile?10:12,marginBottom:20}}>
      {/* Day result */}
      <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"18px 20px"}}>
        <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:14,display:"flex",alignItems:"center",gap:7}}>
          <span>📊</span> {tl("stats.dayResult")}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:C.green+"08",borderRadius:9,border:`1px solid ${C.green}18`}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14}}>📈</span><span style={{fontSize:11,color:C.muted,fontFamily:F.body}}>{tl("stats.revenueDay")}</span></div>
            <span style={{fontSize:14,fontWeight:800,color:C.green,fontFamily:F.title}}>+{totalRevToday.toFixed(2)}€</span>
          </div>
          <div style={{background:C.red+"06",borderRadius:9,border:`1px solid ${C.red}18`,overflow:"hidden"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderBottom:Object.keys(expByType).length>0?`1px solid ${C.red}10`:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14}}>📉</span><span style={{fontSize:11,color:C.muted,fontFamily:F.body}}>{tl("stats.expensesDay")}</span></div>
              <span style={{fontSize:14,fontWeight:800,color:C.red,fontFamily:F.title}}>−{totalExpToday.toFixed(2)}€</span>
            </div>
            {Object.entries(expByType).map(([type,amt])=>{
              const info = expTypeInfo[type]||{l:type,icon:"💳",c:C.muted};
              return (
                <div key={type} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 12px 5px 28px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:11}}>{info.icon}</span><span style={{fontSize:10,color:C.muted,fontFamily:F.body}}>{info.l}</span></div>
                  <span style={{fontSize:11,fontWeight:700,color:info.c,fontFamily:F.title}}>−{amt.toFixed(2)}€</span>
                </div>
              );
            })}
          </div>
          <div style={{borderTop:`2px solid ${C.border}`,paddingTop:10,marginTop:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.body}}>{"⚖️ "+tl("stats.netResult")}</span>
            <span style={{fontSize:20,fontWeight:800,color:netToday>=0?C.green:C.red,fontFamily:F.title}}>{netToday>=0?"+":""}{netToday.toFixed(2)}€</span>
          </div>
        </div>
        <div style={{marginTop:14,padding:"10px 12px",background:C.navyP,borderRadius:9,border:`1px solid ${C.navy}22`}}>
          <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:5}}>{"💸 "+tl("stats.payroll")}</div>
          <div style={{display:"flex",gap:bp.isMobile?7:10,flexWrap:"wrap"}}>
            {[{k:"chef",v:chefSalary},{k:"commis",v:commissSalary},{k:"waiters",v:serverSalary}].map(r=>(
              <div key={r.k} style={{flex:1,textAlign:"center"}}>
                <div style={{fontSize:13,fontWeight:700,color:C.navy,fontFamily:F.title}}>{r.v}€/h</div>
                <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{tl("stats."+r.k)}</div>
              </div>
            ))}
            <div style={{flex:1,textAlign:"center",borderLeft:`1px solid ${C.navy}22`,paddingLeft:8}}>
              <div style={{fontSize:13,fontWeight:700,color:C.navy,fontFamily:F.title}}>{totalSalaryPerHour}€/h</div>
              <div style={{fontSize:9,color:C.navy,fontFamily:F.body,fontWeight:600}}>{tl("stats.total")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue by category */}
      <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"18px 20px"}}>
        <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:14,display:"flex",alignItems:"center",gap:7}}>
          <span>🥧</span> {tl("stats.revenueByCat")}
        </div>
        <div style={{display:"flex",gap:16,alignItems:"center"}}>
          <PieChart data={Object.entries(catRevenue).map(([k,v])=>({color:CAT_COLORS[k]||C.navy,value:v,label:k}))} size={110}/>
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:7}}>
            {Object.entries(catRevenue).map(([cat,rev])=>{
              const pct = totalCatRev>0?Math.round((rev/totalCatRev)*100):0;
              const color = CAT_COLORS[cat]||C.navy;
              return (
                <div key={cat}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,fontFamily:F.body,marginBottom:3}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{width:8,height:8,borderRadius:2,background:color,flexShrink:0}}/>
                      <span style={{color:C.ink,fontWeight:600}}>{cat}</span>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <span style={{color:C.muted}}>{rev.toFixed(0)}€</span>
                      <span style={{color,fontWeight:700}}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{height:4,background:C.border,borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",width:"100%",background:color,borderRadius:99,transformOrigin:"left center",transform:`scaleX(${pct/100})`,transition:"transform 0.6s ease"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{marginTop:14,padding:"8px 12px",background:C.greenP,borderRadius:9,border:`1px solid ${C.green}22`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:11,color:C.muted,fontFamily:F.body}}>{"🛒 "+tl("stats.avgBasketClient")}</span>
          <span style={{fontSize:16,fontWeight:800,color:C.green,fontFamily:F.title}}>{avgBasket}€</span>
        </div>
      </div>
    </div>
  );
});
