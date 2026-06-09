import { useEffect, useRef } from "react";
import { C, F, CHEF_LVL, CHEF_TRAININGS, QUEUE_BAR_H, Z } from "../../constants/gameData.js";
import { chefLv } from "../../utils/levelUtils.js";
import { Btn } from "../../components/ui/index.js";
import { useLang } from "../../i18n/index.jsx";
import { useClockNow } from "../../contexts/ClockContext.jsx";

// Brigade row subscribes to clock ticks independently so the parent modal
// doesn't re-render at 250 ms when no brigade timer is active.
function BrigadeTrainingRow({ training, ct, cash, buy, tr }) {
  useClockNow();
  const isBrigadeActive = ct.brigade && ct.brigadeUntil > Date.now();
  const canBuy      = !isBrigadeActive && cash >= training.cost;
  const cannotAfford = !isBrigadeActive && cash < training.cost;
  const brigMs = isBrigadeActive ? Math.max(0, ct.brigadeUntil - Date.now()) : 0;
  const brigH  = Math.floor(brigMs / 3600000);
  const brigM  = Math.floor((brigMs % 3600000) / 60000);
  const rowBg     = isBrigadeActive ? C.greenP : "transparent";
  const rowBorder = isBrigadeActive ? `1.5px solid ${C.green}44` : `1.5px solid ${C.border}`;

  return (
    <div style={{border:rowBorder,borderRadius:14,padding:"14px 16px",
      background:rowBg,display:"flex",alignItems:"center",gap:14}}>
      <div style={{width:42,height:42,borderRadius:12,background:C.surface,
        border:`1.5px solid ${C.border}`,display:"flex",alignItems:"center",
        justifyContent:"center",fontSize:22,flexShrink:0}}>
        {training.icon}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:3}}>
          {training.name}
        </div>
        <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginBottom:6}}>
          {training.desc}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <span style={{fontSize:10,background:C.navyP,color:C.navy,
            border:`1px solid ${C.navy}22`,borderRadius:5,padding:"1px 7px",
            fontFamily:F.body,fontWeight:600}}>+{training.xp} XP</span>
          <span style={{fontSize:10,background:C.amberP,color:C.amber,
            border:`1px solid ${C.amber}22`,borderRadius:5,padding:"1px 7px",
            fontFamily:F.body,fontWeight:600}}>{training.cost} €</span>
          {isBrigadeActive && (
            <span style={{fontSize:10,background:C.greenP,color:C.green,
              border:`1px solid ${C.green}22`,borderRadius:5,padding:"1px 7px",
              fontFamily:F.body,fontWeight:600}}>
              ⏱ {brigH}h{String(brigM).padStart(2,"0")}m restantes
            </span>
          )}
        </div>
      </div>
      <div style={{flexShrink:0,textAlign:"right"}}>
        {isBrigadeActive ? (
          <span style={{fontSize:11,color:C.green,fontWeight:700,fontFamily:F.body}}>
            ✅ {tr("kitchen.active")}
          </span>
        ) : (
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:14,fontWeight:800,fontFamily:F.title,marginBottom:6,
              color:canBuy?C.navy:C.red}}>{training.cost} €</div>
            <Btn sm v={canBuy?"primary":"disabled"} disabled={!canBuy}
              onClick={()=>buy(training)}>
              {cannotAfford ? tr("kitchen.noFunds") : tr("kitchen.fund")}
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChefTrainModal({ kitchen, cash, setCash, addTx, addToast, setKitchen, onClose }) {
  const { t: tr, lang } = useLang();
  const chf = kitchen?.chef ?? {};
  const cl  = chefLv(chf.totalXp ?? 0);
  const clD = CHEF_LVL[Math.min(cl.l, CHEF_LVL.length - 1)];
  const ct  = kitchen?.chefTrainings ?? {};
  const locale = lang === "en" ? "en-US" : "fr-FR";

  const buyLockRef = useRef(false);
  // Reset after each confirmed purchase (totalXp changes) — prevents double-spend without blocking subsequent buys
  useEffect(() => { buyLockRef.current = false; }, [kitchen?.chef?.totalXp]);

  const buy = (training) => {
    if (buyLockRef.current || cash < training.cost) return;
    buyLockRef.current = true;
    setCash(c => +(c - training.cost).toFixed(2));
    addTx("achat", `Formation chef : ${training.name}`, training.cost);
    setKitchen(k => {
      const chef = { ...k.chef, totalXp: (k.chef.totalXp || 0) + training.xp };
      const trainings = { ...(k.chefTrainings ?? {}) };
      if (training.id === "brigade") {
        trainings.brigade    = true;
        trainings.brigadeUntil = Date.now() + 72 * 3600 * 1000;
      } else if (training.id !== "tech") {
        trainings[training.id] = true;
      }
      return { ...k, chef, chefTrainings: trainings };
    });
    addToast({
      icon: training.icon,
      title: tr("kitchen.chefTrainTitle", { name: training.name }),
      msg: tr("kitchen.chefTrainMsg", { xp: training.xp, desc: training.desc }),
      color: C.navy, tab: "servers", silent: true,
    });
  };

  return (
    <div onClick={onClose}
      style={{position:"fixed",top:0,left:0,right:0,bottom:QUEUE_BAR_H,background:"rgba(0,0,0,0.5)",
        zIndex:Z.modal,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:18,
          width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",
          boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.border}`,
          display:"flex",justifyContent:"space-between",alignItems:"center",
          position:"sticky",top:0,background:C.surface,zIndex:10}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,background:clD.color+"1a",
              border:`2px solid ${clD.color}33`,borderRadius:10,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
              {clD.icon}
            </div>
            <div>
              <div style={{fontSize:16,fontWeight:700,color:C.ink,fontFamily:F.title}}>
                {tr("servers.trainTitle",{name:chf.name})}
              </div>
              <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:2}}>
                {clD.name} · Niv.{cl.l} · {cl.r}/{cl.n} XP
              </div>
            </div>
          </div>
          <button onClick={onClose}
            style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,
              width:44,height:44,cursor:"pointer",fontSize:18,color:C.muted,
              display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        {/* ── Balance ────────────────────────────────────────── */}
        <div style={{padding:"10px 22px",background:C.bg,borderBottom:`1px solid ${C.border}`,
          display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,color:C.muted,fontFamily:F.body}}>{tr("servers.balance")}</span>
          <span style={{fontSize:14,fontWeight:700,
            color:cash<200?C.red:C.green,fontFamily:F.title}}>
            {cash.toLocaleString(locale,{minimumFractionDigits:2})} €
          </span>
        </div>

        {/* ── Training list ──────────────────────────────────── */}
        <div style={{padding:"16px 22px",display:"flex",flexDirection:"column",gap:12}}>
          {CHEF_TRAININGS.map(training => {
            if (training.id === "brigade") {
              return <BrigadeTrainingRow key="brigade" training={training} ct={ct} cash={cash} buy={buy} tr={tr} />;
            }

            const isRepeat    = training.id === "tech";
            const isPermanent = !isRepeat;
            const isBought    = isPermanent && !!ct[training.id];
            const canBuy      = !isBought && cash >= training.cost;
            const cannotAfford = !isBought && cash < training.cost;
            const rowBg     = isBought ? C.greenP : "transparent";
            const rowBorder = isBought ? `1.5px solid ${C.green}44` : `1.5px solid ${C.border}`;

            return (
              <div key={training.id}
                style={{border:rowBorder,borderRadius:14,padding:"14px 16px",
                  background:rowBg,display:"flex",alignItems:"center",gap:14}}>

                <div style={{width:42,height:42,borderRadius:12,
                  background:C.surface,border:`1.5px solid ${C.border}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:22,flexShrink:0}}>
                  {training.icon}
                </div>

                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.ink,
                    fontFamily:F.title,marginBottom:3}}>
                    {training.name}
                  </div>
                  <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginBottom:6}}>
                    {training.desc}
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontSize:10,background:C.navyP,color:C.navy,
                      border:`1px solid ${C.navy}22`,borderRadius:5,padding:"1px 7px",
                      fontFamily:F.body,fontWeight:600}}>+{training.xp} XP</span>
                    <span style={{fontSize:10,background:C.amberP,color:C.amber,
                      border:`1px solid ${C.amber}22`,borderRadius:5,padding:"1px 7px",
                      fontFamily:F.body,fontWeight:600}}>{training.cost} €</span>
                    {isRepeat && (
                      <span style={{fontSize:10,background:C.navyP,color:C.navy,
                        border:`1px solid ${C.navy}22`,borderRadius:5,padding:"1px 7px",
                        fontFamily:F.body,fontWeight:600}}>♻ Renouvelable</span>
                    )}
                  </div>
                </div>

                <div style={{flexShrink:0,textAlign:"right"}}>
                  {isBought ? (
                    <span style={{fontSize:11,color:C.green,fontWeight:700,fontFamily:F.body}}>
                      ✅ {tr("kitchen.acquired")}
                    </span>
                  ) : (
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:14,fontWeight:800,fontFamily:F.title,marginBottom:6,
                        color:canBuy?C.navy:C.red}}>{training.cost} €</div>
                      <Btn sm v={canBuy?"primary":"disabled"} disabled={!canBuy}
                        onClick={()=>buy(training)}>
                        {cannotAfford ? tr("kitchen.noFunds") : tr("kitchen.fund")}
                      </Btn>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
