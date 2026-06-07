import { useState, memo } from "react";
import { useLang } from "../../i18n/index.jsx";
import { C, F } from "../../constants/gameData.js";
import { Btn, Inp } from "../../components/ui/index.js";
import { quickAmounts, getLots, stockCap } from "../../utils/orderUtils.js";

const freshnessColor = (f) => f<=0?"#7f0000":f<20?C.red:f<60?C.amber:C.green;
const freshnessLabel = (f, tl) => f<=0?tl("stock.expired"):f<20?tl("stock.critical"):f<60?tl("stock.useNow"):tl("stock.fresh");

export const getBarColor = (it, storageMult) => {
  const cap = stockCap(it,storageMult);
  const pct = cap>0?(it.qty/cap)*100:0;
  const alertPct = cap>0?(it.alert/cap)*100:0;
  return pct<=alertPct?C.red:pct<=alertPct*2.5?C.amber:C.green;
};

export const StockCard = memo(function StockCard({ it, storageMult, portions, pendingQtyVal, onOrder, onAdjust, onSetAlert }) {
  const { t: tl } = useLang();
  const [adjActive, setAdjActive] = useState(false);
  const [adjV, setAdjV] = useState("");
  const [alertActive, setAlertActive] = useState(false);
  const [alertVal, setAlertVal] = useState("");

  const low = it.qty<=it.alert;
  const cap = stockCap(it,storageMult);
  const pct = cap>0?Math.min(100,(it.qty/cap)*100):0;
  const alertPct = cap>0?Math.min(100,(it.alert/cap)*100):0;
  const barColor = getBarColor(it,storageMult);
  const amounts = quickAmounts(it.unit);
  const lots = getLots(it);
  const f = lots[0]?.freshness??100;
  const fc = freshnessColor(f);
  const fl = freshnessLabel(f,tl);

  const applyAdj = () => {
    const v = parseFloat(adjV);
    if(isNaN(v)) return;
    if(v>0) onOrder(it,v);
    else if(v<0) onAdjust(it.id,v);
    setAdjActive(false); setAdjV("");
  };

  return(
    <div style={{
      background:low?C.redP:C.card,
      border:`1.5px solid ${low?C.red+"55":C.border}`,
      borderRadius:14,padding:14,
      boxShadow:low?`0 2px 14px ${C.red}20`:"0 1px 5px rgba(0,0,0,0.06)",
      transition:"all 0.15s"}}
      className="hovcard">

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.body,flex:1,lineHeight:1.3}}>
          {it.name}
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
          {low
            ?<span style={{fontSize:9,color:C.red,fontWeight:700,background:C.red+"18",border:`1px solid ${C.red}33`,borderRadius:5,padding:"1px 5px"}}>⚠ {tl("stock.low")}</span>
            :<span style={{fontSize:9,color:C.green,fontWeight:600,background:C.greenP,border:`1px solid ${C.green}33`,borderRadius:5,padding:"1px 5px"}}>✓ OK</span>
          }
          {portions!==null&&(
            <span style={{fontSize:9,fontWeight:700,
              color:portions<3?C.red:portions<10?C.amber:C.muted,fontFamily:F.body}}>
              {portions<3?"⛔":portions<10?"⚠":"🍽"} ~{portions} {tl("stock.meals")}
            </span>
          )}
        </div>
      </div>

      <div style={{marginBottom:5}}>
        <div style={{height:20,background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,overflow:"hidden",position:"relative"}}>
          <div style={{position:"absolute",top:0,left:0,bottom:0,width:"100%",background:barColor,borderRadius:6,transition:"transform 0.4s ease",opacity:0.9,transformOrigin:"left center",transform:`scaleX(${pct/100})`}}/>
          <div style={{position:"absolute",top:0,bottom:0,left:`${alertPct}%`,width:2,background:C.red+"99"}}/>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:10,fontWeight:700,fontFamily:F.body,color:pct>25?C.surface:C.ink,
            textShadow:pct>25?"0 1px 3px rgba(0,0,0,0.35)":"none"}}>
            {+(it.qty).toFixed(2)} {it.unit}
          </div>
        </div>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:9,color:C.muted,fontFamily:F.body,marginBottom:5}}>
        <span>0</span>
        {alertActive?(
          <div style={{display:"flex",alignItems:"center",gap:3}} onClick={e=>e.stopPropagation()}>
            <input autoFocus type="number" value={alertVal}
              onChange={e=>setAlertVal(e.target.value)}
              onKeyDown={e=>{
                if(e.key==="Enter"){
                  const v=parseFloat(alertVal);
                  if(!isNaN(v)&&v>=0) onSetAlert(it.id,v);
                  setAlertActive(false);
                }
                if(e.key==="Escape") setAlertActive(false);
              }}
              onBlur={()=>{
                const v=parseFloat(alertVal);
                if(!isNaN(v)&&v>=0) onSetAlert(it.id,v);
                setAlertActive(false);
              }}
              style={{width:40,fontSize:9,padding:"1px 4px",border:`1px solid ${C.red}66`,
                borderRadius:4,fontFamily:F.body,color:C.red,textAlign:"center",
                background:"#fff",outline:"none"}}
            />
          </div>
        ):(
          <span title={tl("stock.clickAlert")}
            onClick={e=>{e.stopPropagation();setAlertActive(true);setAlertVal(String(it.alert));}}
            style={{color:C.red,cursor:"pointer",borderBottom:`1px dashed ${C.red}66`,padding:"0 2px"}}>
            ⚑ {it.alert}
          </span>
        )}
        <span>{cap} {it.unit}</span>
      </div>

      <div style={{marginBottom:7}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{tl("stock.freshness")}</span>
            {lots.length>1&&<span style={{fontSize:8,background:C.navyP,color:C.navy,borderRadius:99,padding:"0px 5px",fontFamily:F.body,fontWeight:700}}>{lots.length} lots</span>}
          </div>
          <span style={{fontSize:9,fontWeight:700,color:fc,fontFamily:F.body,
            background:fc+"18",borderRadius:99,padding:"1px 6px",border:`1px solid ${fc}33`}}>
            {f<=0?"⛔ "+fl:`${fl} · ${Math.round(f)}%`}
          </span>
        </div>
        <div style={{height:4,background:C.border,borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",width:"100%",transformOrigin:"left center",
            transform:`scaleX(${Math.max(0,f)/100})`,background:fc,borderRadius:99,transition:"transform 1s"}}/>
        </div>
      </div>

      <div style={{fontSize:9,color:C.muted,fontFamily:F.body,marginBottom:8}}>
        💶 {(it.price||0).toFixed(2)} € / {it.unit}
      </div>

      {adjActive?(
        <div style={{display:"flex",gap:5,alignItems:"center"}} onClick={e=>e.stopPropagation()}>
          <Inp type="number" value={adjV} onChange={e=>setAdjV(e.target.value)}
            placeholder="+/-" style={{flex:1,fontSize:11,padding:"4px 7px"}}/>
          <Btn sm v="primary" onClick={applyAdj}>OK</Btn>
          <Btn sm v="ghost" onClick={()=>setAdjActive(false)}>✕</Btn>
        </div>
      ):(
        <div style={{display:"flex",gap:3}} onClick={e=>e.stopPropagation()}>
          {amounts.map(n=>{
            const wouldExceed = it.qty+pendingQtyVal+n>cap;
            return(
              <button key={n} onClick={()=>{ if(!wouldExceed) onOrder(it,n); }}
                disabled={wouldExceed} style={{
                  flex:1,padding:"4px 0",fontSize:10,fontWeight:700,
                  background:wouldExceed?C.bg:C.greenP,border:`1px solid ${wouldExceed?C.border:C.green}33`,
                  borderRadius:6,color:wouldExceed?C.muted:C.green,
                  cursor:wouldExceed?"not-allowed":"pointer",fontFamily:F.body,lineHeight:1,opacity:wouldExceed?0.45:1}}>
                +{n}
              </button>
            );
          })}
          <button onClick={()=>setAdjActive(true)}
            style={{flex:"0 0 26px",padding:"4px 0",fontSize:11,fontWeight:700,
              background:C.navyP,border:`1px solid ${C.navy}33`,
              borderRadius:6,color:C.navy,cursor:"pointer"}}>
            ±
          </button>
        </div>
      )}
    </div>
  );
});
