import { memo } from "react";
import { useLang } from "../../i18n/index.jsx";
import { C, F } from "../../constants/gameData.js";
import { StockCard } from "./StockCard.jsx";

export const StockCardsView = memo(function StockCardsView({ cats, visibleStock, alerts, collapsedCats, toggleCat, portionsPerIngredient, pendingQty, storageMult, handleOrder, handleAdjust, handleSetAlert, catIcon, bp }) {
  const { t: tl } = useLang();

  return(
    <>
      {cats.map(cat=>{
        const items = visibleStock.filter(s=>s.cat===cat);
        const collapsed = collapsedCats[cat];
        const catAlerts = alerts.filter(s=>s.cat===cat).length;
        return(
          <div key={cat} style={{marginBottom:20}}>
            <button onClick={()=>toggleCat(cat)} style={{
              width:"100%",display:"flex",alignItems:"center",gap:8,
              marginBottom:collapsed?0:12,padding:"8px 12px",
              background:catAlerts>0?C.redP:C.card,
              border:`1.5px solid ${catAlerts>0?C.red+"33":C.border}`,
              borderRadius:collapsed?10:12,cursor:"pointer",
              transition:"all 0.2s",textAlign:"left"}}>
              <span style={{fontSize:18}}>{catIcon[cat]||"📦"}</span>
              <span style={{fontSize:14,fontWeight:700,color:catAlerts>0?C.red:C.ink,fontFamily:F.title,flex:1}}>
                {cat}
              </span>
              <span style={{fontSize:10,color:C.muted,fontFamily:F.body}}>
                {items.length} {tl("stock.items")}
              </span>
              {catAlerts>0&&(
                <span style={{fontSize:10,background:C.red,color:"#fff",borderRadius:20,
                  padding:"1px 8px",fontFamily:F.body,fontWeight:700}}>
                  ⚠ {catAlerts}
                </span>
              )}
              <span style={{fontSize:14,color:C.muted,transform:collapsed?"rotate(-90deg)":"rotate(0deg)",transition:"transform 0.2s"}}>▾</span>
            </button>

            {!collapsed&&(
              <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr":bp.isTablet?"1fr 1fr":"repeat(auto-fill,minmax(210px,1fr))",gap:bp.isMobile?8:10}}>
                {items.map(it=>(
                  <StockCard
                    key={it.id}
                    it={it}
                    storageMult={storageMult}
                    portions={portionsPerIngredient(it.id)}
                    pendingQtyVal={pendingQty(it.id)}
                    onOrder={handleOrder}
                    onAdjust={handleAdjust}
                    onSetAlert={handleSetAlert}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
});
