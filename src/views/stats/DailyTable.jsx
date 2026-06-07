import { memo } from "react";
import { C, F } from "../../constants/gameData.js";
import { useLang } from "../../i18n/index.jsx";

export const DailyTable = memo(function DailyTable({ days, period, loan, kitchen, servers, locale }) {
  const { t: tl } = useLang();
  const chefSalary = kitchen?.chef?.salary||0;
  const commissSalary = (kitchen?.commis||[]).filter(c=>c.status==="actif").reduce((s,c)=>s+(c.salary||0),0);
  const serverSalary = (servers||[]).filter(s=>s.status==="actif").reduce((s,sv)=>s+(sv.salary||0),0);
  const totalSalaryPerHour = chefSalary+commissSalary+serverSalary;

  return (
    <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
      <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:7}}>
        <span style={{fontSize:14}}>📅</span>
        <span style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title}}>{period+" "+tl("stats.days")}</span>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontFamily:F.body,minWidth:840}}>
          <thead>
            <tr style={{background:C.bg}}>
              {[tl("stats.day"),"✅ "+tl("stats.served"),"😤 "+tl("stats.lost"),tl("stats.rate"),"💶 "+tl("stats.revenue"),"📦 "+tl("stats.stocks"),"🏦 "+tl("stats.loanRepay"),"💸 "+tl("stats.salaries")+" ("+tl("stats.estimated")+")","⚖️ "+tl("stats.net")+" ("+tl("stats.estimated")+")"].map(h=>(
                <th key={h} style={{padding:"9px 14px",fontSize:10,fontWeight:700,color:C.muted,textAlign:"left",borderBottom:`1px solid ${C.border}`}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((d,i)=>{
              const total = d.served+d.lost;
              const rate = total>0?Math.round((d.served/total)*100):0;
              const rc = rate>=80?C.green:rate>=50?C.amber:C.red;
              const estSalary = +(totalSalaryPerHour*18).toFixed(0);
              const actualSalary = d.salary??0;
              const actualStock = +(d.stock||0);
              const actualLoan = +(d.loan||0);
              const net = +(d.revenue-actualSalary-actualStock-actualLoan).toFixed(2);
              const estNet = +(d.revenue-estSalary-actualStock-actualLoan).toFixed(2);
              return (
                <tr key={d.day??i} style={{background:i===0?C.greenP:i%2===0?C.card:C.bg}}>
                  <td style={{padding:"9px 14px",fontSize:12,fontWeight:i===0?700:500,color:C.ink,borderBottom:`1px solid ${C.border}11`}}>
                    {tl("stats.day")+" "+(d.day??"")}{i===0&&<span style={{marginLeft:5,fontSize:8,background:C.green,color:"#fff",borderRadius:3,padding:"1px 5px",fontWeight:700}}>{tl("stats.inProgress")}</span>}
                  </td>
                  <td style={{padding:"9px 14px",borderBottom:`1px solid ${C.border}11`}}><span style={{fontSize:12,fontWeight:700,color:C.green}}>{d.served}</span></td>
                  <td style={{padding:"9px 14px",borderBottom:`1px solid ${C.border}11`}}><span style={{fontSize:12,fontWeight:700,color:d.lost>0?C.red:C.muted}}>{d.lost}</span></td>
                  <td style={{padding:"9px 14px",borderBottom:`1px solid ${C.border}11`}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <div style={{width:55,height:6,background:C.border,borderRadius:4,overflow:"hidden"}}>
                        <div style={{height:"100%",width:"100%",background:rc,borderRadius:4,transformOrigin:"left center",transform:`scaleX(${rate/100})`}}/>
                      </div>
                      <span style={{fontSize:10,fontWeight:700,color:rc}}>{total>0?`${rate}%`:"—"}</span>
                    </div>
                  </td>
                  <td style={{padding:"9px 14px",borderBottom:`1px solid ${C.border}11`}}><span style={{fontSize:12,fontWeight:700,color:C.amber}}>{d.revenue.toLocaleString(locale,{minimumFractionDigits:2})} €</span></td>
                  <td style={{padding:"9px 14px",borderBottom:`1px solid ${C.border}11`}}><span style={{fontSize:12,fontWeight:700,color:actualStock>0?C.terra:C.muted}}>{actualStock>0?`−${actualStock.toFixed(2)} €`:"—"}</span></td>
                  <td style={{padding:"9px 14px",borderBottom:`1px solid ${C.border}11`}}>
                    <div style={{display:"flex",flexDirection:"column",gap:1}}>
                      <span style={{fontSize:12,fontWeight:700,color:actualLoan>0?C.purple:C.muted}}>{actualLoan>0?`−${actualLoan.toFixed(2)} €`:"—"}</span>
                      {loan?.repayPerDay>0&&<span style={{fontSize:10,color:C.muted,fontFamily:F.body}}>{"(−"+loan.repayPerDay.toFixed(0)+" €)"}</span>}
                    </div>
                  </td>
                  <td style={{padding:"9px 14px",borderBottom:`1px solid ${C.border}11`}}>
                    <div style={{display:"flex",flexDirection:"column",gap:1}}>
                      <span style={{fontSize:12,fontWeight:700,color:C.navy}}>{actualSalary>0?`−${actualSalary.toFixed(0)} €`:"—"}</span>
                      {estSalary>0&&<span style={{fontSize:10,color:C.muted,fontFamily:F.body}}>{"(−"+estSalary+" €)"}</span>}
                    </div>
                  </td>
                  <td style={{padding:"9px 14px",borderBottom:`1px solid ${C.border}11`}}>
                    <div style={{display:"flex",flexDirection:"column",gap:1}}>
                      <span style={{fontSize:12,fontWeight:800,color:net>=0?C.green:C.red}}>{net>=0?"+":""}{net.toLocaleString(locale,{minimumFractionDigits:2})} €</span>
                      {estSalary>0&&<span style={{fontSize:10,color:estNet>=0?C.green:C.red,fontFamily:F.body}}>{"("+(estNet>=0?"+":"")+estNet.toLocaleString(locale,{minimumFractionDigits:2})+" €)"}</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});
