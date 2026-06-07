import { memo } from "react";
import { useLang } from "../../i18n/index.jsx";
import { C, F } from "../../constants/gameData.js";
import { Btn } from "../../components/ui/index.js";
import { stockCap } from "../../utils/orderUtils.js";

export const ShortagePanel = memo(function ShortagePanel({ criticalIngredients, storageMult, orderByForecast }) {
  const { t: tl } = useLang();

  if(!criticalIngredients.length) return null;

  return(
    <div style={{background:"linear-gradient(135deg,#fff8f0,#fff3ea)",
      border:`1.5px solid ${C.terra}44`,borderRadius:14,padding:"14px 18px",marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:18}}>🔮</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:C.terra,fontFamily:F.title}}>
              {tl("stock.shortage")}
            </div>
            <div style={{fontSize:10,color:C.muted,fontFamily:F.body}}>
              {tl("stock.criticalIngredients")}
            </div>
          </div>
        </div>
        <Btn sm v="terra" onClick={orderByForecast} icon="🛒">
          {tl("stock.order")}
        </Btn>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {criticalIngredients.map(it=>{
          const cap = stockCap(it,storageMult);
          const pct = cap>0?Math.min(100,(it.qty/cap)*100):0;
          const urgencyColor = it.portions===0?C.red:it.portions<3?C.terra:C.amber;
          return(
            <div key={it.id} style={{display:"flex",alignItems:"center",gap:10,
              background:urgencyColor+"10",borderRadius:9,padding:"8px 12px",
              border:`1px solid ${urgencyColor}22`}}>
              <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,
                background:urgencyColor+"18",border:`2px solid ${urgencyColor}44`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,fontWeight:800,color:urgencyColor}}>
                {it.portions??0}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.body}}>{it.name}</span>
                  <span style={{fontSize:10,color:urgencyColor,fontWeight:700,fontFamily:F.body}}>
                    {it.portions===0?"⛔ "+tl("stock.empty"):"~"+it.portions+" "+tl("stock.meals")}
                  </span>
                </div>
                <div style={{height:4,background:C.border,borderRadius:99,overflow:"hidden"}}>
                  <div style={{height:"100%",width:"100%",background:urgencyColor,
                    borderRadius:99,transformOrigin:"left center",transform:`scaleX(${pct/100})`,transition:"transform 0.4s"}}/>
                </div>
              </div>
              <div style={{fontSize:10,color:C.muted,fontFamily:F.body,flexShrink:0}}>
                {+(it.qty).toFixed(2)} {it.unit}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
