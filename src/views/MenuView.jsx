/* ═══════════════════════════════════════════════════════
   src/views/MenuView.jsx
   Extrait du monolithe restaurant-manager.jsx
   Dépendances déclarées dans les imports ci-dessous.
═══════════════════════════════════════════════════════ */
import { useState } from "react";
import { C, F } from "../constants/gameData";
import { MENU_THEMES } from "../constants/gameConstants";
import { Badge, Btn, Modal, Lbl, Inp, Sel } from "../components/ui";

export function MenuView({menu,setMenu,stock,formulas,setFormulas,activeTheme,setActiveTheme,dailyStats,bp={}}){
  const [mainTab,setMainTab]=useState("carte");
  const [catFilter,setCatFilter]=useState("Tout");
  const [sortBy,setSortBy]=useState("cat");
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState({name:"",cat:"Plats",price:"",prepTime:""});
  const [ingLines,setIngLines]=useState([]);
  const [newIngS,setNewIngS]=useState("");
  const [newIngQ,setNewIngQ]=useState("");
  const [formulaModal,setFormulaModal]=useState(null);
  const [fSelections,setFSelections]=useState({});

  const cats=["Tout","Entrées","Plats","Desserts","Boissons"];
  const catC={Entrées:C.green,Plats:C.terra,Desserts:C.purple,Boissons:C.navy};
  const theme=(MENU_THEMES||[]).find(t=>t.id===(activeTheme||"none"))||{id:"none",icon:"📋",name:"Standard",color:C.muted,desc:"",priceMult:1,repBonus:0,xpMult:1,accent:C.bg};

  /* ── Calculs par plat ── */
  const dishCost=(m)=>
    (m.ingredients||[]).reduce((sum,ing)=>{
      const s=stock.find(x=>x.id===ing.stockId);
      return sum+(s?.price||0)*ing.qty;
    },0);
  const dishMargin=(m)=>{
    const cost=dishCost(m);
    if(!m.price||m.price===0)return null;
    return Math.round(((m.price-cost)/m.price)*100);
  };
  const portionsLeft=(m)=>{
    if(!(m.ingredients||[]).length)return 99;
    return Math.floor(Math.min(...m.ingredients.map(ing=>{
      const s=stock.find(x=>x.id===ing.stockId);
      if(!s||ing.qty===0)return 0;
      return s.qty/ing.qty;
    })));
  };

  /* ── Score de performance 0–100 ── */
  const perfScore=(m)=>{
    const mg=dishMargin(m)||0;
    const maxOrd=Math.max(...menu.map(x=>x.orderCount||0),1);
    const pop=Math.min(100,((m.orderCount||0)/maxOrd)*100);
    const avail=portionsLeft(m)>=5?100:portionsLeft(m)*20;
    return Math.round(mg*0.4+pop*0.4+avail*0.2);
  };

  /* ── Tri ── */
  const base=catFilter==="Tout"?menu:menu.filter(m=>m.cat===catFilter);
  const sorted=[...base].sort((a,b)=>{
    if(sortBy==="margin")  return (dishMargin(b)||0)-(dishMargin(a)||0);
    if(sortBy==="popular") return (b.orderCount||0)-(a.orderCount||0);
    if(sortBy==="stock")   return portionsLeft(a)-portionsLeft(b);
    if(sortBy==="score")   return perfScore(b)-perfScore(a);
    return 0;
  });
  const maxOrders=Math.max(...menu.map(m=>m.orderCount||0),1);

  /* ── Helpers ── */
  const toggleEnabled=(id)=>setMenu(p=>p.map(m=>m.id===id?{...m,enabled:m.enabled===false?true:false}:m));
  const adjustPrice=(id,factor)=>setMenu(p=>p.map(m=>{
    if(m.id!==id)return m;
    const base=m.basePrice||m.price;
    return {...m,price:+(base*factor).toFixed(2),basePrice:base};
  }));
  const resetPrice=(id)=>setMenu(p=>p.map(m=>m.id!==id?m:{...m,price:m.basePrice||m.price,basePrice:undefined}));
  const marginColor=(mg)=>mg>=60?C.green:mg>=40?C.amber:C.red;
  const marginBg=(mg)=>mg>=60?C.greenP:mg>=40?C.amberP:C.redP;

  /* ── Formules ── */
  const openFormula=(preset)=>{
    const sel={};
    preset.cats.forEach(cat=>{
      const first=menu.find(m=>m.cat===cat&&m.enabled!==false);
      if(first)sel[cat]=String(first.id);
    });
    setFSelections(sel);
    setFormulaModal(preset);
  };
  const saveFormula=()=>{
    if(!formulaModal)return;
    const items=Object.entries(fSelections).map(([cat,menuId])=>({cat,menuId:parseInt(menuId)}));
    const totalBase=items.reduce((s,item)=>{
      const d=menu.find(m=>m.id===item.menuId);
      return s+(d?.price||0);
    },0);
    const formulaPrice=+(totalBase*(1-formulaModal.discount)).toFixed(2);
    setFormulas(p=>[...p.filter(f=>f.presetId!==formulaModal.id),{
      id:Date.now(),presetId:formulaModal.id,name:formulaModal.name,
      icon:formulaModal.icon,items,active:true,
      price:formulaPrice,discount:formulaModal.discount,
    }]);
    setFormulaModal(null);
  };

  /* ── Édition ── */
  const del=()=>{setMenu(p=>p.filter(m=>m.id!==editId));setModal(false);};
  const openEdit=(m)=>{
    setEditId(m.id);
    setForm({name:m.name,cat:m.cat,price:String(m.price),prepTime:String(m.prepTime||"")});
    setIngLines((m.ingredients||[]).map(i=>({...i})));
    setNewIngS("");setNewIngQ("");setModal(true);
  };
  const addIngLine=()=>{
    const sid=parseInt(newIngS);const q=parseFloat(newIngQ);
    if(!sid||isNaN(q)||q<=0||ingLines.find(i=>i.stockId===sid))return;
    setIngLines(p=>[...p,{stockId:sid,qty:q}]);setNewIngS("");setNewIngQ("");
  };
  const removeIng=(sid)=>setIngLines(p=>p.filter(i=>i.stockId!==sid));
  const updateIngQty=(sid,val)=>setIngLines(p=>p.map(i=>i.stockId===sid?{...i,qty:parseFloat(val)||0}:i));
  const save=()=>{
    if(!form.name.trim()||!form.price)return;
    const item={name:form.name,cat:form.cat,price:parseFloat(form.price),prepTime:parseInt(form.prepTime)||60,ingredients:ingLines};
    if(editId)setMenu(p=>p.map(m=>m.id===editId?{...m,...item}:m));
    else setMenu(p=>[...p,{id:Date.now(),orderCount:0,enabled:true,...item}]);
    setModal(false);
  };

  const criticalDishes=menu.filter(m=>m.enabled!==false&&portionsLeft(m)<2&&portionsLeft(m)>=0&&(m.ingredients||[]).length>0);
  const disabledCount=menu.filter(m=>m.enabled===false).length;

  return(
    <div style={{background:theme.accent||C.bg,borderRadius:16,padding:16,transition:"background 0.4s"}}>

      {/* Bandeau thème */}
      {theme.id!=="none"&&(
        <div style={{background:theme.color+"18",border:`1.5px solid ${theme.color}33`,
          borderRadius:10,padding:"8px 14px",marginBottom:12,
          display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontSize:18}}>{theme.icon}</span>
          <span style={{fontSize:12,fontWeight:700,color:theme.color,fontFamily:F.title}}>
            Thème : {theme.name}
          </span>
          <span style={{fontSize:11,color:C.muted,fontFamily:F.body}}>— {theme.desc}</span>
          <div style={{marginLeft:"auto",display:"flex",gap:6}}>
            {[`💰 ×${theme.priceMult}`,`⭐ Rép.+${theme.repBonus}`,`🎯 XP×${theme.xpMult}`].map(t=>(
              <span key={t} style={{fontSize:10,background:theme.color,color:"#fff",
                borderRadius:20,padding:"2px 8px",fontFamily:F.body,fontWeight:700}}>{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Alertes stock critique */}
      {criticalDishes.length>0&&(
        <div style={{background:C.redP,border:`1.5px solid ${C.red}33`,borderRadius:10,
          padding:"8px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span>⚠️</span>
          <span style={{fontSize:12,fontWeight:700,color:C.red,fontFamily:F.body}}>
            {criticalDishes.length} plat{criticalDishes.length>1?"s":""} en stock critique :
          </span>
          {criticalDishes.map(m=>(
            <span key={m.id} style={{fontSize:10,background:C.red+"18",color:C.red,
              border:`1px solid ${C.red}33`,borderRadius:5,padding:"2px 7px",fontFamily:F.body,fontWeight:600}}>
              {m.name}
              <button onClick={()=>toggleEnabled(m.id)}
                style={{marginLeft:5,background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:9,fontWeight:700,padding:0}}>
                Désactiver
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Sous-onglets */}
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {[
          {k:"carte",    icon:"📋", label:"Carte"},
          {k:"formules", icon:"🍽",  label:`Formules${(formulas||[]).filter(f=>f.active).length>0?" ("+(formulas||[]).filter(f=>f.active).length+")":""}`},
          {k:"themes",   icon:"🎨",  label:"Thèmes"},
          {k:"perf",     icon:"📊",  label:"Performance"},
        ].map(t=>(
          <button key={t.k} onClick={()=>setMainTab(t.k)} style={{
            padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600,
            background:mainTab===t.k?C.navy:"transparent",
            color:mainTab===t.k?"#fff":C.muted,
            border:`1.5px solid ${mainTab===t.k?C.navy:C.border}`,
            cursor:"pointer",fontFamily:F.body,display:"flex",alignItems:"center",gap:5}}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══ CARTE ══ */}
      {mainTab==="carte"&&(
        <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            marginBottom:14,flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {cats.map(c=>(
                <button key={c} onClick={()=>setCatFilter(c)} style={{
                  background:catFilter===c?(catC[c]||C.green)+"1a":"transparent",
                  color:catFilter===c?(catC[c]||C.green):C.muted,
                  border:`1.5px solid ${catFilter===c?(catC[c]||C.green):C.border}`,
                  borderRadius:20,padding:"4px 12px",fontSize:12,
                  cursor:"pointer",fontFamily:F.body,fontWeight:500}}>
                  {c}
                </button>
              ))}
              {disabledCount>0&&(
                <span style={{fontSize:11,background:C.amberP,color:C.amber,
                  border:`1px solid ${C.amber}33`,borderRadius:20,padding:"4px 10px",
                  fontFamily:F.body,fontWeight:600}}>
                  ⏸ {disabledCount} désactivé{disabledCount>1?"s":""}
                </span>
              )}
            </div>
            <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontSize:10,color:C.muted,fontFamily:F.body}}>Trier :</span>
              {[
                {k:"cat",     label:"Cat."},
                {k:"margin",  label:"💰 Marge"},
                {k:"popular", label:"🔥 Pop."},
                {k:"stock",   label:"⚠ Stock"},
                {k:"score",   label:"📊 Score"},
              ].map(s=>(
                <button key={s.k} onClick={()=>setSortBy(s.k)} style={{
                  fontSize:10,padding:"3px 8px",borderRadius:6,
                  background:sortBy===s.k?C.navy:C.bg,
                  color:sortBy===s.k?"#fff":C.muted,
                  border:`1px solid ${sortBy===s.k?C.navy:C.border}`,
                  cursor:"pointer",fontFamily:F.body}}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr 1fr":"repeat(auto-fill,minmax(240px,1fr))",gap:bp.isMobile?8:12}}>
            {sorted.map(m=>{
              const cc=catC[m.cat]||C.navy;
              const enabled=m.enabled!==false;
              const mg=dishMargin(m);
              const cost=dishCost(m);
              const portions=portionsLeft(m);
              const isTop=(m.orderCount||0)>0&&(m.orderCount||0)===maxOrders;
              const isPriceModified=m.basePrice&&m.basePrice!==m.price;
              const criticalStock=portions<2&&(m.ingredients||[]).length>0;
              const score=perfScore(m);
              const sc=score>=70?C.green:score>=40?C.amber:C.red;
              const effectivePrice=theme.priceMult!==1?+(m.price*theme.priceMult).toFixed(2):m.price;

              return(
                <div key={m.id} style={{
                  background:!enabled?C.bg:m.isSpecial?C.purpleP:C.card,
                  border:`1.5px solid ${!enabled?C.border:criticalStock?C.red+"55":m.isSpecial?C.purple+"66":cc+"44"}`,
                  borderRadius:14,padding:14,opacity:enabled?1:0.6,
                  boxShadow:criticalStock&&enabled?`0 0 0 2px ${C.red}22`:"0 1px 4px rgba(0,0,0,0.05)",
                  transition:"all 0.2s",position:"relative"}}>

                  {isTop&&enabled&&(
                    <div style={{position:"absolute",top:-8,right:10,
                      background:"linear-gradient(135deg,#f5a623,#e07a45)",
                      color:"#fff",fontSize:9,fontWeight:800,borderRadius:20,
                      padding:"2px 8px",boxShadow:"0 2px 6px rgba(0,0,0,0.2)"}}>
                      🔥 Top
                    </div>
                  )}

                  {/* Nom + prix */}
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"flex-start",marginBottom:6}}>
                    <div style={{fontSize:13,fontWeight:600,
                      color:enabled?C.ink:C.muted,fontFamily:F.title,
                      flex:1,lineHeight:1.3,paddingRight:6,
                      textDecoration:enabled?"none":"line-through"}}>
                      {m.name}
                    </div>
                    <div style={{flexShrink:0,textAlign:"right"}}>
                      <div style={{fontSize:16,fontWeight:700,
                        color:isPriceModified?C.purple:theme.priceMult!==1?theme.color:C.terra,
                        fontFamily:F.title}}>
                        {effectivePrice}€
                      </div>
                      {(isPriceModified||theme.priceMult!==1)&&(
                        <div style={{fontSize:9,color:C.muted,textDecoration:"line-through",fontFamily:F.body}}>
                          {m.basePrice||m.price}€
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
                    <Badge color={cc} sm>{m.cat}</Badge>
                    {m.prepTime&&<span style={{fontSize:9,background:C.amberP,color:C.amber,borderRadius:5,padding:"1px 5px",fontFamily:F.body,fontWeight:600}}>⏱{m.prepTime>=60?`${Math.floor(m.prepTime/60)}m`:m.prepTime+"s"}</span>}
                    {(m.ingredients||[]).length>0&&<span style={{fontSize:9,borderRadius:5,padding:"1px 5px",fontFamily:F.body,fontWeight:600,background:criticalStock?C.redP:portions<5?C.amberP:C.greenP,color:criticalStock?C.red:portions<5?C.amber:C.green}}>{criticalStock?"⚠":"🍽"}{portions>=99?"∞":portions}p</span>}
                    {(m.orderCount||0)>0&&<span style={{fontSize:9,background:C.navyP,color:C.navy,borderRadius:5,padding:"1px 5px",fontFamily:F.body,fontWeight:600}}>📊{m.orderCount}</span>}
                    <span style={{fontSize:9,background:sc+"18",color:sc,border:`1px solid ${sc}33`,borderRadius:5,padding:"1px 5px",fontFamily:F.body,fontWeight:700}}>★{score}</span>
                  </div>

                  {/* Marge */}
                  {mg!==null&&(
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,
                      background:marginBg(mg),border:`1px solid ${marginColor(mg)}22`,
                      borderRadius:7,padding:"5px 8px"}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>Coût</div>
                        <div style={{fontSize:11,fontWeight:700,color:C.ink,fontFamily:F.title}}>{cost.toFixed(2)}€</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>Marge</div>
                        <div style={{fontSize:15,fontWeight:800,color:marginColor(mg),fontFamily:F.title}}>{mg}%</div>
                      </div>
                    </div>
                  )}

                  {/* Ingrédients */}
                  {(m.ingredients||[]).length>0&&(
                    <div style={{borderTop:`1px solid ${C.border}`,paddingTop:6,marginBottom:8}}>
                      <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                        {m.ingredients.map(ing=>{
                          const s=stock.find(x=>x.id===ing.stockId);
                          const ok=s&&s.qty>=ing.qty;
                          return <span key={ing.stockId} style={{fontSize:9,fontFamily:F.body,background:ok?C.greenP:C.redP,color:ok?C.green:C.red,border:`1px solid ${ok?C.green:C.red}22`,borderRadius:4,padding:"1px 5px"}}>{s?.name||"?"} ×{ing.qty}</span>;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{borderTop:`1px solid ${C.border}`,paddingTop:8,display:"flex",flexDirection:"column",gap:5}}>
                    <div style={{display:"flex",gap:3,alignItems:"center"}}>
                      <span style={{fontSize:9,color:C.muted,fontFamily:F.body,flexShrink:0}}>Prix :</span>
                      {[{l:"−10%",f:0.90,c:C.red},{l:"−5%",f:0.95,c:C.terra},{l:"+5%",f:1.05,c:C.green},{l:"+10%",f:1.10,c:C.green},{l:"+20%",f:1.20,c:C.purple}].map(({l,f,c})=>(
                        <button key={l} onClick={e=>{e.stopPropagation();adjustPrice(m.id,f);}} style={{flex:1,padding:"2px 0",fontSize:9,fontWeight:700,borderRadius:4,background:c+"14",color:c,border:`1px solid ${c}33`,cursor:"pointer",fontFamily:F.body}}>{l}</button>
                      ))}
                      {isPriceModified&&<button onClick={e=>{e.stopPropagation();resetPrice(m.id);}} style={{padding:"2px 5px",fontSize:9,fontWeight:700,borderRadius:4,background:C.navyP,color:C.navy,border:`1px solid ${C.navy}33`,cursor:"pointer",fontFamily:F.body}}>↺</button>}
                    </div>
                    <button onClick={e=>{e.stopPropagation();toggleEnabled(m.id);}} style={{width:"100%",padding:"4px",fontSize:10,fontWeight:700,borderRadius:6,background:enabled?C.amberP:C.greenP,color:enabled?C.amber:C.green,border:`1.5px solid ${enabled?C.amber:C.green}44`,cursor:"pointer",fontFamily:F.body}}>
                      {enabled?"⏸ Désactiver":"▶ Activer"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ══ FORMULES ══ */}
      {mainTab==="formules"&&(
        <div>
          <div style={{fontSize:12,color:C.muted,fontFamily:F.body,marginBottom:16,lineHeight:1.6}}>
            Les formules combinent plusieurs plats à prix réduit. Une fois configurées et activées, les clients les commandent automatiquement en priorité.
          </div>
          <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr":bp.isTablet?"1fr 1fr":"repeat(auto-fill,minmax(270px,1fr))",gap:bp.isMobile?10:14}}>
            {FORMULA_PRESETS.map(preset=>{
              const existing=(formulas||[]).find(f=>f.presetId===preset.id);
              return(
                <div key={preset.id} style={{background:C.card,
                  border:`1.5px solid ${existing?.active?C.green+"55":C.border}`,
                  borderRadius:14,padding:16,
                  boxShadow:existing?.active?`0 2px 12px ${C.green}18`:"0 1px 4px rgba(0,0,0,0.06)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <span style={{fontSize:26}}>{preset.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:700,color:C.ink,fontFamily:F.title}}>{preset.name}</div>
                      <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:1}}>{preset.desc}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:13,fontWeight:800,color:C.green,fontFamily:F.title}}>−{Math.round(preset.discount*100)}%</div>
                      <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>réduction</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
                    {preset.cats.map(cat=>(
                      <span key={cat} style={{fontSize:10,background:(catC[cat]||C.navy)+"14",color:catC[cat]||C.navy,border:`1px solid ${catC[cat]||C.navy}22`,borderRadius:5,padding:"2px 7px",fontFamily:F.body,fontWeight:600}}>{cat}</span>
                    ))}
                  </div>
                  {existing&&(
                    <div style={{background:C.greenP,border:`1px solid ${C.green}33`,borderRadius:8,padding:"8px 10px",marginBottom:10}}>
                      <div style={{fontSize:11,fontWeight:700,color:C.green,fontFamily:F.body,marginBottom:3}}>✓ {existing.price.toFixed(2)}€</div>
                      {existing.items.map(item=>{
                        const d=menu.find(m=>m.id===item.menuId);
                        return d?<div key={item.menuId} style={{fontSize:10,color:C.muted,fontFamily:F.body}}>· {d.name} ({d.price}€)</div>:null;
                      })}
                    </div>
                  )}
                  <div style={{display:"flex",gap:6}}>
                    <Btn sm v="primary" onClick={()=>openFormula(preset)}>{existing?"✏️ Modifier":"➕ Créer"}</Btn>
                    {existing&&<Btn sm v={existing.active?"terra":"primary"} onClick={()=>setFormulas(p=>p.map(f=>f.id!==existing.id?f:{...f,active:!f.active}))}>{existing.active?"⏸ Pause":"▶ Activer"}</Btn>}
                    {existing&&<Btn sm v="ghost" onClick={()=>setFormulas(p=>p.filter(f=>f.id!==existing.id))}>🗑</Btn>}
                  </div>
                </div>
              );
            })}
          </div>

          {formulaModal&&(
            <Modal title={`Configurer — ${formulaModal.name}`} onClose={()=>setFormulaModal(null)}>
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <div style={{fontSize:12,color:C.muted,fontFamily:F.body}}>
                  Sélectionnez un plat par catégorie. Réduction : <strong style={{color:C.green}}>−{Math.round(formulaModal.discount*100)}%</strong>
                </div>
                {formulaModal.cats.map(cat=>(
                  <div key={cat}>
                    <Lbl>{cat}</Lbl>
                    <Sel value={fSelections[cat]||""} onChange={e=>setFSelections(p=>({...p,[cat]:e.target.value}))}>
                      <option value="">Choisir…</option>
                      {menu.filter(m=>m.cat===cat&&m.enabled!==false).map(m=>(
                        <option key={m.id} value={String(m.id)}>{m.name} — {m.price}€</option>
                      ))}
                    </Sel>
                  </div>
                ))}
                {formulaModal.cats.every(cat=>fSelections[cat])&&(()=>{
                  const total=formulaModal.cats.reduce((s,cat)=>{
                    const d=menu.find(m=>m.id===parseInt(fSelections[cat]));
                    return s+(d?.price||0);
                  },0);
                  const fp=+(total*(1-formulaModal.discount)).toFixed(2);
                  return(
                    <div style={{background:C.greenP,border:`1px solid ${C.green}33`,borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>À la carte : <s>{total.toFixed(2)}€</s></div>
                        <div style={{fontSize:16,fontWeight:800,color:C.green,fontFamily:F.title}}>Formule : {fp}€</div>
                      </div>
                      <div style={{fontSize:22,fontWeight:800,color:C.green,fontFamily:F.title}}>−{Math.round(formulaModal.discount*100)}%</div>
                    </div>
                  );
                })()}
                <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                  <Btn v="ghost" onClick={()=>setFormulaModal(null)}>Annuler</Btn>
                  <Btn v="primary" disabled={!formulaModal.cats.every(cat=>fSelections[cat])} onClick={saveFormula}>Enregistrer</Btn>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* ══ THÈMES ══ */}
      {mainTab==="themes"&&(
        <div>
          <div style={{fontSize:12,color:C.muted,fontFamily:F.body,marginBottom:16,lineHeight:1.6}}>
            Le thème modifie visuellement la carte et applique un multiplicateur de prix global + bonus de réputation sur chaque service.
          </div>
          <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr":"repeat(auto-fill,minmax(240px,1fr))",gap:bp.isMobile?10:14}}>
            {MENU_THEMES.map(t=>{
              const isActive=(activeTheme||"none")===t.id;
              return(
                <div key={t.id} onClick={()=>setActiveTheme(t.id)} style={{
                  background:isActive?t.color+"14":C.card,
                  border:`2px solid ${isActive?t.color:C.border}`,
                  borderRadius:14,padding:16,cursor:"pointer",
                  boxShadow:isActive?`0 4px 16px ${t.color}33`:"0 1px 4px rgba(0,0,0,0.06)",
                  transition:"all 0.2s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                    <div style={{width:44,height:44,background:t.color+"18",border:`2px solid ${t.color}44`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{t.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:700,color:t.color,fontFamily:F.title}}>
                        {t.name}
                        {isActive&&<span style={{marginLeft:6,fontSize:9,background:t.color,color:"#fff",borderRadius:20,padding:"1px 7px",fontFamily:F.body,fontWeight:700}}>Actif</span>}
                      </div>
                      <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:2}}>{t.desc}</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {[`💰 ×${t.priceMult}`,`⭐ +${t.repBonus} rép.`,`🎯 ×${t.xpMult} XP`].map(tag=>(
                      <span key={tag} style={{fontSize:10,background:t.color+"14",color:t.color,border:`1px solid ${t.color}33`,borderRadius:6,padding:"2px 8px",fontFamily:F.body,fontWeight:600}}>{tag}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ PERFORMANCE ══ */}
      {mainTab==="perf"&&(
        <div>
          {/* KPIs */}
          <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr 1fr":"repeat(auto-fill,minmax(130px,1fr))",gap:10,marginBottom:20}}>
            {[
              {l:"Plats actifs",   v:menu.filter(m=>m.enabled!==false).length,      i:"✅",c:C.green, bg:C.greenP},
              {l:"Désactivés",     v:menu.filter(m=>m.enabled===false).length,       i:"⏸", c:C.amber, bg:C.amberP},
              {l:"CA généré",      v:menu.reduce((s,m)=>s+(m.price*(m.orderCount||0)),0).toFixed(0)+"€",i:"💶",c:C.terra, bg:C.terraP},
              {l:"Commandes total",v:menu.reduce((s,m)=>s+(m.orderCount||0),0),     i:"📊",c:C.navy,  bg:C.navyP},
            ].map(s=>(
              <div key={s.l} style={{background:s.bg,border:`1px solid ${s.c}22`,borderRadius:12,padding:"12px",textAlign:"center"}}>
                <div style={{fontSize:18,marginBottom:3}}>{s.i}</div>
                <div style={{fontSize:18,fontWeight:800,color:s.c,fontFamily:F.title,lineHeight:1}}>{s.v}</div>
                <div style={{fontSize:9,color:C.muted,fontFamily:F.body,marginTop:3}}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Tableau */}
          <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
            <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:14}}>📊</span>
              <span style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title}}>Tableau de performance — {menu.length} plats</span>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontFamily:F.body,minWidth:560}}>
                <thead>
                  <tr style={{background:C.bg}}>
                    {["Plat","Cat.","Prix","Coût","Marge","Cmdes","CA","Stock","Score"].map(h=>(
                      <th key={h} style={{padding:"7px 10px",fontSize:9,fontWeight:700,color:C.muted,textAlign:"left",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...menu].sort((a,b)=>perfScore(b)-perfScore(a)).map((m,i)=>{
                    const mg=dishMargin(m)||0;
                    const cost=dishCost(m);
                    const portions=portionsLeft(m);
                    const ca=+(m.price*(m.orderCount||0)).toFixed(2);
                    const score=perfScore(m);
                    const sc=score>=70?C.green:score>=40?C.amber:C.red;
                    const cc=catC[m.cat]||C.navy;
                    return(
                      <tr key={m.id} style={{background:i%2===0?C.card:C.bg,opacity:m.enabled===false?0.5:1}}>
                        <td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}11`}}>
                          <div style={{fontSize:11,fontWeight:600,color:C.ink,whiteSpace:"nowrap"}}>{m.name}</div>
                          {m.enabled===false&&<span style={{fontSize:8,color:C.amber,fontWeight:700}}>⏸ off</span>}
                        </td>
                        <td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}11`}}>
                          <span style={{fontSize:9,background:cc+"14",color:cc,border:`1px solid ${cc}22`,borderRadius:4,padding:"1px 5px",fontWeight:600}}>{m.cat}</span>
                        </td>
                        <td style={{padding:"8px 10px",fontSize:11,fontWeight:700,color:C.terra,borderBottom:`1px solid ${C.border}11`,whiteSpace:"nowrap"}}>{m.price}€</td>
                        <td style={{padding:"8px 10px",fontSize:10,color:C.muted,borderBottom:`1px solid ${C.border}11`,whiteSpace:"nowrap"}}>{cost.toFixed(2)}€</td>
                        <td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}11`}}>
                          <div style={{display:"flex",alignItems:"center",gap:5}}>
                            <div style={{width:36,height:4,background:C.border,borderRadius:99,overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${Math.min(100,mg)}%`,background:marginColor(mg),borderRadius:99}}/>
                            </div>
                            <span style={{fontSize:10,fontWeight:700,color:marginColor(mg)}}>{mg}%</span>
                          </div>
                        </td>
                        <td style={{padding:"8px 10px",fontSize:11,fontWeight:700,color:C.navy,borderBottom:`1px solid ${C.border}11`}}>{m.orderCount||0}</td>
                        <td style={{padding:"8px 10px",fontSize:11,fontWeight:700,color:C.amber,borderBottom:`1px solid ${C.border}11`,whiteSpace:"nowrap"}}>{ca}€</td>
                        <td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}11`}}>
                          <span style={{fontSize:10,fontWeight:600,color:portions<2?C.red:portions<5?C.amber:C.green}}>{portions>=99?"∞":portions}</span>
                        </td>
                        <td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}11`}}>
                          <div style={{width:30,height:30,borderRadius:"50%",background:sc+"18",border:`2px solid ${sc}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:sc}}>{score}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal édition */}
      {modal&&(
        <Modal title={editId?"Modifier le plat":"Nouveau plat"} onClose={()=>setModal(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:12,alignItems:"end"}}>
              <div><Lbl>Nom du plat</Lbl><Inp value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></div>
              <div style={{width:90}}><Lbl>Prix (€)</Lbl><Inp type="number" value={form.price} onChange={e=>setForm(p=>({...p,price:e.target.value}))}/></div>
              <div style={{width:100}}><Lbl>Prép. (sec)</Lbl><Inp type="number" value={form.prepTime} placeholder="60" onChange={e=>setForm(p=>({...p,prepTime:e.target.value}))}/></div>
            </div>
            <div><Lbl>Catégorie</Lbl>
              <Sel value={form.cat} onChange={e=>setForm(p=>({...p,cat:e.target.value}))}>
                {["Entrées","Plats","Desserts","Boissons"].map(c=><option key={c}>{c}</option>)}
              </Sel>
            </div>
            <div style={{background:C.terraP,border:`1.5px solid ${C.terra}22`,borderRadius:12,padding:14}}>
              <div style={{fontSize:12,fontWeight:600,color:C.terra,marginBottom:12,fontFamily:F.body}}>🧂 Recette</div>
              {ingLines.length===0
                ?<div style={{fontSize:12,color:C.muted,fontStyle:"italic",fontFamily:F.body,marginBottom:12}}>Aucun ingrédient défini</div>
                :<div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
                  {ingLines.map(ing=>{
                    const s=stock.find(x=>x.id===ing.stockId);
                    const enough=s&&s.qty>=ing.qty;
                    return(
                      <div key={ing.stockId} style={{display:"flex",alignItems:"center",gap:8,background:C.surface,border:`1px solid ${enough?C.border:C.red+"44"}`,borderRadius:8,padding:"7px 10px"}}>
                        <span style={{flex:1,fontSize:12,fontWeight:600,color:C.ink,fontFamily:F.body}}>{s?.name||"?"} <span style={{color:C.muted,fontWeight:400}}>({s?.unit})</span></span>
                        <input type="number" value={ing.qty} step="0.01" min="0.01" onChange={e=>updateIngQty(ing.stockId,e.target.value)}
                          style={{width:70,background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 7px",fontSize:12,fontFamily:F.body,color:C.ink,textAlign:"right"}}/>
                        <span style={{fontSize:11,color:C.muted,fontFamily:F.body,minWidth:24}}>{s?.unit}</span>
                        {!enough&&<span style={{fontSize:10,color:C.red}}>⚠</span>}
                        <button onClick={()=>removeIng(ing.stockId)} style={{background:C.redP,border:`1px solid ${C.red}22`,borderRadius:6,color:C.red,cursor:"pointer",width:24,height:24,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                      </div>
                    );
                  })}
                </div>
              }
              <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                <div style={{flex:1}}><Lbl>Élément primaire</Lbl>
                  <Sel value={newIngS} onChange={e=>setNewIngS(e.target.value)}>
                    <option value="">Choisir…</option>
                    {stock.filter(s=>!ingLines.find(i=>i.stockId===s.id)).map(s=>(
                      <option key={s.id} value={s.id}>{s.name} ({s.unit}) — {s.qty} en stock</option>
                    ))}
                  </Sel>
                </div>
                <div style={{width:80}}><Lbl>Qté</Lbl><Inp type="number" value={newIngQ} placeholder="0.0" onChange={e=>setNewIngQ(e.target.value)}/></div>
                <Btn v="terra" onClick={addIngLine} disabled={!newIngS||!newIngQ} icon="+">Ajouter</Btn>
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"space-between",marginTop:4}}>
              <div>{editId&&<Btn v="danger" onClick={del}>Supprimer</Btn>}</div>
              <div style={{display:"flex",gap:10}}>
                <Btn onClick={()=>setModal(false)} v="ghost">Annuler</Btn>
                <Btn onClick={save} disabled={!form.name||!form.price}>Sauvegarder</Btn>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   STOCK VIEW
═══════════════════════════════════════════════════════ */