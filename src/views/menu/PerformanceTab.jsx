import { memo } from "react";
import { C, F } from "../../constants/gameData.js";
import { useLang } from "../../i18n/index.jsx";

const CAT_C = {"Petit Déjeuner":C.amber,Entrées:C.green,Plats:C.terra,Desserts:C.purple,Boissons:C.navy};

export const PerformanceTab = memo(function PerformanceTab({ menu, dishCost, dishMargin, portionsLeft, perfScore, marginColor, bp }) {
  const { t: tl } = useLang();
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr 1fr":"repeat(auto-fill,minmax(130px,1fr))",gap:10,marginBottom:20}}>
        {[
          {k:"activeDishes",    v:menu.filter(m=>m.enabled!==false).length,                               i:"✅",c:C.green, bg:C.greenP},
          {k:"disabledDishes",  v:menu.filter(m=>m.enabled===false).length,                               i:"⏸", c:C.amber, bg:C.amberP},
          {k:"revenueGenerated",v:menu.reduce((s,m)=>s+(m.price*(m.orderCount||0)),0).toFixed(0)+"€",     i:"💶",c:C.terra, bg:C.terraP},
          {k:"totalOrders",     v:menu.reduce((s,m)=>s+(m.orderCount||0),0),                              i:"📊",c:C.navy,  bg:C.navyP},
        ].map(s=>(
          <div key={s.k} style={{background:s.bg,border:`1px solid ${s.c}22`,borderRadius:12,padding:"12px",textAlign:"center"}}>
            <div style={{fontSize:18,marginBottom:3}}>{s.i}</div>
            <div style={{fontSize:18,fontWeight:800,color:s.c,fontFamily:F.title,lineHeight:1}}>{s.v}</div>
            <div style={{fontSize:9,color:C.muted,fontFamily:F.body,marginTop:3}}>{tl("menu."+s.k)}</div>
          </div>
        ))}
      </div>
      <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14}}>📊</span>
          <span style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title}}>{tl("menu.perfTable")} — {menu.length} {tl("kitchen.dishes")}</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontFamily:F.body,minWidth:560}}>
            <thead>
              <tr style={{background:C.bg}}>
                {[tl("menu.colDish"),tl("menu.colCat"),tl("menu.colPrice"),tl("menu.colCost"),tl("menu.colMargin"),tl("menu.colOrders"),tl("menu.colRevenue"),tl("menu.colStock"),tl("menu.colScore")].map(h=>(
                  <th key={h} style={{padding:"7px 10px",fontSize:9,fontWeight:700,color:C.muted,textAlign:"left",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...menu].sort((a,b)=>perfScore(b)-perfScore(a)).map((m,i)=>{
                const mg = dishMargin(m)||0;
                const cost = dishCost(m);
                const portions = portionsLeft(m);
                const ca = +(m.price*(m.orderCount||0)).toFixed(2);
                const score = perfScore(m);
                const sc = score>=70?C.green:score>=40?C.amber:C.red;
                const cc = CAT_C[m.cat]||C.navy;
                return (
                  <tr key={m.id} style={{background:i%2===0?C.card:C.bg,opacity:m.enabled===false?0.5:1}}>
                    <td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}11`}}>
                      <div style={{fontSize:11,fontWeight:600,color:C.ink,whiteSpace:"nowrap"}}>{m.name}</div>
                      {m.enabled===false&&<span style={{fontSize:8,color:C.amber,fontWeight:700}}>⏸ {tl("menu.off")}</span>}
                    </td>
                    <td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}11`}}>
                      <span style={{fontSize:9,background:cc+"14",color:cc,border:`1px solid ${cc}22`,borderRadius:4,padding:"1px 5px",fontWeight:600}}>{m.cat}</span>
                    </td>
                    <td style={{padding:"8px 10px",fontSize:11,fontWeight:700,color:C.terra,borderBottom:`1px solid ${C.border}11`,whiteSpace:"nowrap"}}>{m.price}€</td>
                    <td style={{padding:"8px 10px",fontSize:10,color:C.muted,borderBottom:`1px solid ${C.border}11`,whiteSpace:"nowrap"}}>{cost.toFixed(2)}€</td>
                    <td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}11`}}>
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        <div style={{width:36,height:4,background:C.border,borderRadius:99,overflow:"hidden"}}>
                          <div style={{height:"100%",width:"100%",background:marginColor(mg),borderRadius:99,transformOrigin:"left center",transform:`scaleX(${Math.max(0,Math.min(1,mg/100))})`}}/>
                        </div>
                        <span style={{fontSize:10,fontWeight:700,color:marginColor(mg)}}>{mg}%</span>
                      </div>
                    </td>
                    <td style={{padding:"8px 10px",fontSize:11,fontWeight:700,color:C.navy,borderBottom:`1px solid ${C.border}11`}}>{m.orderCount||0}</td>
                    <td style={{padding:"8px 10px",fontSize:11,fontWeight:700,color:C.amber,borderBottom:`1px solid ${C.border}11`,whiteSpace:"nowrap"}}>{ca}€</td>
                    <td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}11`}}>
                      <span style={{fontSize:10,fontWeight:600,color:portions<2?C.red:portions<5?C.amber:C.green}}>{portions>=99?"∞":portions}</span>
                    </td>
                    <td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}11`}}>
                      <div style={{width:30,height:30,borderRadius:"50%",background:sc+"18",border:`2px solid ${sc}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:sc}}>{score}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
