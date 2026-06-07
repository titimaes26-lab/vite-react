import { C, F, KITCHEN_UPGRADES } from "../../constants/gameData.js";
import { Btn } from "../../components/ui/index.js";
import { useLang } from "../../i18n/index.jsx";

export function UpgradesGrid({ upg, cash, setCash, setKitchen, addTx, addToast, restoLvN, bp }) {
  const { t: tl } = useLang();

  return (
    <div>
      <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,
        marginBottom:10,display:"flex",alignItems:"center",gap:7}}>
        🔧 {tl("kitchen.upgrades")}
      </div>
      <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr 1fr":"repeat(auto-fill,minmax(200px,1fr))",gap:bp.isMobile?8:10}}>
        {KITCHEN_UPGRADES.map(upItem=>{
          const isLocked = restoLvN<(upItem.minRestoLevel||0);
          const curLv = upg[upItem.id]||0;
          const maxLv = upItem.levels.length;
          const nextLv = upItem.levels[curLv]||null;
          const isMax = curLv>=maxLv;
          const canAfford = nextLv&&cash>=nextLv.cost;
          const activeBonuses = upItem.levels.slice(0,curLv).map(l=>{
            if(l.bonus.slots) return `+${l.bonus.slots} feu`;
            if(l.bonus.speed) return `−${Math.round(l.bonus.speed*100)}% cuisson`;
            if(l.bonus.storage) return `Stock ×${1+upItem.levels.slice(0,curLv).reduce((s,x)=>s+(x.bonus.storage||0),0)}`;
            if(l.bonus.clean) return `Nettoyage −${l.bonus.clean}s`;
            return "";
          }).filter(Boolean);

          if(isLocked){
            return(
              <div key={upItem.id} style={{
                background:C.card,opacity:0.55,
                border:`1.5px dashed ${C.border}`,
                borderRadius:12,padding:12,position:"relative"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                  <span style={{fontSize:20,filter:"grayscale(1)"}}>{upItem.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.muted,fontFamily:F.body,
                      whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{upItem.name}</div>
                  </div>
                </div>
                <div style={{fontSize:10,color:C.muted,fontFamily:F.body}}>{upItem.desc}</div>
                <div style={{marginTop:7,fontSize:10,fontWeight:700,color:C.terra,fontFamily:F.body}}>
                  {tl("kitchen.lockedUpgrade",{n:upItem.minRestoLevel})}
                </div>
              </div>
            );
          }

          return(
            <div key={upItem.id} style={{
              background:isMax?C.greenP:C.card,
              border:`1.5px solid ${isMax?C.green:C.border}`,
              borderRadius:12,padding:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                <span style={{fontSize:20}}>{upItem.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.body,
                    whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{upItem.name}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:3,marginBottom:7}}>
                {upItem.levels.map((_,i)=>(
                  <div key={i} style={{flex:1,height:3,borderRadius:3,
                    background:i<curLv?C.green:C.border}}/>
                ))}
              </div>
              {activeBonuses.length>0&&(
                <div style={{fontSize:9,color:C.green,fontFamily:F.body,fontWeight:600,marginBottom:6}}>
                  ✓ {activeBonuses.join(" · ")}
                </div>
              )}
              {isMax?(
                <div style={{fontSize:10,color:C.green,fontWeight:700,fontFamily:F.body}}>✅ Max</div>
              ):(
                <div>
                  <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:5}}>{nextLv.label}</div>
                  <Btn v={canAfford?"amber":"disabled"} sm
                    onClick={()=>{
                      if(!canAfford)return;
                      const newUpg = {...upg,[upItem.id]:curLv+1};
                      setKitchen(k=>({...k,upgrades:newUpg}));
                      setCash(p=>+(p-nextLv.cost).toFixed(2));
                      addTx("dépense",`Amélioration cuisine : ${upItem.name} N${curLv+1}`,nextLv.cost);
                      addToast({icon:upItem.icon,title:`${upItem.name} N${curLv+1}`,
                        msg:nextLv.label,color:C.amber,tab:"cuisine",silent:true});
                    }}>
                    💰 {nextLv.cost}€
                  </Btn>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
