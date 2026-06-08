import { C, F, CHEF_LVL } from "../../constants/gameData.js";
import { chefLv } from "../../utils/levelUtils.js";
import { Btn, Modal } from "../../components/ui/index.js";
import { useLang } from "../../i18n/index.jsx";

export function ChefReplaceModal({ kitchen, cash, setCash, addTx, addToast, setKitchen, onClose }) {
  const { t: tr } = useLang();
  const chf = kitchen?.chef ?? {};
  const cl  = chefLv(chf.totalXp ?? 0);
  const clD = CHEF_LVL[Math.min(cl.l, CHEF_LVL.length - 1)];
  const severance = (chf.salary || 20) * 24;
  const canAfford = cash >= severance;

  const confirm = () => {
    if (!canAfford) return;
    // Guard inside updater in case cash dropped between render and click (e.g. day-end loan)
    setCash(c => c >= severance ? +(c - severance).toFixed(2) : c);
    addTx("dépense", `Indemnité licenciement — ${chf.name}`, severance);
    setKitchen(k => {
      const brigadeWasActive = k.chefTrainings?.brigade && k.chefTrainings?.brigadeUntil > Date.now();
      // Trim cooking queue by 1 if the brigade extra slot disappears, preventing negative slotsLeft
      const cooking = brigadeWasActive && k.cooking?.length ? k.cooking.slice(0, -1) : (k.cooking ?? []);
      const retainedXp = Math.round((k.chef.totalXp || 0) * 0.3);
      return {
        ...k,
        chef: { ...k.chef, name: tr("kitchen.newChef"), totalXp: retainedXp, salary: 20, shift: null },
        chefTrainings: {},
        cooking,
        morale: Math.max(k.morale ?? 100, 50),
      };
    });
    addToast({ icon: "👋", title: `${chf.name} ${tr("kitchen.chefLeft")}`, msg: tr("kitchen.replaceNote"), color: C.amber, tab: "servers", silent: true });
    onClose();
  };

  return (
    <Modal title={tr("kitchen.replace")} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", background: C.bg, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ width: 50, height: 50, background: clD.color + "1a", border: `2px solid ${clD.color}33`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
            {clD.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, fontFamily: F.title }}>{chf.name}</div>
            <div style={{ fontSize: 11, color: C.muted, fontFamily: F.body, marginTop: 3 }}>
              {clD.name} · Niv.{cl.l} · {chf.totalXp ?? 0} XP · {chf.salary ?? 20}€/h
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: C.muted, fontFamily: F.body, background: C.amberP, border: `1px solid ${C.amber}33`, borderRadius: 10, padding: "10px 14px" }}>
          {tr("kitchen.replaceNote")}
        </div>

        <div style={{ background: canAfford ? C.bg : C.redP, border: `1.5px solid ${canAfford ? C.border : C.red}44`, borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, fontFamily: F.body }}>{tr("servers.severance")}</div>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: F.body, marginTop: 2 }}>{chf.salary ?? 20}€/h × 24h (1 mois)</div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: canAfford ? C.ink : C.red, fontFamily: F.title }}>{severance}€</div>
          </div>
          {!canAfford && (
            <div style={{ marginTop: 8, fontSize: 10, color: C.red, fontFamily: F.body, fontWeight: 600 }}>
              {tr("servers.insufficientFire", { available: cash.toFixed(2), required: severance })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Btn full v="ghost" onClick={onClose}>{tr("app.cancel")}</Btn>
          <Btn full v={canAfford ? "danger" : "disabled"} disabled={!canAfford} onClick={confirm} icon="👋">
            {canAfford ? tr("servers.fireConfirm", { cost: severance }) : tr("servers.noFunds")}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
