import { C, Z } from "../../constants/gameData.js";
import { HeaderTop } from "./HeaderTop.jsx";
import { NavDesktop } from "./NavDesktop.jsx";
import { NavMobile } from "./NavMobile.jsx";

export function AppHeader({
  tab, setTab, bp,
  sAlerts, nCompl, queue,
  phase, gameTime, loan, openBank,
  setShowToastHistory, setToastUnread, toastUnread,
  adWatching, setAdWatching, setCash, addTx, addToast,
  setShowHelp, setShowResetModal,
  rl, rlD, restoXp, reputation,
  complaints, setSeenIds,
  todayChallenges, challengeProgress, challengeClaimed, challengeLostToday,
  pendingClaim, kitchen, activeTables,
}) {
  const navProps = {
    tab, setTab, complaints, setSeenIds,
    todayChallenges, challengeProgress, challengeClaimed, challengeLostToday,
    pendingClaim, kitchen, sAlerts,
  };

  return (
    <div style={{position:"sticky",top:0,zIndex:Z.header,background:C.surface}}>
      <HeaderTop
        bp={bp} sAlerts={sAlerts} nCompl={nCompl} queue={queue}
        phase={phase} gameTime={gameTime} loan={loan} openBank={openBank}
        setShowToastHistory={setShowToastHistory} setToastUnread={setToastUnread} toastUnread={toastUnread}
        adWatching={adWatching} setAdWatching={setAdWatching} setCash={setCash} addTx={addTx} addToast={addToast}
        setShowHelp={setShowHelp} setShowResetModal={setShowResetModal}
        rl={rl} rlD={rlD} restoXp={restoXp} reputation={reputation}
        complaints={complaints} setSeenIds={setSeenIds} setTab={setTab} tab={tab}
        activeTables={activeTables}/>
      <NavDesktop {...navProps}/>
      <NavMobile {...navProps}/>
    </div>
  );
}
