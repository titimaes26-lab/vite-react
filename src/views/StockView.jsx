/* ═══════════════════════════════════════════════════════
   src/views/StockView.jsx
   Extrait du monolithe restaurant-manager.jsx
   Dépendances déclarées dans les imports ci-dessous.
═══════════════════════════════════════════════════════ */
import { useState } from "react";
import { C, F, SUPPLIERS } from "../constants/gameData";
import { Btn, Modal, Lbl, Inp, Sel } from "../components/ui";
import { quickAmounts } from "../utils/orderUtils";

export function StockView({stock,setStock,cash,setCash,addTx,kitchen,supplierMode,setSupplierMode,pendingDeliveries,setPendingDeliveries,menu=[],bp={}}){
  const storageMult=1+(kitchen?.upgrades?.stockage||0);
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({name:"",qty:"",unit:"kg",alert:"",cat:"",price:""});
  const [editId,setEditId]=useState(null);
  const [adjId,setAdjId]=useState(null);
  const [adjV,setAdjV]=useState("");
  const [viewMode,setViewMode]=useState("cartes"); // "cartes"|"liste"|"graphique"
  const [collapsedCats,setCollapsedCats]=useState({});
  const [sortMode,setSortMode]=useState("urgence"); // "urgence"|"alpha"|"cat"

  const alerts=stock.filter(s=>s.qty<=s.alert);
  const sup=SUPPLIERS[supplierMode||"premium"];

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
  const inventoryValue=stock.reduce((sum,s)=>sum+(s.qty*(s.price||0)),0);

  /* ── Commander selon prévision ── */
  const orderByForecast=()=>{
    criticalIngredients.forEach(it=>{
      const target=it.alert*6;
      const qty=+(target-it.qty).toFixed(3);
      if(qty>0){
        deductCost(it,qty);
        setStock(p=>p.map(s=>s.id===it.id?{...s,qty:Math.min(target,+(s.qty+qty).toFixed(3))}:s));
      }
    });
  };

  const deductCost=(item,addedQty)=>{
    const unitPrice=(item.price||0)*(1-sup.discount);
    const cost=+(unitPrice*addedQty).toFixed(2);
    if(cost>0){
      setCash(c=>+Math.max(0,c-cost).toFixed(2));
      addTx("achat",`Achat ${item.name} — ${+addedQty.toFixed(3)} ${item.unit} (${sup.name})`,cost);
    }
    if(sup.delay>0){
      setPendingDeliveries(p=>[...p,{
        id:Date.now()+Math.random(),
        items:[{stockId:item.id,qty:addedQty}],
        labels:`${item.name} ×${+addedQty.toFixed(3)} ${item.unit}`,
        arrivedAt:Date.now()+sup.delay*1000,
      }]);
      return false;
    }
    return true;
  };

  const save=()=>{
    if(editId)setStock(p=>p.map(s=>s.id===editId?{...s,...form,qty:+form.qty,alert:+form.alert,price:+(form.price||0)}:s));
    setModal(false);setEditId(null);setForm({name:"",qty:"",unit:"kg",alert:"",cat:"",price:""});
  };
  const applyAdj=(id)=>{
    const v=parseFloat(adjV);
    if(isNaN(v))return;
    const item=stock.find(s=>s.id===id);
    let doAdd=true;
    if(v>0&&item){const instant=deductCost(item,v);if(!instant)doAdd=false;}
    if(doAdd)setStock(p=>p.map(s=>s.id===id?{...s,qty:Math.max(0,+(s.qty+v).toFixed(3))}:s));
    setAdjId(null);setAdjV("");
  };
  const quickAmounts=unit=>{
    if(["kg","L"].includes(unit))return[0.5,1,5];
    if(["btl","pcs","bottes"].includes(unit))return[1,6,12];
    if(unit==="u")return[6,12,24];
    return[1,5,10];
  };
  const restockAll=()=>{
    stock.filter(s=>s.qty<=s.alert).forEach(s=>{
      const added=+(s.alert*4-s.qty).toFixed(3);
      if(added>0){const inst=deductCost(s,added);if(inst)setStock(p=>p.map(x=>x.id===s.id?{...x,qty:+(s.alert*4).toFixed(2)}:x));}
    });
  };

  const cats=[...new Set(stock.map(s=>s.cat))];
  const catIcon={Viandes:"🥩",Poissons:"🐟",Fins:"⭐",Légumes:"🥦","Légumes & Herbes":"🌿",Herbes:"🌿",Laitiers:"🧈",Épicerie:"🫙",Boissons:"🍷"};
  const toggleCat=(cat)=>setCollapsedCats(p=>({...p,[cat]:!p[cat]}));

  // Sorted stock for list/bar views
  const sortedStock=[...stock].sort((a,b)=>{
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
          {label:"Alertes stock",  val:alerts.length,              icon:"⚠️",c:alerts.length>0?C.red:C.green,    bg:alerts.length>0?C.redP:C.greenP},
          {label:"Valeur inventaire",val:inventoryValue.toFixed(0)+"€",icon:"💶",c:C.amber,bg:C.amberP},
          {label:"Ruptures prévues",val:criticalIngredients.length, icon:"🔮",c:criticalIngredients.length>0?C.terra:C.green, bg:criticalIngredients.length>0?C.terraP:C.greenP},
          {label:"Articles en stock",val:stock.length,              icon:"📦",c:C.navy, bg:C.navyP},
        ].map(s=>(
          <div key={s.label} style={{background:s.bg,border:`1.5px solid ${s.c}22`,borderRadius:12,padding:"12px 14px",textAlign:"center"}}>
            <div style={{fontSize:18,marginBottom:3}}>{s.icon}</div>
            <div style={{fontSize:18,fontWeight:800,color:s.c,fontFamily:F.title,lineHeight:1}}>{s.val}</div>
            <div style={{fontSize:9,color:C.muted,fontFamily:F.body,marginTop:3}}>{s.label}</div>
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
                  Prévision rupture
                </div>
                <div style={{fontSize:10,color:C.muted,fontFamily:F.body}}>
                  Ingrédients critiques — basé sur les recettes actives
                </div>
              </div>
            </div>
            <Btn sm v="terra" onClick={orderByForecast} icon="🛒">
              Commander
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
                        {it.portions===0?"⛔ Épuisé":`~${it.portions} repas`}
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
            Approvisionnement
          </div>
          <div style={{fontSize:10,color:C.muted,fontFamily:F.body}}>
            {SUPPLIERS[supplierMode||"premium"].desc}
          </div>
        </div>
        <div style={{display:"flex",gap:5}}>
          {Object.values(SUPPLIERS).map(s=>{
            const active=(supplierMode||"premium")===s.id;
            return(
              <button key={s.id} onClick={()=>setSupplierMode(s.id)} style={{
                padding:"5px 12px",fontSize:11,fontWeight:600,
                background:active?C.navy:C.bg,border:`1.5px solid ${active?C.navy:C.border}`,
                borderRadius:7,color:active?C.white:C.muted,cursor:"pointer",fontFamily:F.body,
                display:"flex",alignItems:"center",gap:4}}>
                <span>{s.icon}</span><span>{s.name}</span>
                {s.discount>0&&<span style={{fontSize:9,background:"#ffffff33",borderRadius:3,padding:"1px 4px"}}>−{(s.discount*100).toFixed(0)}%</span>}
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
            <span>🚚</span><span>{pendingDeliveries.length} livraison{pendingDeliveries.length>1?"s":""} en cours</span>
          </div>
          {pendingDeliveries.map(d=>{
            const secsLeft=Math.max(0,Math.ceil((d.arrivedAt-Date.now())/1000));
            const pct=Math.max(0,Math.min(100,100-(secsLeft/120)*100));
            return(
              <div key={d.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <div style={{flex:1,fontSize:10,color:C.navy,fontFamily:F.body,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.labels}</div>
                <div style={{width:70,height:4,background:C.border,borderRadius:99,overflow:"hidden",flexShrink:0}}>
                  <div style={{height:"100%",background:C.navy,width:`${pct}%`,transition:"width 1s linear",borderRadius:99}}/>
                </div>
                <span style={{fontSize:9,color:C.navy,fontWeight:700,fontFamily:F.body,flexShrink:0,minWidth:24}}>{secsLeft}s</span>
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
            {alerts.length} alerte{alerts.length>1?"s":""} stock bas
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
            ⟳ Tout réapprovisionner
          </button>
        </div>
      )}

      {/* ── Barre vue + tri ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",gap:5}}>
          {[{k:"cartes",icon:"⊞",label:"Cartes"},{k:"liste",icon:"☰",label:"Liste"},{k:"graphique",icon:"📊",label:"Graphique"}].map(v=>(
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
          <span style={{fontSize:10,color:C.muted,fontFamily:F.body}}>Trier :</span>
          {[{k:"urgence",label:"⚠ Urgence"},{k:"cat",label:"Catégorie"},{k:"alpha",label:"A→Z"}].map(s=>(
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
            📊 Niveaux de stock — {stock.length} ingrédients
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
                        ~{portions} repas
                      </span>
                    ):null}
                  </div>
                  <div style={{display:"flex",gap:3,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                    {quickAmounts(it.unit).map(n=>{
                      const cap2=(it.alert>0?it.alert*6:Math.max(it.qty*2,10))*storageMult;
                      const wouldExceed=it.qty+n>cap2;
                      return(
                        <button key={n} onClick={()=>{
                          if(wouldExceed)return;
                          deductCost(it,n);
                          setStock(p=>p.map(s=>s.id===it.id?{...s,qty:Math.min(cap2,+(s.qty+n).toFixed(3))}:s));
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
                {["Ingrédient","Catégorie","Stock","Alerte","Valeur","Repas","Acheter"].map(h=>(
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
                          {portions<3?"⛔":portions<10?"⚠":"✓"} {portions} repas
                        </span>
                      ):<span style={{color:C.muted,fontSize:10}}>—</span>}
                    </td>
                    <td style={{padding:"7px 12px",borderBottom:`1px solid ${C.border}11`}}>
                      <div style={{display:"flex",gap:3}}>
                        {amounts.map(n=>{
                          const wouldExceed=it.qty+n>cap;
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
        const items=stock.filter(s=>s.cat===cat);
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
                {items.length} article{items.length>1?"s":""}
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
                      cursor:"pointer",transition:"all 0.15s"}}
                      className="hovcard"
                      onClick={()=>{setEditId(it.id);setForm({name:it.name,qty:String(it.qty),unit:it.unit,alert:String(it.alert),cat:it.cat,price:String(it.price||0)});setModal(true);}}>

                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.body,flex:1,lineHeight:1.3}}>
                          {it.name}
                        </div>
                        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                          {low
                            ?<span style={{fontSize:9,color:C.red,fontWeight:700,background:C.red+"18",border:`1px solid ${C.red}33`,borderRadius:5,padding:"1px 5px"}}>⚠ Bas</span>
                            :<span style={{fontSize:9,color:C.green,fontWeight:600,background:C.greenP,border:`1px solid ${C.green}33`,borderRadius:5,padding:"1px 5px"}}>✓ OK</span>
                          }
                          {/* Prévision portions */}
                          {portions!==null&&(
                            <span style={{fontSize:9,fontWeight:700,
                              color:portions<3?C.red:portions<10?C.amber:C.muted,
                              fontFamily:F.body}}>
                              {portions<3?"⛔":portions<10?"⚠":"🍽"} ~{portions} repas
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

                      <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.muted,fontFamily:F.body,marginBottom:5}}>
                        <span>0</span>
                        <span style={{color:C.red}}>⚑ {it.alert}</span>
                        <span>{cap} {it.unit}</span>
                      </div>
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
                            const wouldExceed=it.qty+n>cap;
                            return(
                              <button key={n} onClick={()=>{
                                if(wouldExceed)return;
                                deductCost(it,n);
                                setStock(p=>p.map(s=>s.id===it.id?{...s,qty:Math.min(cap,+(s.qty+n).toFixed(3))}:s));
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

      {/* Edit modal */}
      {modal&&(
        <Modal title="Modifier le produit" onClose={()=>{setModal(false);setEditId(null);setForm({name:"",qty:"",unit:"kg",alert:"",cat:""});}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{fontSize:13,color:C.muted,fontFamily:F.body}}>
              {form.name} <span style={{color:C.ink,fontWeight:600}}>({form.unit})</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><Lbl>Alerte minimum</Lbl><Inp type="number" value={form.alert} onChange={e=>setForm(p=>({...p,alert:e.target.value}))}/></div>
              <div><Lbl>Prix d'achat (€/{form.unit})</Lbl><Inp type="number" step="0.01" value={form.price||""} onChange={e=>setForm(p=>({...p,price:e.target.value}))}/></div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:6}}>
              <Btn onClick={()=>{setModal(false);setEditId(null);setForm({name:"",qty:"",unit:"kg",alert:"",cat:""});}} v="ghost">Annuler</Btn>
              <Btn onClick={save}>Sauvegarder</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}