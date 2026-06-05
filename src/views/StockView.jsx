/* ═══════════════════════════════════════════════════════
   src/views/StockView.jsx
   Extrait du monolithe restaurant-manager.jsx
   Dépendances déclarées dans les imports ci-dessous.
═══════════════════════════════════════════════════════ */
import { useState } from "react";
import { useLang } from "../i18n/index.jsx";
import { C, F, SUPPLIERS } from "../constants/gameData";
import { Btn, Inp, Sel } from "../components/ui";
import { quickAmounts, addLot, getLots } from "../utils/orderUtils";

export function StockView({stock,setStock,cash,setCash,addTx,addToast,addDayStat,kitchen,supplierMode,setSupplierMode,pendingDeliveries,setPendingDeliveries,menu=[],restoLvN=0,bp={}}){
  const storageMult=1+(kitchen?.upgrades?.stockage||0);
  // Ingrédients utilisés par au moins un plat débloqué
  const unlockedStockIds=new Set(
    menu.filter(d=>d.enabled!==false&&(d.unlockLevel??0)<=restoLvN)
        .flatMap(d=>(Array.isArray(d.ingredients)?d.ingredients:[]).map(i=>i.stockId))
  );
  const visibleStock=stock.filter(s=>unlockedStockIds.has(s.id));
  const [inlineAlertId, setInlineAlertId] = useState(null);
  const [inlineAlertVal, setInlineAlertVal] = useState("");
  const [adjId,setAdjId]=useState(null);
  const [adjV,setAdjV]=useState("");
  const [viewMode,setViewMode]=useState("cartes"); // "cartes"|"liste"|"graphique"
  const [collapsedCats,setCollapsedCats]=useState({});
  const [sortMode,setSortMode]=useState("urgence"); // "urgence"|"alpha"|"cat"
  const { t: tl } = useLang();

  const alerts=visibleStock.filter(s=>s.qty<=s.alert);
  const staleItems=visibleStock.filter(s=>(s.freshness??100)<20&&s.qty>0);

  const freshnessColor=(f)=>f<=0?"#7f0000":f<20?C.red:f<60?C.amber:C.green;
  const freshnessLabel=(f)=>f<=0?tl("stock.expired"):f<20?tl("stock.critical"):f<60?tl("stock.useNow"):tl("stock.fresh");
  const sup=SUPPLIERS[supplierMode]??SUPPLIERS["normal"];

  /* ── Calcul prédictif : portions restantes par ingrédient ── */
  const portionsPerIngredient=(stockId)=>{
    // Calcule combien de fois cet ingrédient peut être utilisé selon les recettes actives
    const uses=menu.filter(m=>m.enabled!==false)
      .flatMap(m=>(m.ingredients||[]).filter(i=>i.stockId===stockId));
    if(!uses.length)return null;
    const item=stock.find(s=>s.id===stockId);
    if(!item)return null;
    const minUse=Math.min(...uses.map(u=>u.qty));
    return minUse>0?Math.floor(item.qty/minUse):null;
  };

  // Top 3 ingrédients critiques avec estimation de rupture
  const criticalIngredients=[...stock]
    .map(it=>{
      const portions=portionsPerIngredient(it.id);
      return {...it,portions};
    })
    .filter(it=>it.portions!==null&&it.portions<10)
    .sort((a,b)=>(a.portions??999)-(b.portions??999))
    .slice(0,3);

  // Valeur totale de l'inventaire
  const inventoryValue=visibleStock.reduce((sum,s)=>sum+(s.qty*(s.price||0)),0);

  /* ── Commander selon prévision ── */
  const orderByForecast=()=>{
    criticalIngredients.forEach(it=>{
      const target=it.alert*6;
      const qty=+(target-it.qty-pendingQty(it.id)).toFixed(3);
      if(qty>0){
        const inst=deductCost(it,qty);
        if(inst)setStock(p=>p.map(s=>s.id===it.id?addLot(s,qty):s));
      }
    });
  };

  const deductCost=(item,addedQty)=>{
    const unitPrice=(item.price||0)*(1-sup.discount);
    const cost=+(unitPrice*addedQty).toFixed(2);
    if(cost>0){
      setCash(c=>+(c-cost).toFixed(2));
      addTx("achat",`Achat ${item.name} — ${+addedQty.toFixed(3)} ${item.unit} (${sup.name})`,cost);
      addDayStat&&addDayStat("stock",cost);
    }
    if(sup.delay>0){
      const now=Date.now();
      setPendingDeliveries(p=>[...p,{
        id:now+Math.random(),
        items:[{stockId:item.id,qty:addedQty}],
        labels:`${item.name} ×${+addedQty.toFixed(3)} ${item.unit}`,
        orderedAt:now,
        arrivedAt:now+sup.delay*1000,
      }]);
      return false;
    }
    return true;
  };

  const applyAdj=(id)=>{
    const v=parseFloat(adjV);
    if(isNaN(v))return;
    const item=stock.find(s=>s.id===id);
    let doAdd=true;
    if(v>0&&item){const instant=deductCost(item,v);if(!instant)doAdd=false;}
    if(doAdd)setStock(p=>p.map(s=>s.id===id?( v>0 ? addLot(s,v) : {...s,qty:Math.max(0,+(s.qty+v).toFixed(3))} ):s));
    setAdjId(null);setAdjV("");
  };
  const quickAmounts=unit=>{
    if(["kg","L"].includes(unit))return[0.5,1,5];
    if(["btl","pcs","bottes"].includes(unit))return[1,6,12];
    if(unit==="u")return[6,12,24];
    return[1,5,10];
  };
  const restockAll=()=>{
    const toOrder=visibleStock.filter(s=>s.qty<=s.alert);
    if(!toOrder.length) return;
    const itemCap=(s)=>(s.alert>0?s.alert*6:Math.max(s.qty*2,10))*storageMult;
    const itemTarget=(s)=>Math.min(s.alert*2, itemCap(s));
    const totalCost=toOrder.reduce((sum,s)=>{
      const added=+(itemTarget(s)-s.qty).toFixed(3);
      if(added<=0) return sum;
      return sum + +(+(s.price||0)*(1-sup.discount)*added).toFixed(2);
    },0);
    if(totalCost>cash){
      addToast&&addToast({icon:"❌",title:"Fonds insuffisants",
        msg:`Réapprovisionnement : ${totalCost.toFixed(2)}€ requis — solde : ${cash.toFixed(2)}€`,
        color:C.red,tab:"stock"});
      return;
    }
    toOrder.forEach(s=>{
      const target=itemTarget(s);
      const added=+(target-s.qty).toFixed(3);
      if(added>0){const inst=deductCost(s,added);if(inst)setStock(p=>p.map(x=>x.id===s.id?addLot(x,added):x));}
    });
  };

  const pendingQty=(stockId)=>pendingDeliveries.reduce((sum,d)=>{
    const found=d.items.find(i=>i.stockId===stockId);
    return sum+(found?found.qty:0);
  },0);

  const cats=[...new Set(visibleStock.map(s=>s.cat))];
  const catIcon={Viandes:"🥩",Poissons:"🐟",Fins:"⭐",Légumes:"🥦","Légumes & Herbes":"🌿",Herbes:"🌿",Laitiers:"🧈",Épicerie:"🫙",Boissons:"🍷"};
  const toggleCat=(cat)=>setCollapsedCats(p=>({...p,[cat]:!p[cat]}));

  // Sorted stock for list/bar views
  const sortedStock=[...visibleStock].sort((a,b)=>{
    if(sortMode==="urgence"){
      const pa=a.alert>0?(a.qty/a.alert):99;
      const pb=b.alert>0?(b.qty/b.alert):99;
      return pa-pb;
    }
    if(sortMode==="alpha")return a.name.localeCompare(b.name);
    return a.cat.localeCompare(b.cat)||a.name.localeCompare(b.name);
  });

  const getBarColor=(it)=>{
    const cap=(it.alert>0?it.alert*6:Math.max(it.qty*2,10))*storageMult;
    const pct=cap>0?(it.qty/cap)*100:0;
    const alertPct=cap>0?(it.alert/cap)*100:0;
    return pct<=alertPct?C.red:pct<=alertPct*2.5?C.amber:C.green;
  };

  return(
    <div>
      {/* ── KPI Header ── */}
      <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr 1fr":"repeat(auto-fill,minmax(140px,1fr))",gap:bp.isMobile?8:10,marginBottom:14}}>
        {[
          {k:"alerts",          val:alerts.length,               icon:"⚠️",c:alerts.length>0?C.red:C.green,       bg:alerts.length>0?C.redP:C.greenP},
          {k:"inventoryValue",  val:inventoryValue.toFixed(0)+"€",icon:"💶",c:C.amber,bg:C.amberP},
          {k:"forecastShortage",val:criticalIngredients.length,  icon:"🔮",c:criticalIngredients.length>0?C.terra:C.green,bg:criticalIngredients.length>0?C.terraP:C.greenP},
          {k:"criticalFreshness",val:staleItems.length,          icon:"🕐",c:staleItems.length>0?C.red:C.green,     bg:staleItems.length>0?C.redP:C.greenP},
        ].map(s=>(
          <div key={s.k} style={{background:s.bg,border:`1.5px solid ${s.c}22`,borderRadius:12,padding:"12px 14px",textAlign:"center"}}>
            <div style={{fontSize:18,marginBottom:3}}>{s.icon}</div>
            <div style={{fontSize:18,fontWeight:800,color:s.c,fontFamily:F.title,lineHeight:1}}>{s.val}</div>
            <div style={{fontSize:9,color:C.muted,fontFamily:F.body,marginTop:3}}>{tl("stock."+s.k)}</div>
          </div>
        ))}
      </div>

      {/* ── Prévision rupture ── */}
      {criticalIngredients.length>0&&(
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
              const cap=(it.alert>0?it.alert*6:Math.max(it.qty*2,10))*storageMult;
              const pct=cap>0?Math.min(100,(it.qty/cap)*100):0;
              const urgencyColor=it.portions===0?C.red:it.portions<3?C.terra:C.amber;
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
                      <span style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.body}}>
                        {it.name}
                      </span>
                      <span style={{fontSize:10,color:urgencyColor,fontWeight:700,fontFamily:F.body}}>
                        {it.portions===0?"⛔ "+tl("stock.empty"):"~"+it.portions+" "+tl("stock.meals")}
                      </span>
                    </div>
                    <div style={{height:4,background:C.border,borderRadius:99,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:urgencyColor,
                        borderRadius:99,transition:"width 0.4s"}}/>
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
      )}

      {/* ── Supplier toggle ── */}
      <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:12,
        padding:"12px 16px",marginBottom:12,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <span style={{fontSize:16}}>🚛</span>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:1}}>
            {tl("stock.supply")}
          </div>
          <div style={{fontSize:10,color:C.muted,fontFamily:F.body}}>
            {SUPPLIERS[supplierMode||"normal"].desc}
          </div>
        </div>
        <div style={{display:"flex",gap:5}}>
          {Object.values(SUPPLIERS).map(s=>{
            const active=(supplierMode||"normal")===s.id;
            const badge=s.discount>0?`−${(s.discount*100).toFixed(0)}%`:s.discount<0?`+${(-s.discount*100).toFixed(0)}%`:null;
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

      {/* ── Livraisons en cours ── */}
      {pendingDeliveries?.length>0&&(
        <div style={{background:C.navyP,border:`1.5px solid ${C.navy}33`,borderRadius:10,
          padding:"10px 14px",marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,color:C.navy,fontFamily:F.title,marginBottom:6,
            display:"flex",alignItems:"center",gap:5}}>
            <span>🚚</span><span>{tl("stock.deliveries",{n:pendingDeliveries.length,s:pendingDeliveries.length>1?"s":""})}</span>
          </div>
          {pendingDeliveries.map(d=>{
            const secsLeft=Math.max(0,Math.ceil((d.arrivedAt-Date.now())/1000));
            const totalSecs=d.orderedAt?Math.max(1,(d.arrivedAt-d.orderedAt)/1000):secsLeft;
            const pct=Math.max(0,Math.min(100,100-(secsLeft/totalSecs)*100));
            const timeLabel=secsLeft>=120?`${Math.ceil(secsLeft/60)}min`:secsLeft>0?`${secsLeft}s`:"✓";
            return(
              <div key={d.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <div style={{flex:1,fontSize:10,color:C.navy,fontFamily:F.body,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.labels}</div>
                <div style={{width:70,height:4,background:C.border,borderRadius:99,overflow:"hidden",flexShrink:0}}>
                  <div style={{height:"100%",background:C.navy,width:`${pct}%`,transition:"width 1s linear",borderRadius:99}}/>
                </div>
                <span style={{fontSize:9,color:C.navy,fontWeight:700,fontFamily:F.body,flexShrink:0,minWidth:28}}>{timeLabel}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Alerte + actions globales ── */}
      {alerts.length>0&&(
        <div style={{background:C.redP,border:`1.5px solid ${C.red}33`,borderRadius:10,
          padding:"10px 14px",marginBottom:12,
          display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
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

      {/* ── Barre vue + tri ── */}
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

      {/* ══ VUE GRAPHIQUE ══ */}
      {viewMode==="graphique"&&(
        <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"16px 20px"}}>
          <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:14}}>
            📊 {tl("stock.stockLevels")} {visibleStock.length} {tl("stock.ingredients")}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {sortedStock.map(it=>{
              const cap=(it.alert>0?it.alert*6:Math.max(it.qty*2,10))*storageMult;
              const pct=cap>0?Math.min(100,(it.qty/cap)*100):0;
              const alertPct=cap>0?Math.min(100,(it.alert/cap)*100):0;
              const barColor=getBarColor(it);
              const low=it.qty<=it.alert;
              const portions=portionsPerIngredient(it.id);
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
                      width:`${pct}%`,background:barColor,opacity:0.85,
                      transition:"width 0.4s ease"}}/>
                    {/* Alert line */}
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
                      const cap2=(it.alert>0?it.alert*6:Math.max(it.qty*2,10))*storageMult;
                      const wouldExceed=it.qty+pendingQty(it.id)+n>cap2;
                      return(
                        <button key={n} onClick={()=>{
                          if(wouldExceed)return;
                          const inst=deductCost(it,n);
                          if(inst)setStock(p=>p.map(s=>s.id===it.id?addLot(s,n):s));
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
      )}

      {/* ══ VUE LISTE ══ */}
      {viewMode==="liste"&&(
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
                const low=it.qty<=it.alert;
                const cap=(it.alert>0?it.alert*6:Math.max(it.qty*2,10))*storageMult;
                const pct=cap>0?Math.min(100,(it.qty/cap)*100):0;
                const barColor=getBarColor(it);
                const portions=portionsPerIngredient(it.id);
                const amounts=quickAmounts(it.unit).slice(0,2);
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
                          <div style={{height:"100%",width:`${pct}%`,background:barColor,borderRadius:99}}/>
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
                          const wouldExceed=it.qty+pendingQty(it.id)+n>cap;
                          return(
                            <button key={n} onClick={()=>{
                              if(wouldExceed)return;
                              const inst=deductCost(it,n);
                              if(inst)setStock(p=>p.map(s=>s.id===it.id?{...s,qty:Math.min(cap,+(s.qty+n).toFixed(3))}:s));
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
      )}

      {/* ══ VUE CARTES (accordéon par catégorie) ══ */}
      {viewMode==="cartes"&&cats.map(cat=>{
        const items=visibleStock.filter(s=>s.cat===cat);
        const collapsed=collapsedCats[cat];
        const catAlerts=items.filter(s=>s.qty<=s.alert).length;
        return(
          <div key={cat} style={{marginBottom:20}}>
            {/* Accordion header */}
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
                {items.map(it=>{
                  const low=it.qty<=it.alert;
                  const cap=(it.alert>0?it.alert*6:Math.max(it.qty*2,10))*storageMult;
                  const pct=cap>0?Math.min(100,(it.qty/cap)*100):0;
                  const alertPct=cap>0?Math.min(100,(it.alert/cap)*100):0;
                  const barColor=getBarColor(it);
                  const amounts=quickAmounts(it.unit);
                  const portions=portionsPerIngredient(it.id);

                  return(
                    <div key={it.id} style={{
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
                          {/* Prévision portions */}
                          {portions!==null&&(
                            <span style={{fontSize:9,fontWeight:700,
                              color:portions<3?C.red:portions<10?C.amber:C.muted,
                              fontFamily:F.body}}>
                              {portions<3?"⛔":portions<10?"⚠":"🍽"} ~{portions} {tl("stock.meals")}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Gauge */}
                      <div style={{marginBottom:5}}>
                        <div style={{height:20,background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,overflow:"hidden",position:"relative"}}>
                          <div style={{position:"absolute",top:0,left:0,bottom:0,width:`${pct}%`,background:barColor,borderRadius:6,transition:"width 0.4s ease",opacity:0.9}}/>
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
                        {inlineAlertId===it.id?(
                          <div style={{display:"flex",alignItems:"center",gap:3}} onClick={e=>e.stopPropagation()}>
                            <input
                              autoFocus
                              type="number"
                              value={inlineAlertVal}
                              onChange={e=>setInlineAlertVal(e.target.value)}
                              onKeyDown={e=>{
                                if(e.key==="Enter"){
                                  const v=parseFloat(inlineAlertVal);
                                  if(!isNaN(v)&&v>=0) setStock(p=>p.map(s=>s.id===it.id?{...s,alert:v}:s));
                                  setInlineAlertId(null);
                                }
                                if(e.key==="Escape") setInlineAlertId(null);
                              }}
                              onBlur={()=>{
                                const v=parseFloat(inlineAlertVal);
                                if(!isNaN(v)&&v>=0) setStock(p=>p.map(s=>s.id===it.id?{...s,alert:v}:s));
                                setInlineAlertId(null);
                              }}
                              style={{
                                width:40,fontSize:9,padding:"1px 4px",
                                border:`1px solid ${C.red}66`,borderRadius:4,
                                fontFamily:F.body,color:C.red,textAlign:"center",
                                background:"#fff",outline:"none",
                              }}
                            />
                          </div>
                        ):(
                          <span
                            title={tl("stock.clickAlert")}
                            onClick={e=>{e.stopPropagation();setInlineAlertId(it.id);setInlineAlertVal(String(it.alert));}}
                            style={{color:C.red,cursor:"pointer",borderBottom:`1px dashed ${C.red}66`,padding:"0 2px"}}
                          >
                            ⚑ {it.alert}
                          </span>
                        )}
                        <span>{cap} {it.unit}</span>
                      </div>

                      {/* Fraîcheur — lot le plus ancien */}
                      {(()=>{
                        const lots=getLots(it);
                        const f=lots[0]?.freshness??100;
                        const fc=freshnessColor(f);
                        const fl=freshnessLabel(f);
                        return(
                          <div style={{marginBottom:7}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                              <div style={{display:"flex",alignItems:"center",gap:4}}>
                                <span style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{tl("stock.freshness")}</span>
                                {lots.length>1&&<span style={{fontSize:8,background:C.navyP,color:C.navy,borderRadius:99,padding:"0px 5px",fontFamily:F.body,fontWeight:700}}>{lots.length} lots</span>}
                              </div>
                              <span style={{fontSize:9,fontWeight:700,color:fc,fontFamily:F.body,
                                background:fc+"18",borderRadius:99,padding:"1px 6px",
                                border:`1px solid ${fc}33`}}>
                                {f<=0?"⛔ "+fl:`${fl} · ${Math.round(f)}%`}
                              </span>
                            </div>
                            <div style={{height:4,background:C.border,borderRadius:99,overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${Math.max(0,f)}%`,
                                background:fc,borderRadius:99,transition:"width 1s"}}/>
                            </div>
                          </div>
                        );
                      })()}

                      <div style={{fontSize:9,color:C.muted,fontFamily:F.body,marginBottom:8}}>
                        💶 {(it.price||0).toFixed(2)} € / {it.unit}
                      </div>

                      {/* Quick add */}
                      {adjId===it.id?(
                        <div style={{display:"flex",gap:5,alignItems:"center"}} onClick={e=>e.stopPropagation()}>
                          <Inp type="number" value={adjV} onChange={e=>setAdjV(e.target.value)}
                            placeholder="+/-" style={{flex:1,fontSize:11,padding:"4px 7px"}}/>
                          <Btn sm v="primary" onClick={()=>applyAdj(it.id)}>OK</Btn>
                          <Btn sm v="ghost" onClick={()=>setAdjId(null)}>✕</Btn>
                        </div>
                      ):(
                        <div style={{display:"flex",gap:3}} onClick={e=>e.stopPropagation()}>
                          {amounts.map(n=>{
                            const wouldExceed=it.qty+pendingQty(it.id)+n>cap;
                            return(
                              <button key={n} onClick={()=>{
                                if(wouldExceed)return;
                                const inst=deductCost(it,n);
                                if(inst)setStock(p=>p.map(s=>s.id===it.id?addLot(s,n):s));
                              }} disabled={wouldExceed} style={{
                                flex:1,padding:"4px 0",fontSize:10,fontWeight:700,
                                background:wouldExceed?C.bg:C.greenP,border:`1px solid ${wouldExceed?C.border:C.green}33`,
                                borderRadius:6,color:wouldExceed?C.muted:C.green,
                                cursor:wouldExceed?"not-allowed":"pointer",fontFamily:F.body,lineHeight:1,opacity:wouldExceed?0.45:1}}>
                                +{n}
                              </button>
                            );
                          })}
                          <button onClick={()=>setAdjId(it.id)}
                            style={{flex:"0 0 26px",padding:"4px 0",fontSize:11,fontWeight:700,
                              background:C.navyP,border:`1px solid ${C.navy}33`,
                              borderRadius:6,color:C.navy,cursor:"pointer"}}>
                            ±
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

    </div>
  );
}