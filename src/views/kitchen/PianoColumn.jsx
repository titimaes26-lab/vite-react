import { C, F } from "../../constants/gameData.js";
import { useLang } from "../../i18n/index.jsx";

export function PianoColumn({ cooking, maxConcurrent, slotsLeft, pianoCompact, togglePiano, now, totalDishes }) {
  const { t: tl } = useLang();

  return (
    <div style={{minWidth:0}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:13}}>🔥</span>
          <span style={{fontSize:12,fontWeight:700,color:C.terra,fontFamily:F.title,whiteSpace:"nowrap"}}>
            {tl("kitchen.piano")} ({cooking.length}/{maxConcurrent})
          </span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <span style={{fontSize:9,background:slotsLeft>0?C.greenP:C.redP,
            color:slotsLeft>0?C.green:C.red,border:`1px solid ${slotsLeft>0?C.green:C.red}33`,
            borderRadius:20,padding:"2px 7px",fontFamily:F.body,fontWeight:700,whiteSpace:"nowrap"}}>
            {slotsLeft>0?tl("kitchen.slotsAvailable",{n:slotsLeft}):tl("kitchen.full")}
          </span>
          <button onClick={togglePiano} title={pianoCompact?"Agrandir le piano":"Réduire le piano"} style={{
            background:"#2a2018",border:"1px solid #3a2e24",borderRadius:6,
            color:"#8a7a6a",fontSize:11,cursor:"pointer",padding:"2px 6px",lineHeight:1,
            fontFamily:F.body,fontWeight:700}}>
            {pianoCompact?"▶":"▼"}
          </button>
        </div>
      </div>

      {pianoCompact&&(
        <div style={{background:"#1a1612",borderRadius:10,border:"2px solid #3a2e24",
          padding:"6px 10px",display:"flex",flexWrap:"wrap",gap:5}}>
          {Array.from({length:maxConcurrent},(_,i)=>{
            const dish = cooking[i]||null;
            const remaining = dish?Math.max(0,Math.ceil((dish.startedAt+dish.timerMax*1000-now)/1000)):0;
            const pct = dish&&dish.timerMax>0?Math.min(100,((dish.timerMax-remaining)/dish.timerMax)*100):0;
            const almostDone = pct>80;
            const col = dish?(almostDone?"#4ade80":"#f97316"):"#3a2e24";
            const timer = remaining>=60?`${Math.floor(remaining/60)}m${String(remaining%60).padStart(2,"0")}s`:remaining+"s";
            return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:4,
                background:"#2a2018",borderRadius:6,padding:"3px 7px",
                border:`1px solid ${col}44`,minWidth:0}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:col,flexShrink:0,
                  boxShadow:dish?`0 0 4px ${col}`:"none"}}/>
                {dish?(
                  <>
                    <span style={{fontSize:9,color:"#fbbf24",fontFamily:F.body,fontWeight:700,
                      whiteSpace:"nowrap",maxWidth:60,overflow:"hidden",textOverflow:"ellipsis"}}>
                      {dish.name.length>9?dish.name.slice(0,8)+"…":dish.name}
                    </span>
                    <span style={{fontSize:9,color:col,fontFamily:F.body,fontWeight:800,whiteSpace:"nowrap"}}>
                      {timer}
                    </span>
                  </>
                ):(
                  <span style={{fontSize:9,color:"#4a3c2c",fontFamily:F.body}}>libre</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!pianoCompact&&(()=>{
        const cols = maxConcurrent<=4?2:maxConcurrent<=6?3:4;
        const rows = Math.ceil(maxConcurrent/cols);
        const CW=76,CH=80,PAD=8;
        const VW = cols*CW+PAD*2;
        const VH = rows*CH+PAD*2+16;
        const getPos = (i)=>({cx:PAD+(i%cols)*CW+CW/2,cy:PAD+12+Math.floor(i/cols)*CH+CH/2});
        return(
          <div style={{background:"#1a1612",borderRadius:14,overflow:"hidden",
            border:"2px solid #3a2e24",boxShadow:"0 6px 24px rgba(0,0,0,0.35)"}}>
            <div style={{padding:"5px 10px",borderBottom:"1px solid #3a2e24",
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:9,color:"#8a7a6a",fontFamily:F.body,fontWeight:600,letterSpacing:"0.08em"}}>
                ✦ PIANO
              </span>
              <span style={{fontSize:9,color:C.terra,fontFamily:F.body,fontWeight:700}}>
                {totalDishes} {tl("kitchen.dishes")}
              </span>
            </div>
            <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{display:"block"}}>
              <rect width={VW} height={VH} fill="#1a1612"/>
              {Array.from({length:Math.ceil(VH/8)},(_,i)=>(
                <line key={i} x1="0" y1={i*8} x2={VW} y2={i*8}
                  stroke="#2a2018" strokeWidth="0.5" opacity="0.4"/>
              ))}
              {Array.from({length:maxConcurrent},(_,i)=>{
                const {cx,cy} = getPos(i);
                const dish = cooking[i]||null;
                const r = 26;
                const remaining = dish?Math.max(0,Math.ceil((dish.startedAt+dish.timerMax*1000-now)/1000)):0;
                const pct = dish&&dish.timerMax>0?Math.min(100,((dish.timerMax-remaining)/dish.timerMax)*100):0;
                const almostDone = pct>80;
                const burnerColor = dish?(almostDone?"#4ade80":"#f97316"):"#3a2e24";
                const circumference = 2*Math.PI*r;
                return(
                  <g key={i}>
                    {dish&&(
                      <circle cx={cx} cy={cy} r={r+8} fill={burnerColor} opacity="0.06">
                        <animate attributeName="opacity" values="0.06;0.14;0.06"
                          dur={almostDone?"0.7s":"1.5s"} repeatCount="indefinite"/>
                      </circle>
                    )}
                    <circle cx={cx} cy={cy} r={r} fill="#2a2018"
                      stroke={burnerColor} strokeWidth={dish?1.5:1}/>
                    <circle cx={cx} cy={cy} r={r*0.72} fill="none" stroke="#3a2e24" strokeWidth="1"/>
                    <circle cx={cx} cy={cy} r={r*0.44} fill="none" stroke="#3a2e24" strokeWidth="1"/>
                    {dish&&[0,72,144,216,288].map((angle,fi)=>{
                      const rad = (angle*Math.PI)/180;
                      return(
                        <ellipse key={fi}
                          cx={cx+r*0.62*Math.cos(rad)} cy={cy+r*0.62*Math.sin(rad)}
                          rx="2" ry="3.5" fill={almostDone?"#4ade80":"#f97316"} opacity="0.8">
                          <animate attributeName="ry" values="3.5;5;3.5"
                            dur={`${0.35+fi*0.07}s`} repeatCount="indefinite"/>
                          <animate attributeName="opacity" values="0.8;0.3;0.8"
                            dur={`${0.4+fi*0.06}s`} repeatCount="indefinite"/>
                        </ellipse>
                      );
                    })}
                    {!dish&&<text x={cx} y={cy+4} textAnchor="middle" fontSize="12"
                      fill="#4a3c2c" fontFamily="sans-serif" opacity="0.4">○</text>}
                    {dish&&(
                      <circle cx={cx} cy={cy} r={r}
                        fill="none"
                        stroke={almostDone?"#4ade80":pct>50?"#fbbf24":"#f97316"}
                        strokeWidth="3"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference*(1-pct/100)}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${cx} ${cy})`}
                        opacity="0.9"/>
                    )}
                    {dish&&almostDone&&[cx-5,cx+5].map((sx,si)=>(
                      <line key={si} x1={sx} y1={cy-r-4} x2={sx+2} y2={cy-r-11}
                        stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" opacity="0.5">
                        <animate attributeName="opacity" values="0.5;0;0.5" dur={`${0.7+si*0.2}s`} repeatCount="indefinite"/>
                      </line>
                    ))}
                    <text x={cx} y={cy+r+10} textAnchor="middle" fontSize="7"
                      fill={dish?"#8a7a6a":"#3a3028"} fontFamily="sans-serif">
                      {tl("kitchen.burner")} {i+1}
                    </text>
                    {dish&&<text x={cx} y={cy-3} textAnchor="middle" fontSize="7"
                      fill={almostDone?"#4ade80":"#fbbf24"} fontFamily="sans-serif" fontWeight="700">
                      {dish.name.length>10?dish.name.slice(0,9)+"…":dish.name}
                    </text>}
                    {dish&&<text x={cx} y={cy+7} textAnchor="middle" fontSize="8"
                      fill={almostDone?"#4ade80":"#f97316"} fontFamily="sans-serif" fontWeight="800">
                      {remaining>=60?`${Math.floor(remaining/60)}m${String(remaining%60).padStart(2,"0")}s`:remaining+"s"}
                    </text>}
                  </g>
                );
              })}
            </svg>
          </div>
        );
      })()}
    </div>
  );
}
