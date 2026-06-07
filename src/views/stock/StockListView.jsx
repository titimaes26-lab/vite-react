import { memo } from "react";
import { useLang } from "../../i18n/index.jsx";
import { C, F } from "../../constants/gameData.js";
import { quickAmounts } from "../../utils/orderUtils.js";
import { getBarColor } from "./StockCard.jsx";

export const StockListView = memo(function StockListView({ sortedStock, storageMult, portionsPerIngredient, pendingQty, deductCost, setStock, catIcon }) {
  const { t: tl } = useLang();

  return(
    <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontFamily:F.body}}>
        <thead>
          <tr style={{background:C.bg}}>
            {[tl("stock.colIngredient"),tl("stock.colCategory"),tl("stock.colStock"),tl("stock.colAlert"),tl("stock.colValue"),tl("stock.colMeals"),tl("stock.buy")].map(h=>(
              <th key={h} style={{padding:"8px 12px",fontSize:9,fontWeight:700,color:C.muted,
                textAlign:"left",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedStock.map((it,i)=>{
            const low = it.qty<=it.alert;
            const cap = (it.alert>0?it.alert*6:Math.max(it.qty*2,10))*storageMult;
            const pct = cap>0?Math.min(100,(it.qty/cap)*100):0;
            const barColor = getBarColor(it,storageMult);
            const portions = portionsPerIngredient(it.id);
            const amounts = quickAmounts(it.unit).slice(0,2);
            return(
              <tr key={it.id} style={{background:i%2===0?C.card:C.bg,
                borderLeft:low?`3px solid ${C.red}`:"3px solid transparent"}}>
                <td style={{padding:"7px 12px",borderBottom:`1px solid ${C.border}11`}}>
                  <div style={{fontSize:12,fontWeight:low?700:600,color:low?C.red:C.ink}}>{it.name}</div>
                </td>
                <td style={{padding:"7px 12px",borderBottom:`1px solid ${C.border}11`}}>
                  <span style={{fontSize:9,background:C.bg,color:C.muted,borderRadius:4,padding:"1px 5px",fontFamily:F.body}}>
                    {catIcon[it.cat]||"📦"} {it.cat}
                  </span>
                </td>
                <td style={{padding:"7px 12px",borderBottom:`1px solid ${C.border}11`}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:60,height:5,background:C.border,borderRadius:99,overflow:"hidden"}}>
                      <div style={{height:"100%",width:"100%",background:barColor,borderRadius:99,transformOrigin:"left center",transform:`scaleX(${pct/100})`}}/>
                    </div>
                    <span style={{fontSize:11,fontWeight:700,color:low?C.red:C.ink,whiteSpace:"nowrap"}}>
                      {+(it.qty).toFixed(2)} {it.unit}
                    </span>
                  </div>
                </td>
                <td style={{padding:"7px 12px",fontSize:11,color:C.muted,borderBottom:`1px solid ${C.border}11`}}>
                  {it.alert} {it.unit}
                </td>
                <td style={{padding:"7px 12px",fontSize:11,color:C.amber,fontWeight:600,
                  borderBottom:`1px solid ${C.border}11`,whiteSpace:"nowrap"}}>
                  {((it.qty*(it.price||0)).toFixed(2))}€
                </td>
                <td style={{padding:"7px 12px",borderBottom:`1px solid ${C.border}11`}}>
                  {portions!==null?(
                    <span style={{fontSize:10,fontWeight:700,color:portions<3?C.red:portions<10?C.amber:C.green}}>
                      {portions<3?"⛔":portions<10?"⚠":"✓"} {portions} {tl("stock.meals")}
                    </span>
                  ):<span style={{color:C.muted,fontSize:10}}>—</span>}
                </td>
                <td style={{padding:"7px 12px",borderBottom:`1px solid ${C.border}11`}}>
                  <div style={{display:"flex",gap:3}}>
                    {amounts.map(n=>{
                      const wouldExceed = it.qty+pendingQty(it.id)+n>cap;
                      return(
                        <button key={n} onClick={()=>{
                          if(wouldExceed) return;
                          const inst = deductCost(it,n);
                          if(inst) setStock(p=>p.map(s=>s.id===it.id?{...s,qty:Math.min(cap,+(s.qty+n).toFixed(3))}:s));
                        }} disabled={wouldExceed} style={{
                          padding:"3px 8px",fontSize:10,fontWeight:700,borderRadius:5,
                          background:wouldExceed?C.bg:C.greenP,color:wouldExceed?C.muted:C.green,
                          border:`1px solid ${wouldExceed?C.border:C.green}33`,
                          cursor:wouldExceed?"not-allowed":"pointer",fontFamily:F.body,opacity:wouldExceed?0.45:1}}>
                          +{n}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
