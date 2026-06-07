import { C, F } from "../constants/gameData.js";
import { Badge, Btn } from "../components/ui/index.js";
import { useLang } from "../i18n/index.jsx";
import { useMenuView } from "./menu/useMenuView.js";
import { MenuCard } from "./menu/MenuCard.jsx";
import { FormulasTab } from "./menu/FormulasTab.jsx";
import { PerformanceTab } from "./menu/PerformanceTab.jsx";
import { EditDishModal } from "./menu/EditDishModal.jsx";

const CAT_C = {"Petit Déjeuner":C.amber,Entrées:C.green,Plats:C.terra,Desserts:C.purple,Boissons:C.navy};
const CATS = ["Tout","Petit Déjeuner","Entrées","Plats","Desserts","Boissons"];

export function MenuView({ menu, setMenu, stock, formulas, setFormulas, dailyStats, restoLvN=0, bp={} }) {
  const { t: tl } = useLang();
  const {
    mainTab, setMainTab, catFilter, setCatFilter, sortBy, setSortBy,
    modal, setModal, editId, form, setForm, ingLines, setIngLines,
    newIngS, setNewIngS, newIngQ, setNewIngQ,
    formulaModal, setFormulaModal, fSelections, setFSelections,
    sorted, locked, maxOrders, criticalDishes, disabledCount, lockedAllCount,
    unlocked, dishCost, dishMargin, portionsLeft, perfScore, marginColor, marginBg,
    toggleEnabled, adjustPrice, resetPrice,
    openFormula, saveFormula, del, openEdit, addIngLine, removeIng, updateIngQty, save,
  } = useMenuView({ menu, setMenu, stock, formulas, setFormulas, restoLvN });

  return (
    <div style={{background:C.bg,borderRadius:16,padding:16}}>
      {criticalDishes.length>0 && (
        <div style={{background:C.redP,border:`1.5px solid ${C.red}33`,borderRadius:10,padding:"8px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span>⚠️</span>
          <span style={{fontSize:12,fontWeight:700,color:C.red,fontFamily:F.body}}>{tl("menu.criticalAlert",{n:criticalDishes.length,s:criticalDishes.length>1?"s":""})}</span>
          {criticalDishes.map(m=>(
            <span key={m.id} style={{fontSize:10,background:C.red+"18",color:C.red,border:`1px solid ${C.red}33`,borderRadius:5,padding:"2px 7px",fontFamily:F.body,fontWeight:600}}>
              {m.name}
              <button onClick={()=>toggleEnabled(m.id)} style={{marginLeft:5,background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:9,fontWeight:700,padding:0}}>{tl("menu.disable")}</button>
            </span>
          ))}
        </div>
      )}

      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {[
          {k:"carte",    icon:"📋", label:tl("menu.cardTab")},
          {k:"formules", icon:"🍽",  label:tl("menu.formulasTab")+((formulas||[]).filter(f=>f.active).length>0?" ("+(formulas||[]).filter(f=>f.active).length+")":"")},
          {k:"perf",     icon:"📊",  label:tl("menu.performanceTab")},
        ].map(t=>(
          <button key={t.k} onClick={()=>setMainTab(t.k)} style={{padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600,background:mainTab===t.k?C.navy:"transparent",color:mainTab===t.k?"#fff":C.muted,border:`1.5px solid ${mainTab===t.k?C.navy:C.border}`,cursor:"pointer",fontFamily:F.body,display:"flex",alignItems:"center",gap:5}}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {mainTab==="carte" && (
        <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {CATS.map(c=>(
                <button key={c} onClick={()=>setCatFilter(c)} style={{background:catFilter===c?(CAT_C[c]||C.green)+"1a":"transparent",color:catFilter===c?(CAT_C[c]||C.green):C.muted,border:`1.5px solid ${catFilter===c?(CAT_C[c]||C.green):C.border}`,borderRadius:20,padding:"4px 12px",fontSize:12,cursor:"pointer",fontFamily:F.body,fontWeight:500}}>
                  {c==="Tout"?tl("menu.all"):c}
                </button>
              ))}
              {disabledCount>0&&<span style={{fontSize:11,background:C.amberP,color:C.amber,border:`1px solid ${C.amber}33`,borderRadius:20,padding:"4px 10px",fontFamily:F.body,fontWeight:600}}>⏸ {disabledCount} {tl("menu.disabled")}</span>}
              {lockedAllCount>0&&<span style={{fontSize:11,background:C.purpleP,color:C.purple,border:`1px solid ${C.purple}33`,borderRadius:20,padding:"4px 10px",fontFamily:F.body,fontWeight:600}}>🔒 {lockedAllCount} {tl("menu.toUnlock")}</span>}
            </div>
            <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontSize:10,color:C.muted,fontFamily:F.body}}>{tl("menu.sort")}</span>
              {[{k:"cat",label:tl("menu.sortCat")},{k:"margin",label:"💰 "+tl("menu.sortMargin")},{k:"popular",label:"🔥 "+tl("menu.sortPop")},{k:"stock",label:"⚠ "+tl("menu.sortStock")},{k:"score",label:"📊 "+tl("menu.sortScore")}].map(s=>(
                <button key={s.k} onClick={()=>setSortBy(s.k)} style={{fontSize:10,padding:"3px 8px",borderRadius:6,background:sortBy===s.k?C.navy:C.bg,color:sortBy===s.k?"#fff":C.muted,border:`1px solid ${sortBy===s.k?C.navy:C.border}`,cursor:"pointer",fontFamily:F.body}}>{s.label}</button>
              ))}
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr 1fr":"repeat(auto-fill,minmax(240px,1fr))",gap:bp.isMobile?8:12}}>
            {sorted.map(m=>(
              <MenuCard key={m.id} m={m} stock={stock} maxOrders={maxOrders}
                dishCost={dishCost} dishMargin={dishMargin} portionsLeft={portionsLeft} perfScore={perfScore}
                marginColor={marginColor} marginBg={marginBg}
                toggleEnabled={toggleEnabled} adjustPrice={adjustPrice} resetPrice={resetPrice}/>
            ))}
          </div>

          {locked.length>0 && (
            <div style={{marginTop:20}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,borderTop:`2px dashed ${C.purple}44`,paddingTop:14}}>
                <span style={{fontSize:16}}>🔒</span>
                <span style={{fontSize:13,fontWeight:700,color:C.purple,fontFamily:F.title}}>{tl("menu.nextUnlocks")}</span>
                <span style={{fontSize:11,color:C.muted,fontFamily:F.body}}>{tl("menu.nextUnlocksCount",{n:locked.length,total:menu.filter(m=>!unlocked(m)).length,s:locked.length>1?"s":""})}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr 1fr":"repeat(auto-fill,minmax(220px,1fr))",gap:bp.isMobile?8:10}}>
                {locked.map(m=>{
                  const cc = CAT_C[m.cat]||C.navy;
                  const lvReq = m.unlockLevel??0;
                  return (
                    <div key={m.id} style={{background:C.bg,border:`1.5px dashed ${C.purple}44`,borderRadius:14,padding:14,opacity:0.65,position:"relative",overflow:"hidden"}}>
                      <div style={{position:"absolute",top:8,right:10,background:C.purple,color:"#fff",fontSize:10,fontWeight:800,borderRadius:20,padding:"2px 10px"}}>🔒 {tl("kitchen.level")}{lvReq}</div>
                      <div style={{fontSize:13,fontWeight:600,color:C.muted,fontFamily:F.title,lineHeight:1.3,marginBottom:6,paddingRight:60}}>{m.name}</div>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
                        <Badge color={cc} sm>{m.cat}</Badge>
                        <span style={{fontSize:9,background:C.amberP,color:C.amber,borderRadius:5,padding:"1px 5px",fontFamily:F.body,fontWeight:600}}>⏱{m.prepTime>=60?`${Math.floor(m.prepTime/60)}m`:m.prepTime+"s"}</span>
                        <span style={{fontSize:9,background:C.purpleP,color:C.purple,borderRadius:5,padding:"1px 5px",fontFamily:F.body,fontWeight:700}}>{m.price}€</span>
                      </div>
                      <div style={{fontSize:10,color:C.purple,fontFamily:F.body,fontWeight:600,background:C.purpleP,borderRadius:6,padding:"4px 8px",textAlign:"center"}}>{tl("menu.unlocksAt",{level:lvReq})}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {mainTab==="formules" && (
        <FormulasTab formulas={formulas} setFormulas={setFormulas} menu={menu}
          formulaModal={formulaModal} setFormulaModal={setFormulaModal}
          fSelections={fSelections} setFSelections={setFSelections}
          unlocked={unlocked} openFormula={openFormula} saveFormula={saveFormula} bp={bp}/>
      )}

      {mainTab==="perf" && (
        <PerformanceTab menu={menu} dishCost={dishCost} dishMargin={dishMargin}
          portionsLeft={portionsLeft} perfScore={perfScore} marginColor={marginColor} bp={bp}/>
      )}

      {modal && (
        <EditDishModal editId={editId} form={form} setForm={setForm}
          ingLines={ingLines} setIngLines={setIngLines}
          newIngS={newIngS} setNewIngS={setNewIngS} newIngQ={newIngQ} setNewIngQ={setNewIngQ}
          stock={stock} save={save} del={del} addIngLine={addIngLine}
          removeIng={removeIng} updateIngQty={updateIngQty} onClose={()=>setModal(false)}/>
      )}
    </div>
  );
}
