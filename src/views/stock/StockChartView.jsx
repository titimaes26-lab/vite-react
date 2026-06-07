import { memo } from "react";
import { useLang } from "../../i18n/index.jsx";
import { C, F } from "../../constants/gameData.js";
import { quickAmounts, addLot, stockCap } from "../../utils/orderUtils.js";
import { getBarColor } from "./StockCard.jsx";

export const StockChartView = memo(function StockChartView({ sortedStock, storageMult, portionsPerIngredient, pendingQty, deductCost, setStock, visibleStock }) {
  const { t: tl } = useLang();

  return(
    <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"16px 20px"}}>
      <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:14}}>
        📊 {tl("stock.stockLevels")} {visibleStock.length} {tl("stock.ingredients")}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        {sortedStock.map(it=>{
          const cap = stockCap(it,storageMult);
          const pct = cap>0?Math.min(100,(it.qty/cap)*100):0;
          const alertPct = cap>0?Math.min(100,(it.alert/cap)*100):0;
          const barColor = getBarColor(it,storageMult,cap);
          const low = it.qty<=it.alert;
          const portions = portionsPerIngredient(it.id);
          return(
            <div key={it.id} style={{display:"flex",alignItems:"center",gap:10,padding:"4px 0"}}>
              <div style={{width:130,fontSize:11,fontFamily:F.body,color:low?C.red:C.ink,
                fontWeight:low?700:400,flexShrink:0,textAlign:"right",
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}
                title={it.name}>
                {it.name}
              </div>
              <div style={{flex:1,position:"relative",height:18,background:C.bg,
                border:`1px solid ${C.border}`,borderRadius:5,overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,left:0,bottom:0,
                  width:"100%",background:barColor,opacity:0.85,
                  transformOrigin:"left center",transform:`scaleX(${pct/100})`,transition:"transform 0.4s ease"}}/>
                <div style={{position:"absolute",top:0,bottom:0,
                  left:`${alertPct}%`,width:1.5,background:C.red+"88"}}/>
                <div style={{position:"absolute",inset:0,display:"flex",
                  alignItems:"center",paddingLeft:5,
                  fontSize:9,fontWeight:700,fontFamily:F.body,
                  color:pct>20?"rgba(255,255,255,0.9)":C.ink}}>
                  {+(it.qty).toFixed(1)} {it.unit}
                </div>
              </div>
              <div style={{width:55,fontSize:9,color:C.muted,fontFamily:F.body,flexShrink:0,textAlign:"right"}}>
                {portions!==null?(
                  <span style={{color:portions<3?C.red:portions<10?C.amber:C.muted,fontWeight:portions<10?700:400}}>
                    ~{portions} {tl("stock.meals")}
                  </span>
                ):null}
              </div>
              <div style={{display:"flex",gap:3,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                {quickAmounts(it.unit).map(n=>{
                  const wouldExceed = it.qty+pendingQty(it.id)+n>cap;
                  return(
                    <button key={n} onClick={()=>{
                      if(wouldExceed) return;
                      const inst = deductCost(it,n);
                      if(inst) setStock(p=>p.map(s=>s.id===it.id?addLot(s,n):s));
                    }} disabled={wouldExceed} style={{
                      padding:"2px 6px",fontSize:9,fontWeight:700,borderRadius:4,
                      background:wouldExceed?C.bg:C.greenP,color:wouldExceed?C.muted:C.green,
                      border:`1px solid ${wouldExceed?C.border:C.green}22`,
                      cursor:wouldExceed?"not-allowed":"pointer",fontFamily:F.body,opacity:wouldExceed?0.45:1}}>
                      +{n}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
