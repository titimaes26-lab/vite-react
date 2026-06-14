import { useLang } from "../i18n/index.jsx";
import { C, F, SUPPLIERS } from "../constants/gameData.js";
import { useClockNow } from "../contexts/ClockContext.jsx";
import { useStockView, catIcon } from "./stock/useStockView.js";

function DeliveryBanner({ deliveries, label }) {
  useClockNow(); // ticks only while there are pending deliveries
  return (
    <div style={{background:C.navyP,border:`1.5px solid ${C.navy}33`,borderRadius:10,
      padding:"10px 14px",marginBottom:12}}>
      <div style={{fontSize:11,fontWeight:700,color:C.navy,fontFamily:F.title,marginBottom:6,
        display:"flex",alignItems:"center",gap:5}}>
        <span>🚚</span><span>{label}</span>
      </div>
      {deliveries.map(d=>{
        const secsLeft = Math.max(0,Math.ceil((d.arrivedAt-Date.now())/1000));
        const totalSecs = d.orderedAt?Math.max(1,(d.arrivedAt-d.orderedAt)/1000):secsLeft;
        const pct = Math.max(0,Math.min(100,100-(secsLeft/totalSecs)*100));
        const gameMins = secsLeft;
        const gameH = Math.floor(gameMins/60);
        const gameM = gameMins%60;
        const timeLabel = gameMins===0?"✓":gameH>0?`${gameH}h${String(gameM).padStart(2,"0")}`:`${gameM}min`;
        return(
          <div key={d.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <div style={{flex:1,fontSize:10,color:C.navy,fontFamily:F.body,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.labels}</div>
            <div style={{width:70,height:4,background:C.border,borderRadius:99,overflow:"hidden",flexShrink:0}}>
              <div style={{height:"100%",background:C.navy,width:"100%",transformOrigin:"left center",transform:`scaleX(${pct/100})`,transition:"transform 1s linear",borderRadius:99}}/>
            </div>
            <span style={{fontSize:9,color:C.navy,fontWeight:700,fontFamily:F.body,flexShrink:0,minWidth:38}}>{timeLabel}</span>
          </div>
        );
      })}
    </div>
  );
}
import { ShortagePanel } from "./stock/ShortagePanel.jsx";
import { StockChartView } from "./stock/StockChartView.jsx";
import { StockListView } from "./stock/StockListView.jsx";
import { StockCardsView } from "./stock/StockCardsView.jsx";

export function StockView({ stock, setStock, cash, setCash, addTx, addToast, addDayStat, kitchen, supplierMode, setSupplierMode, pendingDeliveries, setPendingDeliveries, menu=[], restoLvN=0, bp={} }) {
  const { t: tl } = useLang();
  const {
    storageMult, visibleStock, viewMode, setViewMode, collapsedCats, sortMode, setSortMode,
    alerts, staleItems, portionsPerIngredient, criticalIngredients, inventoryValue,
    pendingQty, deductCost, handleOrder, handleAdjust, handleSetAlert,
    orderByForecast, restockAll, cats, toggleCat, sortedStock, sup,
  } = useStockView({ stock, setStock, cash, setCash, addTx, addToast, addDayStat, kitchen, supplierMode, setSupplierMode, pendingDeliveries, setPendingDeliveries, menu, restoLvN });

  return(
    <div>
      {/* KPI Header */}
      <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr 1fr":"repeat(auto-fill,minmax(140px,1fr))",gap:bp.isMobile?8:10,marginBottom:14}}>
        {[
          {k:"alerts",           val:alerts.length,                icon:"⚠️",c:alerts.length>0?C.red:C.green,              bg:alerts.length>0?C.redP:C.greenP},
          {k:"inventoryValue",   val:inventoryValue.toFixed(0)+"€",icon:"💶",c:C.amber,                                     bg:C.amberP},
          {k:"forecastShortage", val:criticalIngredients.length,   icon:"🔮",c:criticalIngredients.length>0?C.terra:C.green,bg:criticalIngredients.length>0?C.terraP:C.greenP},
          {k:"criticalFreshness",val:staleItems.length,            icon:"🕐",c:staleItems.length>0?C.red:C.green,           bg:staleItems.length>0?C.redP:C.greenP},
        ].map(s=>(
          <div key={s.k} style={{background:s.bg,border:`1.5px solid ${s.c}22`,borderRadius:12,padding:"12px 14px",textAlign:"center"}}>
            <div style={{fontSize:18,marginBottom:3}}>{s.icon}</div>
            <div style={{fontSize:18,fontWeight:800,color:s.c,fontFamily:F.title,lineHeight:1}}>{s.val}</div>
            <div style={{fontSize:9,color:C.muted,fontFamily:F.body,marginTop:3}}>{tl("stock."+s.k)}</div>
          </div>
        ))}
      </div>

      <ShortagePanel criticalIngredients={criticalIngredients} storageMult={storageMult} orderByForecast={orderByForecast}/>

      {/* Supplier toggle */}
      <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:12,
        padding:"12px 16px",marginBottom:12,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <span style={{fontSize:16}}>🚛</span>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:1}}>
            {tl("stock.supply")}
          </div>
          <div style={{fontSize:10,color:C.muted,fontFamily:F.body}}>
            {sup.desc}
          </div>
        </div>
        <div style={{display:"flex",gap:5}}>
          {Object.values(SUPPLIERS).map(s=>{
            const active = sup.id===s.id;
            const badge = s.discount>0?`−${(s.discount*100).toFixed(0)}%`:s.discount<0?`+${(-s.discount*100).toFixed(0)}%`:null;
            return(
              <button key={s.id} onClick={()=>setSupplierMode(s.id)} style={{
                padding:"5px 12px",fontSize:11,fontWeight:600,
                background:active?C.navy:C.bg,border:`1.5px solid ${active?C.navy:C.border}`,
                borderRadius:7,color:active?C.white:C.muted,cursor:"pointer",fontFamily:F.body,
                display:"flex",alignItems:"center",gap:4}}>
                <span>{s.icon}</span><span>{s.name}</span>
                {badge&&<span style={{fontSize:9,background:"#ffffff33",borderRadius:3,padding:"1px 4px"}}>{badge}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pending deliveries — clock subscription lives inside DeliveryBanner */}
      {pendingDeliveries?.length>0&&(
        <DeliveryBanner deliveries={pendingDeliveries}
          label={tl("stock.deliveries",{n:pendingDeliveries.length,s:pendingDeliveries.length>1?"s":""})}/>
      )}

      {/* Alerts + restock */}
      {alerts.length>0&&(
        <div style={{background:C.redP,border:`1.5px solid ${C.red}33`,borderRadius:10,
          padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span>⚠️</span>
          <span style={{color:C.red,fontWeight:700,fontSize:12,fontFamily:F.body,flexShrink:0}}>
            {tl("stock.lowAlerts",{n:alerts.length,s:alerts.length>1?"s":""})}
          </span>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",flex:1}}>
            {alerts.map(a=>(
              <span key={a.id} style={{background:C.red+"18",color:C.red,border:`1px solid ${C.red}33`,
                borderRadius:5,padding:"2px 8px",fontSize:10,fontFamily:F.body,fontWeight:600}}>
                {a.name} : {+(a.qty).toFixed(2)} {a.unit}
              </span>
            ))}
          </div>
          <button onClick={restockAll} style={{flexShrink:0,padding:"6px 12px",fontSize:11,fontWeight:700,
            background:C.terra,border:"none",borderRadius:7,color:C.white,cursor:"pointer",fontFamily:F.body}}>
            ⟳ {tl("stock.restockAll")}
          </button>
        </div>
      )}

      {/* View / sort toolbar */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",gap:5}}>
          {[{k:"cartes",icon:"⊞",label:tl("stock.viewCards")},{k:"liste",icon:"☰",label:tl("stock.viewList")},{k:"graphique",icon:"📊",label:tl("stock.viewChart")}].map(v=>(
            <button key={v.k} onClick={()=>setViewMode(v.k)} style={{
              padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:600,
              background:viewMode===v.k?C.navy:"transparent",
              color:viewMode===v.k?"#fff":C.muted,
              border:`1.5px solid ${viewMode===v.k?C.navy:C.border}`,
              cursor:"pointer",fontFamily:F.body,display:"flex",alignItems:"center",gap:4}}>
              <span>{v.icon}</span><span>{v.label}</span>
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center"}}>
          <span style={{fontSize:10,color:C.muted,fontFamily:F.body}}>{tl("stock.sort")}</span>
          {[{k:"urgence",label:"⚠ "+tl("stock.sortUrgency")},{k:"cat",label:tl("stock.sortCategory")},{k:"alpha",label:tl("stock.sortAZ")}].map(s=>(
            <button key={s.k} onClick={()=>setSortMode(s.k)} style={{
              fontSize:10,padding:"3px 8px",borderRadius:6,
              background:sortMode===s.k?C.navy:C.bg,color:sortMode===s.k?"#fff":C.muted,
              border:`1px solid ${sortMode===s.k?C.navy:C.border}`,cursor:"pointer",fontFamily:F.body}}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {viewMode==="graphique"&&(
        <StockChartView sortedStock={sortedStock} storageMult={storageMult}
          portionsPerIngredient={portionsPerIngredient} pendingQty={pendingQty}
          deductCost={deductCost} setStock={setStock} visibleStock={visibleStock}/>
      )}
      {viewMode==="liste"&&(
        <StockListView sortedStock={sortedStock} storageMult={storageMult}
          portionsPerIngredient={portionsPerIngredient} pendingQty={pendingQty}
          deductCost={deductCost} setStock={setStock} catIcon={catIcon}/>
      )}
      {viewMode==="cartes"&&(
        <StockCardsView cats={cats} visibleStock={visibleStock} alerts={alerts}
          collapsedCats={collapsedCats} toggleCat={toggleCat}
          portionsPerIngredient={portionsPerIngredient} pendingQty={pendingQty}
          storageMult={storageMult} handleOrder={handleOrder}
          handleAdjust={handleAdjust} handleSetAlert={handleSetAlert}
          catIcon={catIcon} bp={bp}/>
      )}
    </div>
  );
}
