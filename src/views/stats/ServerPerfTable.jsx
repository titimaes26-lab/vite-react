import { memo } from "react";
import { C, F, SRV_LVL } from "../../constants/gameData.js";
import { useLang } from "../../i18n/index.jsx";
import { srvLv } from "../../utils/levelUtils.js";

export const ServerPerfTable = memo(function ServerPerfTable({ servers }) {
  const { t: tl } = useLang();
  if (!servers?.length) return null;
  return (
    <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,overflow:"hidden",marginBottom:20}}>
      <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:7}}>
        <span style={{fontSize:14}}>👔</span>
        <span style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title}}>{tl("stats.serverPerf")}</span>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontFamily:F.body,minWidth:520}}>
          <thead>
            <tr style={{background:C.bg}}>
              {[tl("stats.serverName"),tl("stats.serverLevel"),tl("stats.serverMoral"),tl("stats.serverRating"),tl("stats.serverCheckouts"),tl("stats.serverCovers"),tl("stats.serverRevenue")].map(h=>(
                <th key={h} style={{padding:"8px 12px",fontSize:10,fontWeight:700,color:C.muted,textAlign:"left",borderBottom:`1px solid ${C.border}`}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...servers].sort((a,b)=>(b.dayRevenue||0)-(a.dayRevenue||0)).map((sv,i)=>{
              const sl = srvLv(sv.totalXp||0);
              const slD = SRV_LVL[Math.min(sl.l,SRV_LVL.length-1)];
              const moral = sv.moral??100;
              const moralC = moral>=70?C.green:moral>=40?C.amber:C.red;
              const rating = sv.rating??0;
              const ratingC = rating>=4?C.green:rating>=3?C.amber:C.red;
              const isActive = sv.status==="actif";
              return (
                <tr key={sv.id} style={{background:i%2===0?C.card:C.bg,opacity:isActive?1:0.5}}>
                  <td style={{padding:"9px 12px",borderBottom:`1px solid ${C.border}11`}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <div style={{width:28,height:28,borderRadius:"50%",background:slD.color+"22",border:`1.5px solid ${slD.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{slD.icon}</div>
                      <div>
                        <div style={{fontSize:11,fontWeight:700,color:C.ink}}>{sv.name}</div>
                        {!isActive&&<div style={{fontSize:9,color:C.muted}}>{sv.status}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{padding:"9px 12px",borderBottom:`1px solid ${C.border}11`}}>
                    <span style={{fontSize:11,fontWeight:700,color:slD.color}}>N{sl.l}</span>
                    <span style={{fontSize:9,color:C.muted,marginLeft:4}}>{slD.name}</span>
                  </td>
                  <td style={{padding:"9px 12px",borderBottom:`1px solid ${C.border}11`}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{width:40,height:5,background:C.border,borderRadius:99,overflow:"hidden"}}>
                        <div style={{height:"100%",width:"100%",background:moralC,borderRadius:99,transformOrigin:"left center",transform:`scaleX(${moral/100})`}}/>
                      </div>
                      <span style={{fontSize:10,fontWeight:700,color:moralC}}>{moral}%</span>
                    </div>
                  </td>
                  <td style={{padding:"9px 12px",borderBottom:`1px solid ${C.border}11`}}>
                    <span style={{fontSize:11,fontWeight:700,color:ratingC}}>{"★".repeat(Math.round(rating))}{"☆".repeat(5-Math.round(rating))}</span>
                    <span style={{fontSize:9,color:C.muted,marginLeft:4}}>{rating.toFixed(1)}</span>
                  </td>
                  <td style={{padding:"9px 12px",borderBottom:`1px solid ${C.border}11`,textAlign:"center"}}>
                    <span style={{fontSize:12,fontWeight:700,color:(sv.dayCheckouts||0)>0?C.navy:C.muted}}>{sv.dayCheckouts||0}</span>
                  </td>
                  <td style={{padding:"9px 12px",borderBottom:`1px solid ${C.border}11`,textAlign:"center"}}>
                    <span style={{fontSize:12,fontWeight:700,color:(sv.dayCovers||0)>0?C.green:C.muted}}>{sv.dayCovers||0}</span>
                  </td>
                  <td style={{padding:"9px 12px",borderBottom:`1px solid ${C.border}11`}}>
                    <span style={{fontSize:12,fontWeight:700,color:(sv.dayRevenue||0)>0?C.amber:C.muted}}>
                      {(sv.dayRevenue||0)>0?`${(sv.dayRevenue||0).toFixed(0)} €`:"—"}
                    </span>
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
