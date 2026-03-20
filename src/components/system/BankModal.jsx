/* ═══════════════════════════════════════════════════════
   src/views/BankModal.jsx
   Extrait du monolithe restaurant-manager.jsx
   Dépendances déclarées dans les imports ci-dessous.
═══════════════════════════════════════════════════════ */
import { C, F, LOAN_OPTIONS } from "../constants/gameData";
import { Btn, Modal } from "../components/ui";

export function BankModal({onClose,cash,loan,setLoan,setCash,addTx,addToast}){
  const takeLoan=(opt)=>{
    if(loan){addToast({icon:"🏦",title:"Prêt en cours",msg:"Remboursez d'abord votre emprunt actuel.",color:C.red});return;}
    const totalDue=+(opt.amount*(1+opt.rate)).toFixed(2);
    setLoan({id:opt.id,label:opt.label,amount:opt.amount,remaining:totalDue,
      rate:opt.rate,takenAt:Date.now(),repayPerHour:opt.monthly});
    setCash(c=>+(c+opt.amount).toFixed(2));
    addTx("revenu",`Prêt bancaire — ${opt.label} (${opt.amount}€)`,opt.amount);
    addToast({icon:"🏦",title:`Prêt accordé — +${opt.amount} €`,
      msg:`Remboursement : ${opt.monthly}€/h · Total : ${totalDue}€`,color:C.navy,tab:"stats"});
    onClose();
  };
  const repayNow=()=>{
    if(!loan)return;
    if(cash<loan.remaining){addToast({icon:"❌",title:"Fonds insuffisants",msg:`Il vous manque ${(loan.remaining-cash).toFixed(2)}€`,color:C.red});return;}
    setCash(c=>+(c-loan.remaining).toFixed(2));
    addTx("remboursement",`Remboursement anticipé — ${loan.label}`,loan.remaining);
    addToast({icon:"🎉",title:"Prêt soldé !",msg:"Votre emprunt est entièrement remboursé.",color:C.green,tab:"stats"});
    setLoan(null);
    onClose();
  };
  return(
    <Modal title="🏦 Banque" onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>

        {/* Active loan status */}
        {loan?(
          <div style={{background:C.amberP,border:`1.5px solid ${C.amber}44`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{fontSize:12,fontWeight:700,color:C.amber,fontFamily:F.title,marginBottom:8}}>
              📋 Prêt en cours — {loan.label}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {[
                {l:"Montant initial",v:`${loan.amount.toFixed(2)} €`},
                {l:"Restant dû",v:`${loan.remaining.toFixed(2)} €`,c:C.red},
                {l:"Mensualité",v:`${loan.repayPerHour.toFixed(0)} €/h`},
                {l:"Taux",v:`${(loan.rate*100).toFixed(1)} %`},
              ].map(r=>(
                <div key={r.l} style={{background:C.surface,borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:9,color:C.muted,fontFamily:F.body,marginBottom:2}}>{r.l}</div>
                  <div style={{fontSize:14,fontWeight:700,color:r.c||C.ink,fontFamily:F.title}}>{r.v}</div>
                </div>
              ))}
            </div>
            <div style={{height:8,background:C.border,borderRadius:99,overflow:"hidden",marginBottom:12}}>
              <div style={{height:"100%",borderRadius:99,background:C.amber,
                width:`${Math.max(0,100-(loan.remaining/loan.amount/(1+loan.rate))*100)}%`,
                transition:"width 0.4s"}}/>
            </div>
            <Btn full v="primary" onClick={repayNow}
              icon={cash>=loan.remaining?"💸":"🔒"}>
              {cash>=loan.remaining?`Rembourser en avance (${loan.remaining.toFixed(2)} €)`:"Fonds insuffisants"}
            </Btn>
          </div>
        ):(
          <div style={{background:C.greenP,border:`1px solid ${C.green}33`,
            borderRadius:10,padding:"10px 14px",fontSize:12,color:C.green,fontFamily:F.body}}>
            ✅ Aucun emprunt actif — vous pouvez contracter un prêt.
          </div>
        )}

        {/* Loan options */}
        <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title}}>Nouveaux prêts disponibles</div>
        {LOAN_OPTIONS.map(opt=>{
          const totalDue=+(opt.amount*(1+opt.rate)).toFixed(2);
          const disabled=!!loan;
          return(
            <div key={opt.id} style={{background:disabled?C.bg:C.card,
              border:`1.5px solid ${disabled?C.border:C.navy+"44"}`,
              borderRadius:12,padding:"14px 16px",opacity:disabled?0.55:1,
              display:"flex",alignItems:"center",gap:14}}>
              <span style={{fontSize:28,flexShrink:0}}>{opt.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:3}}>
                  {opt.label} — {opt.amount.toLocaleString("fr-FR")} €
                </div>
                <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>
                  Taux {(opt.rate*100).toFixed(1)}% · Mensualités {opt.monthly}€/h · Total dû {totalDue}€
                </div>
              </div>
              <Btn v={disabled?"disabled":"primary"} onClick={()=>!disabled&&takeLoan(opt)}>
                Emprunter
              </Btn>
            </div>
          );
        })}

        {/* Fine print */}
        <div style={{fontSize:10,color:C.muted,fontFamily:F.body,textAlign:"center",lineHeight:1.5}}>
          Les mensualités sont déduites automatiquement chaque heure. En cas d'insolvabilité,
          le remboursement est différé jusqu'à disponibilité des fonds.
        </div>
      </div>
    </Modal>
  );
}