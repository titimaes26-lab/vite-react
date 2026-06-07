import { useState, useCallback, useMemo } from "react";
import { C, SUPPLIERS } from "../../constants/gameData.js";
import { addLot, stockCap } from "../../utils/orderUtils.js";

export const catIcon = {Viandes:"🥩",Poissons:"🐟",Fins:"⭐",Légumes:"🥦","Légumes & Herbes":"🌿",Herbes:"🌿",Laitiers:"🧈",Épicerie:"🫙",Boissons:"🍷"};

export function useStockView({ stock, setStock, cash, setCash, addTx, addToast, addDayStat, kitchen, supplierMode, setSupplierMode, pendingDeliveries, setPendingDeliveries, menu, restoLvN }) {
  const storageMult = 1+(kitchen?.upgrades?.stockage||0);
  const dec = (d) => Array.isArray(d.ingredients)?d.ingredients:[];

  // Fix #2+#8: single memoized Set — enabled filter consistent with visibleStock
  const unlockedIds = useMemo(()=>new Set(
    menu.filter(d=>d.enabled!==false&&(d.unlockLevel??0)<=restoLvN)
      .flatMap(d=>dec(d).map(i=>i.stockId))
  ),[menu,restoLvN]);

  // Fix #8: memoized derived arrays
  const visibleStock = useMemo(()=>stock.filter(s=>unlockedIds.has(s.id)),[stock,unlockedIds]);

  const [viewMode, setViewMode] = useState("cartes");
  const [collapsedCats, setCollapsedCats] = useState({});
  const [sortMode, setSortMode] = useState("urgence");

  // Fix #4+#8: alert>0 guard prevents silent no-op when alert===0
  const alerts = useMemo(()=>stock.filter(s=>s.alert>0&&unlockedIds.has(s.id)&&s.qty<=s.alert),[stock,unlockedIds]);
  const staleItems = useMemo(()=>visibleStock.filter(s=>(s.freshness??100)<20&&s.qty>0),[visibleStock]);

  const sup = useMemo(()=>SUPPLIERS[supplierMode]??SUPPLIERS["normal"],[supplierMode]);

  // Fix #5: useCallback so React.memo children don't re-render on identity churn
  const portionsPerIngredient = useCallback((stockId)=>{
    const uses = menu.filter(m=>m.enabled!==false&&(m.unlockLevel??0)<=restoLvN)
      .flatMap(m=>(m.ingredients||[]).filter(i=>i.stockId===stockId));
    if(!uses.length) return null;
    const item = stock.find(s=>s.id===stockId);
    if(!item) return null;
    const minUse = Math.min(...uses.map(u=>u.qty));
    return minUse>0?Math.floor(item.qty/minUse):null;
  },[menu,restoLvN,stock]);

  // Fix #7: memoized to avoid O(N×M) scan on every render
  const criticalIngredients = useMemo(()=>
    [...stock]
      .map(it=>({...it,portions:portionsPerIngredient(it.id)}))
      .filter(it=>it.portions!==null&&it.portions<10)
      .sort((a,b)=>(a.portions??999)-(b.portions??999))
      .slice(0,3),
  [stock,portionsPerIngredient]);

  const inventoryValue = useMemo(()=>visibleStock.reduce((sum,s)=>sum+(s.qty*(s.price||0)),0),[visibleStock]);

  // Fix #6: useCallback + null guard on pendingDeliveries
  const pendingQty = useCallback((stockId)=>(pendingDeliveries??[]).reduce((sum,d)=>{
    const found = d.items.find(i=>i.stockId===stockId);
    return sum+(found?found.qty:0);
  },0),[pendingDeliveries]);

  const deductCost = useCallback((item,addedQty)=>{
    const unitPrice = (item.price||0)*(1-sup.discount);
    const cost = +(unitPrice*addedQty).toFixed(2);
    if(cost>0){
      setCash(c=>+(c-cost).toFixed(2));
      addTx("achat",`Achat ${item.name} — ${+addedQty.toFixed(3)} ${item.unit} (${sup.name})`,cost);
      addDayStat&&addDayStat("stock",cost);
    }
    if(sup.delay>0){
      const now = Date.now();
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
  },[sup,setCash,addTx,addDayStat,setPendingDeliveries]);

  const handleOrder = useCallback((item,qty)=>{
    const inst = deductCost(item,qty);
    if(inst) setStock(p=>p.map(s=>s.id===item.id?addLot(s,qty):s));
  },[deductCost,setStock]);

  const handleAdjust = useCallback((id,delta)=>{
    setStock(p=>p.map(s=>s.id===id?{...s,qty:Math.max(0,+(s.qty+delta).toFixed(3))}:s));
  },[setStock]);

  const handleSetAlert = useCallback((id,val)=>{
    setStock(p=>p.map(s=>s.id===id?{...s,alert:val}:s));
  },[setStock]);

  // Fix #3+#10: storageMult applied to target; wrapped in useCallback
  const orderByForecast = useCallback(()=>{
    criticalIngredients.forEach(it=>{
      const qty = +(it.alert*6*storageMult-it.qty-pendingQty(it.id)).toFixed(3);
      if(qty>0){
        const inst = deductCost(it,qty);
        if(inst) setStock(p=>p.map(s=>s.id===it.id?addLot(s,qty):s));
      }
    });
  },[criticalIngredients,storageMult,pendingQty,deductCost,setStock]);

  // Fix #9+#10: uses stockCap; wrapped in useCallback
  const restockAll = useCallback(()=>{
    if(!alerts.length) return;
    const itemTarget = (s)=>Math.min(s.alert*2, stockCap(s,storageMult));
    const totalCost = alerts.reduce((sum,s)=>{
      const added = +(itemTarget(s)-s.qty).toFixed(3);
      return added>0?sum + +(+(s.price||0)*(1-sup.discount)*added).toFixed(2):sum;
    },0);
    if(totalCost>cash){
      addToast&&addToast({icon:"❌",title:"Fonds insuffisants",
        msg:`Réapprovisionnement : ${totalCost.toFixed(2)}€ requis — solde : ${cash.toFixed(2)}€`,
        color:C.red,tab:"stock"});
      return;
    }
    alerts.forEach(s=>{
      const added = +(itemTarget(s)-s.qty).toFixed(3);
      if(added>0){
        const inst = deductCost(s,added);
        if(inst) setStock(p=>p.map(x=>x.id===s.id?addLot(x,added):x));
      }
    });
  },[alerts,storageMult,sup,cash,addToast,deductCost,setStock]);

  // Fix #8: cats and sortedStock memoized
  const cats = useMemo(()=>[...new Set(visibleStock.map(s=>s.cat))],[visibleStock]);
  const toggleCat = (cat)=>setCollapsedCats(p=>({...p,[cat]:!p[cat]}));

  const sortedStock = useMemo(()=>[...visibleStock].sort((a,b)=>{
    if(sortMode==="urgence"){
      const pa = a.alert>0?(a.qty/a.alert):99;
      const pb = b.alert>0?(b.qty/b.alert):99;
      return pa-pb;
    }
    if(sortMode==="alpha") return a.name.localeCompare(b.name);
    return a.cat.localeCompare(b.cat)||a.name.localeCompare(b.name);
  }),[visibleStock,sortMode]);

  return {
    storageMult, visibleStock, viewMode, setViewMode, collapsedCats, sortMode, setSortMode,
    alerts, staleItems, portionsPerIngredient, criticalIngredients, inventoryValue,
    pendingQty, deductCost, handleOrder, handleAdjust, handleSetAlert,
    orderByForecast, restockAll, cats, toggleCat, sortedStock,
  };
}
