import { memo } from "react";
import { C, F } from "../../constants/gameData.js";
import { Badge } from "../../components/ui/index.js";
import { useLang } from "../../i18n/index.jsx";

export const MenuCard = memo(function MenuCard({ m, stock, maxOrders, dishCost, dishMargin, portionsLeft, perfScore, marginColor, marginBg, toggleEnabled, adjustPrice, resetPrice }) {
  const { t: tl } = useLang();
  const enabled = m.enabled !== false;
  const mg = dishMargin(m);
  const cost = dishCost(m);
  const portions = portionsLeft(m);
  const isTop = (m.orderCount||0)>0 && (m.orderCount||0)===maxOrders;
  const isPriceModified = m.basePrice && m.basePrice!==m.price;
  const criticalStock = portions<2 && (m.ingredients||[]).length>0;
  const score = perfScore(m);
  const sc = score>=70?C.green:score>=40?C.amber:C.red;
  const catC = {"Petit Déjeuner":C.amber,Entrées:C.green,Plats:C.terra,Desserts:C.purple,Boissons:C.navy};
  const cc = catC[m.cat]||C.navy;

  return (
    <div style={{background:!enabled?C.bg:m.isSpecial?C.purpleP:C.card,border:`1.5px solid ${!enabled?C.border:criticalStock?C.red+"55":m.isSpecial?C.purple+"66":cc+"44"}`,borderRadius:14,padding:14,opacity:enabled?1:0.6,boxShadow:criticalStock&&enabled?`0 0 0 2px ${C.red}22`:"0 1px 4px rgba(0,0,0,0.05)",transition:"all 0.2s",position:"relative"}}>
      {isTop&&enabled&&(
        <div style={{position:"absolute",top:-8,right:10,background:"linear-gradient(135deg,#f5a623,#e07a45)",color:"#fff",fontSize:9,fontWeight:800,borderRadius:20,padding:"2px 8px",boxShadow:"0 2px 6px rgba(0,0,0,0.2)"}}>🔥 Top</div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
        <div style={{fontSize:13,fontWeight:600,color:enabled?C.ink:C.muted,fontFamily:F.title,flex:1,lineHeight:1.3,paddingRight:6,textDecoration:enabled?"none":"line-through"}}>{m.name}</div>
        <div style={{flexShrink:0,textAlign:"right"}}>
          <div style={{fontSize:16,fontWeight:700,color:isPriceModified?C.purple:C.terra,fontFamily:F.title}}>{m.price}€</div>
          {isPriceModified&&<div style={{fontSize:9,color:C.muted,textDecoration:"line-through",fontFamily:F.body}}>{m.basePrice}€</div>}
        </div>
      </div>
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
        <Badge color={cc} sm>{m.cat}</Badge>
        {m.prepTime&&<span style={{fontSize:9,background:C.amberP,color:C.amber,borderRadius:5,padding:"1px 5px",fontFamily:F.body,fontWeight:600}}>⏱{m.prepTime>=60?`${Math.floor(m.prepTime/60)}m`:m.prepTime+"s"}</span>}
        {(m.ingredients||[]).length>0&&<span style={{fontSize:9,borderRadius:5,padding:"1px 5px",fontFamily:F.body,fontWeight:600,background:criticalStock?C.redP:portions<5?C.amberP:C.greenP,color:criticalStock?C.red:portions<5?C.amber:C.green}}>{criticalStock?"⚠":"🍽"}{portions>=99?"∞":portions}p</span>}
        {(m.orderCount||0)>0&&<span style={{fontSize:9,background:C.navyP,color:C.navy,borderRadius:5,padding:"1px 5px",fontFamily:F.body,fontWeight:600}}>📊{m.orderCount}</span>}
        <span style={{fontSize:9,background:sc+"18",color:sc,border:`1px solid ${sc}33`,borderRadius:5,padding:"1px 5px",fontFamily:F.body,fontWeight:700}}>★{score}</span>
      </div>
      {mg!==null&&(
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,background:marginBg(mg),border:`1px solid ${marginColor(mg)}22`,borderRadius:7,padding:"5px 8px"}}>
          <div style={{flex:1}}>
            <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{tl("menu.colCost")}</div>
            <div style={{fontSize:11,fontWeight:700,color:C.ink,fontFamily:F.title}}>{cost.toFixed(2)}€</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{tl("menu.colMargin")}</div>
            <div style={{fontSize:15,fontWeight:800,color:marginColor(mg),fontFamily:F.title}}>{mg}%</div>
          </div>
        </div>
      )}
      {(m.ingredients||[]).length>0&&(
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:6,marginBottom:8}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
            {m.ingredients.map(ing=>{
              const s = stock.find(x=>x.id===ing.stockId);
              const ok = s&&s.qty>=ing.qty;
              return <span key={ing.stockId} style={{fontSize:9,fontFamily:F.body,background:ok?C.greenP:C.redP,color:ok?C.green:C.red,border:`1px solid ${ok?C.green:C.red}22`,borderRadius:4,padding:"1px 5px"}}>{s?.name||"?"} ×{ing.qty}</span>;
            })}
          </div>
        </div>
      )}
      <div style={{borderTop:`1px solid ${C.border}`,paddingTop:8,display:"flex",flexDirection:"column",gap:5}}>
        <div style={{display:"flex",gap:3,alignItems:"center"}}>
          <span style={{fontSize:9,color:C.muted,fontFamily:F.body,flexShrink:0}}>Prix :</span>
          {[{l:"−10%",f:0.90,c:C.red},{l:"−5%",f:0.95,c:C.terra},{l:"+5%",f:1.05,c:C.green},{l:"+10%",f:1.10,c:C.green},{l:"+20%",f:1.20,c:C.purple}].map(({l,f,c})=>(
            <button key={l} onClick={e=>{e.stopPropagation();adjustPrice(m.id,f);}} style={{flex:1,padding:"2px 0",fontSize:9,fontWeight:700,borderRadius:4,background:c+"14",color:c,border:`1px solid ${c}33`,cursor:"pointer",fontFamily:F.body}}>{l}</button>
          ))}
          {isPriceModified&&<button onClick={e=>{e.stopPropagation();resetPrice(m.id);}} style={{padding:"2px 5px",fontSize:9,fontWeight:700,borderRadius:4,background:C.navyP,color:C.navy,border:`1px solid ${C.navy}33`,cursor:"pointer",fontFamily:F.body}}>↺</button>}
        </div>
        <button onClick={e=>{e.stopPropagation();toggleEnabled(m.id);}} style={{width:"100%",padding:"4px",fontSize:10,fontWeight:700,borderRadius:6,background:enabled?C.amberP:C.greenP,color:enabled?C.amber:C.green,border:`1.5px solid ${enabled?C.amber:C.green}44`,cursor:"pointer",fontFamily:F.body}}>
          {enabled?"⏸ "+tl("menu.disable"):"▶ "+tl("menu.enable")}
        </button>
      </div>
    </div>
  );
});
