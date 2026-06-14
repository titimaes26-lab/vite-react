import { F } from "../constants/gameData.js";
import { useKitchenView } from "./kitchen/useKitchenView.js";
import { QueueColumn } from "./kitchen/QueueColumn.jsx";
import { PianoColumn } from "./kitchen/PianoColumn.jsx";
import { DoneColumn } from "./kitchen/DoneColumn.jsx";
import { UpgradesGrid } from "./kitchen/UpgradesGrid.jsx";

export function KitchenView({kitchen,setKitchen,stock,setStock,tables,setTables,servers=[],setServers,addToast,cash,setCash,addTx,gameTime,restoLvN=0,bp={}}){
  const {
    clD, unlockedCommis, maxConcurrent, upgDishCookTime, upg,
    now, pianoCompact, togglePiano,
    chefOnShift, freeSrvForServing,
    startDish, startAll, serveTable, moveTicket,
    doneByTable, queueByTable, canServeTable, slotsLeft,
  } = useKitchenView({kitchen,setKitchen,stock,setStock,setTables,servers,setServers,addToast,gameTime});

  return(
    <div>
      {!chefOnShift&&kitchen.chef?.shift&&(
        <div style={{background:"#fef3c7",border:"1.5px solid #f59e0b",borderRadius:10,
          padding:"8px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:10,
          fontSize:11,fontFamily:F.body,fontWeight:700,color:"#92400e"}}>
          <span style={{fontSize:18}}>💤</span>
          <span>Aucun chef en service — {kitchen.chef.name} reprend son créneau à la prochaine plage horaire.</span>
        </div>
      )}
      {!chefOnShift&&!kitchen.chef?.shift&&(
        <div style={{background:"#fdf3dc",border:"1.5px solid #a86e08",borderRadius:10,
          padding:"8px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:10,
          fontSize:11,fontFamily:F.body,fontWeight:600,color:"#a86e08"}}>
          <span style={{fontSize:16}}>⚠️</span>
          <span>Aucun créneau assigné — assigner un créneau dans l'onglet Personnel.</span>
        </div>
      )}

      <div style={{display:"grid",
        gridTemplateColumns:bp.isMobile?"1fr":bp.isTablet?"1fr 1fr":"minmax(200px,1fr) minmax(240px,1.2fr) minmax(200px,1fr)",
        gap:12,marginBottom:20}}>
        <QueueColumn
          queueByTable={queueByTable}
          queueLength={kitchen.queue.length}
          cookingLength={kitchen.cooking.length}
          maxConcurrent={maxConcurrent}
          slotsLeft={slotsLeft}
          chefOnShift={chefOnShift}
          clD={clD}
          unlockedCommis={unlockedCommis}
          upgDishCookTime={upgDishCookTime}
          moveTicket={moveTicket}
          startDish={startDish}
          startAll={startAll}
        />
        <PianoColumn
          cooking={kitchen.cooking}
          maxConcurrent={maxConcurrent}
          slotsLeft={slotsLeft}
          pianoCompact={pianoCompact}
          togglePiano={togglePiano}
          now={now}
          totalDishes={kitchen.totalDishes}
        />
        <DoneColumn
          doneByTable={doneByTable}
          doneCount={kitchen.done.length}
          freeSrvForServing={freeSrvForServing}
          serveTable={serveTable}
          canServeTable={canServeTable}
        />
      </div>

      <UpgradesGrid
        upg={upg}
        cash={cash}
        setCash={setCash}
        setKitchen={setKitchen}
        addTx={addTx}
        addToast={addToast}
        restoLvN={restoLvN}
        bp={bp}
      />
    </div>
  );
}
