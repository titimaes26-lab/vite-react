import { useState, useCallback, useMemo } from "react";
import { C } from "../../constants/gameData.js";

export function useMenuView({ menu, setMenu, stock, formulas, setFormulas, restoLvN=0 }) {
  const [mainTab, setMainTab] = useState("carte");
  const [catFilter, setCatFilter] = useState("Tout");
  const [sortBy, setSortBy] = useState("cat");
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name:"", cat:"Plats", price:"", prepTime:"" });
  const [ingLines, setIngLines] = useState([]);
  const [newIngS, setNewIngS] = useState("");
  const [newIngQ, setNewIngQ] = useState("");
  const [formulaModal, setFormulaModal] = useState(null);
  const [fSelections, setFSelections] = useState({});

  const unlocked = useCallback((m) => (m.unlockLevel??0) <= restoLvN, [restoLvN]);

  const dishCost = useCallback((m) =>
    (m.ingredients||[]).reduce((sum,ing) => {
      const s = stock.find(x=>x.id===ing.stockId);
      return sum + (s?.price||0)*ing.qty;
    }, 0), [stock]);

  const dishMargin = useCallback((m) => {
    const cost = dishCost(m);
    if(!m.price||m.price===0) return null;
    return Math.round(((m.price-cost)/m.price)*100);
  }, [dishCost]);

  const portionsLeft = useCallback((m) => {
    if(!(m.ingredients||[]).length) return 99;
    return Math.floor(Math.min(...m.ingredients.map(ing => {
      const s = stock.find(x=>x.id===ing.stockId);
      if(!s||ing.qty===0) return 0;
      return s.qty/ing.qty;
    })));
  }, [stock]);

  const perfScore = useCallback((m) => {
    const mg = dishMargin(m)||0;
    const maxOrd = Math.max(...menu.map(x=>x.orderCount||0), 1);
    const pop = Math.min(100, ((m.orderCount||0)/maxOrd)*100);
    const avail = portionsLeft(m)>=5?100:portionsLeft(m)*20;
    return Math.round(mg*0.4+pop*0.4+avail*0.2);
  }, [dishMargin, portionsLeft, menu]);

  const marginColor = useCallback((mg) => mg>=60?C.green:mg>=40?C.amber:C.red, []);
  const marginBg = useCallback((mg) => mg>=60?C.greenP:mg>=40?C.amberP:C.redP, []);

  const maxOrders = useMemo(() => Math.max(...menu.map(m=>m.orderCount||0), 1), [menu]);

  const { sorted, locked } = useMemo(() => {
    const base = catFilter==="Tout" ? menu : menu.filter(m=>m.cat===catFilter);
    const s = [...base.filter(unlocked)].sort((a,b) => {
      if(sortBy==="margin")  return (dishMargin(b)||0)-(dishMargin(a)||0);
      if(sortBy==="popular") return (b.orderCount||0)-(a.orderCount||0);
      if(sortBy==="stock")   return portionsLeft(a)-portionsLeft(b);
      if(sortBy==="score")   return perfScore(b)-perfScore(a);
      return 0;
    });
    const l = base.filter(m=>!unlocked(m)).sort((a,b)=>(a.unlockLevel??0)-(b.unlockLevel??0)).slice(0,3);
    return { sorted:s, locked:l };
  }, [menu, catFilter, sortBy, unlocked, dishMargin, portionsLeft, perfScore]);

  const criticalDishes = useMemo(() =>
    menu.filter(m=>m.enabled!==false&&unlocked(m)&&portionsLeft(m)<2&&portionsLeft(m)>=0&&(m.ingredients||[]).length>0),
    [menu, unlocked, portionsLeft]);

  const disabledCount = useMemo(() => menu.filter(m=>m.enabled===false&&unlocked(m)).length, [menu, unlocked]);
  const lockedAllCount = useMemo(() => menu.filter(m=>!unlocked(m)).length, [menu, unlocked]);

  const toggleEnabled = useCallback((id) =>
    setMenu(p=>p.map(m=>m.id===id?{...m,enabled:m.enabled===false?true:false}:m)), [setMenu]);

  const adjustPrice = useCallback((id, factor) =>
    setMenu(p=>p.map(m=>{
      if(m.id!==id) return m;
      const base = m.basePrice||m.price;
      return {...m,price:+(base*factor).toFixed(2),basePrice:base};
    })), [setMenu]);

  const resetPrice = useCallback((id) =>
    setMenu(p=>p.map(m=>m.id!==id?m:{...m,price:m.basePrice||m.price,basePrice:undefined})), [setMenu]);

  const openFormula = useCallback((preset) => {
    const sel = {};
    preset.cats.forEach(cat => {
      const first = menu.find(m=>m.cat===cat&&m.enabled!==false&&unlocked(m));
      if(first) sel[cat] = String(first.id);
    });
    setFSelections(sel);
    setFormulaModal(preset);
  }, [menu, unlocked]);

  const saveFormula = useCallback(() => {
    if(!formulaModal) return;
    const items = Object.entries(fSelections).map(([cat,menuId])=>({cat,menuId:parseInt(menuId)}));
    const totalBase = items.reduce((s,item)=>{
      const d = menu.find(m=>m.id===item.menuId);
      return s+(d?.price||0);
    }, 0);
    setFormulas(p=>[...p.filter(f=>f.presetId!==formulaModal.id), {
      id:Date.now(),presetId:formulaModal.id,name:formulaModal.name,
      icon:formulaModal.icon,items,active:true,
      price:+(totalBase*(1-formulaModal.discount)).toFixed(2),discount:formulaModal.discount,
    }]);
    setFormulaModal(null);
  }, [formulaModal, fSelections, menu, setFormulas]);

  const del = useCallback(() => { setMenu(p=>p.filter(m=>m.id!==editId)); setModal(false); }, [editId, setMenu]);
  const openEdit = useCallback((m) => {
    setEditId(m.id);
    setForm({name:m.name,cat:m.cat,price:String(m.price),prepTime:String(m.prepTime||"")});
    setIngLines((m.ingredients||[]).map(i=>({...i})));
    setNewIngS(""); setNewIngQ(""); setModal(true);
  }, []);

  const addIngLine = useCallback(() => {
    const sid=parseInt(newIngS), q=parseFloat(newIngQ);
    if(!sid||isNaN(q)||q<=0||ingLines.find(i=>i.stockId===sid)) return;
    setIngLines(p=>[...p,{stockId:sid,qty:q}]); setNewIngS(""); setNewIngQ("");
  }, [newIngS, newIngQ, ingLines]);

  const removeIng = useCallback((sid) => setIngLines(p=>p.filter(i=>i.stockId!==sid)), []);
  const updateIngQty = useCallback((sid,val) => setIngLines(p=>p.map(i=>i.stockId===sid?{...i,qty:parseFloat(val)||0}:i)), []);
  const save = useCallback(() => {
    if(!form.name.trim()||!form.price) return;
    const item = {name:form.name,cat:form.cat,price:parseFloat(form.price),prepTime:parseInt(form.prepTime)||60,ingredients:ingLines};
    if(editId) setMenu(p=>p.map(m=>m.id===editId?{...m,...item}:m));
    else setMenu(p=>[...p,{id:Date.now(),orderCount:0,enabled:true,unlockLevel:0,...item}]);
    setModal(false);
  }, [form, ingLines, editId, setMenu]);

  return {
    mainTab, setMainTab, catFilter, setCatFilter, sortBy, setSortBy,
    modal, setModal, editId, form, setForm, ingLines, setIngLines,
    newIngS, setNewIngS, newIngQ, setNewIngQ,
    formulaModal, setFormulaModal, fSelections, setFSelections,
    sorted, locked, maxOrders, criticalDishes, disabledCount, lockedAllCount,
    unlocked, dishCost, dishMargin, portionsLeft, perfScore, marginColor, marginBg,
    toggleEnabled, adjustPrice, resetPrice,
    openFormula, saveFormula, del, openEdit, addIngLine, removeIng, updateIngQty, save,
  };
}
