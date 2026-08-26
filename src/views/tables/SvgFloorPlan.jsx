/* ═══════════════════════════════════════════════════════
   src/views/tables/SvgFloorPlan.jsx
   Plan de salle SVG animé.
═══════════════════════════════════════════════════════ */
import { useLang } from "../../i18n/index.jsx";

function SvgFloorPlan({tables,servers,kitchen,queue,now,C,F,
  selectedTable,setSelectedTable,
  srvLv,SRV_LVL,calcRating,ratingColor,ratingStars,calcTip,
  quickPlace,openAssign,checkout,activeSrv,lockedSlots=[],
  selectedClient,onPlaceClient,onCancelClientSelect}) {
              const { t: tr } = useLang();
              const n = tables.length + lockedSlots.length;

              // ── 1. Grille adaptative ─────────────────────────
              // Colonnes optimales selon le nombre de tables
              const cols = n===1?1 : n<=3?n : n<=6?3 : n<=9?3 : 4;
              const rows = Math.ceil(n / cols);

              // ── 2. Marges fixes du plan ──────────────────────
              const ML = 0;   // gauche
              const MT = 52;   // haut
              const MR = 47;   // droite (bar)
              const MB = 48;   // bas (entrée + groupes en attente)

              // ── 3. ViewBox dynamique ─────────────────────────
              // CELL_H plafonné à 90 (moitié de l'ancien 180)
              // VH s'adapte au contenu pour éviter l'espace vide
              const VW = 800;

              // Espace disponible pour les tables
              const gridW = VW - ML - MR;

              const CELL_W = Math.min(220, Math.floor(gridW / cols));
              const CELL_H = Math.min(90,  Math.floor(400   / rows));
              const VH     = MT + rows * CELL_H + MB;

              // Taille des tables proportionnelle à la cellule
              // Table 2p: 60% de la cellule, table 4p: 70%, 6p: 78%
              const getTW = (cap) => Math.round(CELL_W * (cap<=2?0.60 : cap<=4?0.68 : 0.76));
              const getTH = (cap) => Math.round(CELL_H * (cap<=2?0.55 : cap<=4?0.62 : 0.70));

              // ── 4. Position centre de chaque table ──────────
              const getPos = (i) => ({
                cx: ML + (i % cols) * CELL_W + CELL_W / 2,
                cy: MT + Math.floor(i / cols) * CELL_H + CELL_H / 2,
              });

              return(
                <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{display:"block",position:"absolute",inset:0}}>
                  {/* Fond parquet */}
                  <rect x="0" y="0" width={VW} height={VH} fill="#faf7f0"/>

                  {/* Bandeau mode sélection client */}
                  {selectedClient&&(
                    <g>
                      <rect x="0" y="0" width={VW} height={22} fill="#1a4f9f" opacity="0.92"/>
                      <text x={VW/2} y={14} textAnchor="middle" fontSize="9" fontWeight="700"
                        fill="white" fontFamily="sans-serif">
                        {tr("tables.selectionMode",{emoji:selectedClient.mood.e,name:selectedClient.name,size:selectedClient.size})}
                      </text>
                    </g>
                  )}
                  {Array.from({length:Math.ceil(VH/20)+1},(_,i)=>(
                    <line key={`h${i}`} x1="0" y1={i*20} x2={VW} y2={i*20}
                      stroke="#e8e0d0" strokeWidth="0.5"/>
                  ))}
                  {Array.from({length:Math.ceil(VW/20)+1},(_,i)=>(
                    <line key={`v${i}`} x1={i*20} y1="0" x2={i*20} y2={VH}
                      stroke="#e8e0d0" strokeWidth="0.5"/>
                  ))}

                  {/* Entrée — centrée en bas */}
                  <rect x={VW/2-50} y={VH-20} width={100} height={20} rx="4"
                    fill="#d4c9b0" opacity="0.8"/>
                  <text x={VW/2} y={VH-8} textAnchor="middle" fontSize="9"
                    fill="#8a7d6a" fontFamily="sans-serif">{tr("tables.entrance")}</text>

                  {/* Bar — droite */}
                  <image
                    href="/bar.png"
                    x={VW-MR+6-100} y={MT}
                    width={130} height={CELL_H * 2}
                    preserveAspectRatio="xMidYMid slice"
                  />

                  {/* Tables */}
                  {tables.map((t,i)=>{
                    const pos = getPos(i);
                    const isMange=t.status==="mange";
                    const isNettoyage=t.status==="nettoyage";
                    const isOrdering=t.status==="occupée"&&t.svcUntil&&now<t.svcUntil;
                    const isLibre=t.status==="libre";
                    const myQ=queue.filter(g=>g.size<=t.capacity&&isLibre);
                    const isClientTarget=selectedClient&&isLibre&&t.capacity>=selectedClient.size;
                    const isClientIncompat=selectedClient&&isLibre&&t.capacity<selectedClient.size;

                    const queuedForT=kitchen.queue.filter(d=>d.tableId===t.id);
                    const queueStale=queuedForT.length>0&&queuedForT.some(d=>d.addedAt&&(now-d.addedAt)>5000);

                    const fill=queueStale?"#e03030":isNettoyage?"#f5d878":isMange?"#4a9e78":isOrdering?"#3a5f8a":
                      t.status==="occupée"?"#e07a45":myQ.length>0?"#5ab88a":"#c8e6d8";

                    // Taille selon capacité — garantit que tw+chaises < CELL_W
                    const tw=getTW(t.capacity);
                    const th=getTH(t.capacity);

                    const bill=isMange?t.order.reduce((s,o)=>s+o.price*o.qty,0):0;
                    const themedBill=+bill.toFixed(2);
                    const isEating=isMange&&t.eatUntil&&now<t.eatUntil;
                    const eatPct=isEating?
                      Math.min(100,Math.round(((t.eatDur*1000-(t.eatUntil-now))/(t.eatDur*1000))*100)):
                      isMange?100:0;

                    // Cuisine : plat le plus long en cuisson pour cette table
                    const isCooking=t.status==="occupée"&&!isOrdering;
                    const cookingForT=kitchen.cooking.filter(d=>d.tableId===t.id);
                    const slowestT=cookingForT.length>0
                      ?cookingForT.reduce((a,b)=>(b.startedAt+b.timerMax*1000)>(a.startedAt+a.timerMax*1000)?b:a)
                      :null;
                    const cookPctSvg=slowestT
                      ?Math.min(100,Math.round(((now-slowestT.startedAt)/(slowestT.timerMax*1000))*100))
                      :0;
                    const isActive=t.status==="occupée"||isMange||isNettoyage;
                    // Phase courante : 0=commande 1=cuisine 2=repas 3=nettoyage
                    const svgPhase=isOrdering?0:isCooking?1:isMange?2:isNettoyage?3:-1;
                    // Pct de la phase active
                    const svgPhasePct=
                      svgPhase===0?Math.min(100,Math.round((1-(Math.max(0,(t.svcUntil-now))/((t.svcUntil-t.placedAt)||1)))*100)):
                      svgPhase===1?cookPctSvg:
                      svgPhase===2?eatPct:
                      svgPhase===3?(t.cleanUntil?Math.min(100,Math.round(((t.cleanDur*1000-(t.cleanUntil-now))/(t.cleanDur*1000))*100)):0):
                      0;
                    const svgPhaseColor=
                      svgPhase===0?"#3a5f8a":
                      svgPhase===1?"#e07a45":
                      svgPhase===2?"#4a9e78":
                      svgPhase===3?"#f5a623":"#888";
                    // Timer en secondes pour la phase courante
                    const svgTimer=
                      svgPhase===0&&t.svcUntil?Math.max(0,Math.ceil((t.svcUntil-now)/1000)):
                      svgPhase===1&&slowestT?Math.max(0,Math.ceil((slowestT.startedAt+slowestT.timerMax*1000-now)/1000)):
                      svgPhase===2&&t.eatUntil?Math.max(0,Math.ceil((t.eatUntil-now)/1000)):
                      svgPhase===3&&t.cleanUntil?Math.max(0,Math.ceil((t.cleanUntil-now)/1000)):
                      null;
                    const svgTimerFmt=svgTimer!==null
                      ?(svgTimer>=60?Math.floor(svgTimer/60)+"m"+String(svgTimer%60).padStart(2,"0")+"s":svgTimer+"s")
                      :null;

                    return(
                      <g key={t.id} onClick={()=>{
                        if(isClientTarget){onPlaceClient(selectedClient,t);}
                        else if(selectedClient&&!isLibre){/* occupied/cleaning — ignore */}
                        else if(selectedClient&&isClientIncompat){/* too small — ignore */}
                        else{if(selectedClient)onCancelClientSelect();setSelectedTable(t);}
                      }} onDoubleClick={isMange&&!isEating?()=>{checkout(t.id);setSelectedTable(null);}:null}
                      style={{cursor:isClientTarget?"crosshair":selectedClient&&!isClientTarget?"not-allowed":isMange&&!isEating?"cell":"pointer"}}>

                        {/* Halo sélection */}
                        {t.id===selectedTable?.id&&!selectedClient&&(
                          <rect x={pos.cx-tw/2-7} y={pos.cy-th/2-7}
                            width={tw+14} height={th+14} rx="13"
                            fill="none" stroke="#1a1612" strokeWidth="2.5"
                            opacity="0.25" strokeDasharray="5 3"/>
                        )}

                        {/* Halo table cible (mode sélection client) */}
                        {isClientTarget&&(
                          <rect x={pos.cx-tw/2-7} y={pos.cy-th/2-7}
                            width={tw+14} height={th+14} rx="13"
                            fill="none" stroke="#1a4f9f" strokeWidth="2.5"
                            opacity="0.6" strokeDasharray="6 3">
                            <animate attributeName="opacity" values="0.6;0.15;0.6" dur="1s" repeatCount="indefinite"/>
                          </rect>
                        )}

                        {/* Image de table selon capacité */}
                        <image
                          href={t.capacity<=2?"/table-2.png":t.capacity<=4?"/table-4.png":"/table-6.png"}
                          x={pos.cx-CELL_W/2} y={pos.cy-CELL_H/2}
                          width={CELL_W} height={CELL_H}
                          preserveAspectRatio="xMidYMid meet"
                        />

                        {/* Overlay coloré selon statut (transparent si libre) */}
                        {!isLibre&&(
                          <rect x={pos.cx-tw/2} y={pos.cy-th/2}
                            width={tw} height={th} rx="8"
                            fill={fill} opacity="0.45"/>
                        )}

                        {/* Halo VIP */}
                        {t.group?.isVIP&&(
                          <rect x={pos.cx-tw/2-3} y={pos.cy-th/2-3}
                            width={tw+6} height={th+6} rx="10"
                            fill="none" stroke="#d4af37" strokeWidth="2" opacity="0.8"/>
                        )}

                        {/* Barre progression — phase unique + timer */}
                        {isActive&&svgPhase>=0&&(
                          <g>
                            {/* Fond barre */}
                            <rect x={pos.cx-tw/2+3} y={pos.cy+th/2-9}
                              width={tw-6} height={6} rx="3"
                              fill="rgba(0,0,0,0.25)"/>
                            {/* Barre 0→100% couleur phase, reset à chaque phase */}
                            <rect
                              x={pos.cx-tw/2+3}
                              y={pos.cy+th/2-9}
                              width={Math.max(0,(tw-6)*svgPhasePct/100)}
                              height={6} rx="3"
                              fill={svgPhaseColor}
                              opacity="0.95"
                            />
                            {/* Timer */}
                            {svgTimerFmt&&(
                              <text
                                x={pos.cx} y={pos.cy+th/2-13}
                                textAnchor="middle"
                                fontSize="7" fontWeight="700"
                                fill="rgba(255,255,255,0.9)"
                                fontFamily="sans-serif">
                                {svgTimerFmt}
                              </text>
                            )}
                          </g>
                        )}

                        {/* Numéro */}
                        <text x={pos.cx} y={pos.cy-3}
                          textAnchor="middle"
                          fontSize={cols<=3?12:10} fontWeight="700"
                          fill={isLibre&&myQ.length===0?"#2a5c3f":"white"}
                          fontFamily="Georgia,serif">
                          {t.name.replace("Table ","")}
                        </text>

                        {/* Icône statut + couverts */}
                        <text x={pos.cx} y={pos.cy+10}
                          textAnchor="middle"
                          fontSize={cols<=3?9:8}
                          fill={isLibre&&myQ.length===0?"#4a7c5f":"rgba(255,255,255,0.9)"}
                          fontFamily="sans-serif">
                          {isNettoyage?"🧹":isMange&&isEating?"🍴":isMange?"💰":
                            isOrdering?"🛎":t.status==="occupée"?"🔥":
                            myQ.length>0?"👥":`✓ ${t.capacity}p`}
                        </text>

                        {/* Badge montant prêt à encaisser */}
                        {isMange&&!isEating&&(
                          <g>
                            <rect x={pos.cx-19} y={pos.cy-th/2-16}
                              width={38} height={14} rx="7" fill={C.green} opacity="0.95"/>
                            <text x={pos.cx} y={pos.cy-th/2-6}
                              textAnchor="middle" fontSize="8" fontWeight="800"
                              fill="white" fontFamily="sans-serif">
                              💰{themedBill.toFixed(0)}€
                            </text>
                          </g>
                        )}

                        {/* Badge VIP */}
                        {t.group?.isVIP&&(
                          <text x={pos.cx+tw/2-5} y={pos.cy-th/2+10}
                            textAnchor="middle" fontSize="10">🎩</text>
                        )}

                        {/* Pulse attente client */}
                        {isLibre&&myQ.length>0&&!selectedClient&&(
                          <rect x={pos.cx-tw/2} y={pos.cy-th/2}
                            width={tw} height={th} rx="8"
                            fill="none" stroke={C.green} strokeWidth="2.5"
                            opacity="0.7">
                            <animate attributeName="opacity"
                              values="0.7;0.1;0.7" dur="1.8s" repeatCount="indefinite"/>
                          </rect>
                        )}
                      </g>
                    );
                  })}

                  {/* Tables verrouillées */}
                  {lockedSlots.map((slot, li) => {
                    const pos = getPos(tables.length + li);
                    const tw = getTW(2); const th = getTH(2);
                    return (
                      <g key={"locked"+slot.num} opacity="0.45">
                        <rect x={pos.cx-tw/2} y={pos.cy-th/2} width={tw} height={th}
                          rx="8" fill="#ddd4c0" stroke="#b0a090" strokeWidth="1.2"
                          strokeDasharray="5,3"/>
                        <text x={pos.cx} y={pos.cy-4} textAnchor="middle"
                          fontSize="13" fontFamily="sans-serif">🔒</text>
                        <text x={pos.cx} y={pos.cy+10} textAnchor="middle"
                          fontSize="7" fill="#8a7d6a" fontFamily="sans-serif">
                          {slot.unlocksAt.icon} Niv.{slot.unlocksAt.l}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              );
}

export { SvgFloorPlan };
