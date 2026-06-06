/* ═══════════════════════════════════════════════════════
   src/views/BankModal.jsx
   Extrait du monolithe restaurant-manager.jsx
   Dépendances déclarées dans les imports ci-dessous.
═══════════════════════════════════════════════════════ */
import { C, F, LOAN_OPTIONS } from "../../constants/gameData";
import { Btn, Modal } from "../ui";
import { useLang } from "../../i18n/index.jsx";

export function BankModal({onClose,cash,loan,setLoan,setCash,addTx,addToast}){
  const { t: tl, lang } = useLang();
  const locale = lang==="en"?"en-US":"fr-FR";
  const takeLoan=(opt)=>{
    if(loan){addToast({icon:"🏦",title:tl("bank.alreadyLoan"),msg:tl("bank.alreadyLoanMsg"),color:C.red,silent:true});return;}
    const totalDue=+(opt.amount*(1+opt.rate)).toFixed(2);
    setLoan({id:opt.id,label:opt.label,amount:opt.amount,remaining:totalDue,
      rate:opt.rate,takenAt:Date.now(),repayPerDay:opt.monthly});
    setCash(c=>+(c+opt.amount).toFixed(2));
    addTx("revenu",`Prêt bancaire — ${opt.label} (${opt.amount}€)`,opt.amount);
    addToast({icon:"🏦",title:tl("bank.loanGranted",{amount:opt.amount}),
      msg:tl("bank.loanGrantedMsg",{monthly:opt.monthly,total:totalDue}),color:C.navy,tab:"stats",silent:true});
    onClose();
  };
  const repayNow=()=>{
    if(!loan)return;
    if(cash<loan.remaining){addToast({icon:"❌",title:tl("toast.noFunds"),msg:tl("bank.insufficientMsg",{amount:(loan.remaining-cash).toFixed(2)}),color:C.red});return;}
    setCash(c=>+(c-loan.remaining).toFixed(2));
    addTx("remboursement",`Remboursement anticipé — ${loan.label}`,loan.remaining);
    addToast({icon:"🎉",title:tl("app.loanPaid"),msg:tl("app.loanPaidDesc"),color:C.green,tab:"stats",silent:true});
    setLoan(null);
    onClose();
  };
  return(
    <Modal title={"🏦 "+tl("bank.title")} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>

        {/* Active loan status */}
        {loan?(
          <div style={{background:C.amberP,border:`1.5px solid ${C.amber}44`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{fontSize:12,fontWeight:700,color:C.amber,fontFamily:F.title,marginBottom:8}}>
              {"📋 "+tl("bank.activeLoanTitle")+" "+loan.label}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {[
                {k:"initialAmount",v:`${loan.amount.toFixed(2)} €`},
                {k:"owed",v:`${loan.remaining.toFixed(2)} €`,c:C.red},
                {k:"monthly",v:`${loan.repayPerDay.toFixed(0)} €/j`},
                {k:"rate",v:`${(loan.rate*100).toFixed(1)} %`},
              ].map(r=>(
                <div key={r.k} style={{background:C.surface,borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:9,color:C.muted,fontFamily:F.body,marginBottom:2}}>{tl("bank."+r.k)}</div>
                  <div style={{fontSize:14,fontWeight:700,color:r.c||C.ink,fontFamily:F.title}}>{r.v}</div>
                </div>
              ))}
            </div>
            <div style={{height:8,background:C.border,borderRadius:99,overflow:"hidden",marginBottom:12}}>
              <div style={{height:"100%",borderRadius:99,background:C.amber,
                width:"100%",
                transformOrigin:"left center",
                transform:`scaleX(${Math.max(0,100-(loan.remaining/loan.amount/(1+loan.rate))*100)/100})`,
                transition:"transform 0.4s"}}/>
            </div>
            <Btn full v="primary" onClick={repayNow}
              icon={cash>=loan.remaining?"💸":"🔒"}>
              {cash>=loan.remaining?tl("bank.repayEarlyBtn",{amount:loan.remaining.toFixed(2)}):tl("toast.noFunds")}
            </Btn>
          </div>
        ):(
          <div style={{background:C.greenP,border:`1px solid ${C.green}33`,
            borderRadius:10,padding:"10px 14px",fontSize:12,color:C.green,fontFamily:F.body}}>
            {"✅ "+tl("bank.noLoanMsg")}
          </div>
        )}

        {/* Loan options */}
        <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title}}>{tl("bank.availableLoans")}</div>
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
                  {opt.label} — {opt.amount.toLocaleString(locale)} €
                </div>
                <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>
                  {tl("bank.loanDetails",{rate:(opt.rate*100).toFixed(1),monthly:opt.monthly,total:totalDue})}
                </div>
              </div>
              <Btn v={disabled?"disabled":"primary"} onClick={()=>!disabled&&takeLoan(opt)}>
                {tl("bank.borrow")}
              </Btn>
            </div>
          );
        })}

        {/* Fine print */}
        <div style={{fontSize:10,color:C.muted,fontFamily:F.body,textAlign:"center",lineHeight:1.5}}>
          {tl("bank.finePrint")}
        </div>
      </div>
    </Modal>
  );
}