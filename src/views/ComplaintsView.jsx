/* ═══════════════════════════════════════════════════════
   src/views/ComplaintsView.jsx
   Extrait du monolithe restaurant-manager.jsx
   Dépendances déclarées dans les imports ci-dessous.
═══════════════════════════════════════════════════════ */
import { useState } from "react";
import { C, F } from "../constants/gameData";
import { Card, Badge, Modal, Lbl, Inp, Sel } from "../components/ui";

export function ComplaintsView({complaints,setComplaints,tables,servers,seenIds}){
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({date:"",table:"",server:"",type:"Qualité plat",desc:"",status:"nouveau",prio:"moyenne"});
  const [filter,setFilter]=useState("Tout");
  const types=["Qualité plat","Délai service","Attitude personnel","Facture incorrecte","Propreté","Autre"];
  const filtered=[...(filter==="Tout"?complaints:complaints.filter(c=>c.status===filter))].sort((a,b)=>b.date.localeCompare(a.date));
  const save=()=>{
    setComplaints(p=>[...p,{id:Date.now(),...form,table:+form.table}]);
    setModal(false);
  };
  const cnt={
    nouveau:complaints.filter(c=>c.status==="nouveau").length,
    "en cours":complaints.filter(c=>c.status==="en cours").length,
    résolu:complaints.filter(c=>c.status==="résolu").length,
  };
  const prioC={haute:C.red,moyenne:C.terra,basse:C.navy};
  const statC={résolu:C.green,"en cours":C.amber,nouveau:C.red};
  const statBg={résolu:C.greenP,"en cours":C.amberP,nouveau:C.redP};
  return(
    <div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.length===0&&(
          <div style={{color:C.muted,fontSize:13,fontStyle:"italic",fontFamily:F.body,padding:"16px 0"}}>
            Aucune plainte dans cette catégorie.
          </div>
        )}
        {filtered.map(c=>(
          <Card key={c.id} accent={(statC[c.status]||C.muted)+"44"}>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
                  <Badge color={prioC[c.prio]||C.muted} sm>{c.prio}</Badge>
                  <Badge color={statC[c.status]||C.muted} bg={statBg[c.status]||C.bg} sm>
                    {c.status}
                  </Badge>
                  {!seenIds?.has(c.id)&&c.status==="nouveau"&&(
                    <span style={{
                      background:C.red,color:"#fff",
                      fontSize:9,fontWeight:800,letterSpacing:"0.06em",
                      borderRadius:4,padding:"2px 7px",fontFamily:F.body,
                      textTransform:"uppercase",animation:"pulse 1.2s infinite"}}>
                      ● NOUVEAU
                    </span>
                  )}
                  <span style={{fontSize:11,color:C.muted,fontFamily:F.body}}>
                    Table {c.table} · {c.server} · {c.date}
                  </span>
                </div>
                <div style={{fontWeight:600,color:C.ink,fontSize:14,marginBottom:4,fontFamily:F.title}}>
                  {c.type}
                </div>
                <div style={{color:C.muted,fontSize:13,fontFamily:F.body}}>{c.desc}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {modal&&(
        <Modal title="Signaler une plainte" onClose={()=>setModal(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><Lbl>Date</Lbl><Inp type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></div>
              <div>
                <Lbl>Table</Lbl>
                <Sel value={form.table} onChange={e=>setForm(p=>({...p,table:e.target.value}))}>
                  <option value="">Sélectionner…</option>
                  {tables.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                </Sel>
              </div>
            </div>
            <div>
              <Lbl>Serveur</Lbl>
              <Sel value={form.server} onChange={e=>setForm(p=>({...p,server:e.target.value}))}>
                <option value="">Sélectionner…</option>
                {servers.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
              </Sel>
            </div>
            <div>
              <Lbl>Type</Lbl>
              <Sel value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
                {types.map(t=><option key={t}>{t}</option>)}
              </Sel>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <Lbl>Priorité</Lbl>
                <Sel value={form.prio} onChange={e=>setForm(p=>({...p,prio:e.target.value}))}>
                  <option value="basse">Basse</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="haute">Haute</option>
                </Sel>
              </div>
              <div>
                <Lbl>Statut</Lbl>
                <Sel value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                  <option value="nouveau">Nouveau</option>
                  <option value="en cours">En cours</option>
                </Sel>
              </div>
            </div>
            <div>
              <Lbl>Description</Lbl>
              <textarea value={form.desc} onChange={e=>setForm(p=>({...p,desc:e.target.value}))} rows={3}
                style={{background:C.white,border:`1.5px solid ${C.border}`,borderRadius:9,
                  padding:"9px 13px",color:C.ink,fontSize:13,fontFamily:F.body,
                  outline:"none",width:"100%",boxSizing:"border-box",resize:"vertical"}}/>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:6}}>
              <Btn onClick={()=>setModal(false)} v="ghost">Annuler</Btn>
              <Btn onClick={save} v="terra">Enregistrer</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   HELP MODAL — Guide utilisateur
═══════════════════════════════════════════════════════ */
const HELP_SECTIONS=[
  {
    icon:"⊞", title:"Tables",
    color:"#1e5c38",
    items:[
      {q:"Arrivée des clients",a:"Un nouveau groupe arrive toutes les 30 secondes (65 % de chance). La taille du groupe ne dépasse jamais la capacité maximale des tables libres. La file d'attente reste active même si vous changez d'onglet."},
      {q:"Humeur et patience",a:"🤩 Enthousiaste (45s, ×1.5 XP) · 😊 Détendu (35s) · 😐 Neutre (25s) · 😑 Pressé (18s) · 😤 Impatient (11s, ×0.6 XP). La barre de patience passe du vert au rouge — si elle atteint 0, le groupe part sans consommer."},
      {q:"Plan de salle / Vue grille",a:"Basculez entre le plan SVG et la vue grille via le bouton 🗺 / ⊞. Le plan montre toutes les tables avec leur statut coloré. Cliquez une table pour ouvrir son panneau de détail latéral."},
      {q:"Timeline de phases",a:"Chaque table affiche une barre de 4 segments : 🛎 Commande (bleu) → 🔥 Cuisine (orange) → 🍴 Repas (vert) → 🧹 Nettoyage (jaune). Chaque segment se remplit progressivement. La phase cuisine utilise le plat le plus long encore en cuisson."},
      {q:"Placement automatique",a:"Si une table libre et un serveur actif sont disponibles, cliquez sur ▶ Placer pour installer le groupe automatiquement. Sinon, utilisez la modale pour choisir table et serveur manuellement."},
      {q:"Prise de commande",a:"Le serveur prend la commande selon la taille du groupe : 30s (2p), 1 min (4p), 1m30 (6p). La carte affiche 🛎 avec un compte à rebours et la barre de phase se remplit."},
      {q:"Repas en cours",a:"Une fois les plats servis, la table passe en 🍴 repas. Le temps correspond aux ⅔ du plat le plus long. Le bouton Encaisser est verrouillé pendant ce délai."},
      {q:"Nettoyage",a:"Après l'encaissement, un serveur nettoie pendant 1 minute (réduit par l'amélioration Station de plonge). La table redevient libre automatiquement."},
      {q:"Agrandir une table",a:"Sur chaque table libre, un bouton permet d'augmenter la capacité : 2→4 couverts pour 800 €, puis 4→6 couverts pour 1 800 €. Des groupes plus grands arriveront ensuite."},
      {q:"File d'attente — rappel",a:"Si un groupe part avant d'être placé, il reste rappelable 2 minutes dans la liste d'attente. Cliquez ↩ Rappeler pour le remettre en tête de file avec +15s de patience."},
      {q:"Réorganiser la file",a:"Les boutons ↑↓ sur chaque ticket de la file permettent de prioriser les groupes. Un indicateur de backlog (temps total estimé) s'affiche en haut."},
    ]
  },
  {
    icon:"👤", title:"Serveurs",
    color:"#162d4a",
    items:[
      {q:"Équipe et slots",a:"Le restaurant démarre avec 2 serveurs. Des slots supplémentaires se débloquent avec le niveau du restaurant : 3 au Bistrot, 4 à la Brasserie, jusqu'à 8 au Palace."},
      {q:"Statuts",a:"Actif → disponible. En pause → indisponible, non payé. 🛎 En service → prend une commande ou nettoie. Seuls les serveurs actifs (moral > 10) sont assignés automatiquement."},
      {q:"Moral",a:"Le moral baisse de 1 point toutes les 5 minutes si le serveur est actif. Il remonte pendant les pauses. En dessous de 10 (💀 Burnout), le serveur n'est plus disponible. Utilisez 🎁 Prime 50€ pour remonter un moral bas."},
      {q:"Spécialités",a:"Débloquées au niveau 2 : ⚡ Rapidité (−30% temps commande), ✨ Charme (+20% pourboires), 🍷 Sommelier (+10% pourboires), 🎩 VIP (+15% pourboires). Améliorées au niveau 4."},
      {q:"Formations",a:"5 domaines de formation : Accueil, Rapidité, Sommellerie, Prestige VIP, Bien-être. Chaque domaine a 3 niveaux progressifs. Les formations améliorent les spécialités et le moral maximal."},
      {q:"Expérience et niveau",a:"Les serveurs gagnent de l'XP à chaque encaissement. 5 niveaux : 🎓 Stagiaire → 👑 Maître. Les pourboires augmentent aussi avec le niveau."},
      {q:"Salaire",a:"Les serveurs actifs sont payés toutes les heures réelles. En pause ou au repos, ils ne sont pas payés."},
    ]
  },
  {
    icon:"👨‍🍳", title:"Cuisine",
    color:"#b85520",
    items:[
      {q:"Piano de cuisine",a:"Le centre de l'onglet affiche un piano SVG avec N brûleurs. Les flammes s'animent en orange pendant la cuisson, passent au vert à 80% de progression, avec vapeur quand c'est presque prêt."},
      {q:"Tickets de commande",a:"Chaque table a un ticket ordonnable (boutons ↑↓). Le ticket change de couleur selon l'attente : 🟢 < 3 min · 🟡 3–5 min · 🔴 > 5 min. Un badge indique les tickets en retard."},
      {q:"Feux de cuisson",a:"4 feux de base + commis débloqués + améliorations Fourneau. Cliquez ▶ sur un plat ou « Tout démarrer » pour remplir les feux libres."},
      {q:"Temps de cuisson",a:"Réduit par le niveau du chef (×1.0 à ×3.0), les commis (+15% chacun) et l'amélioration Four professionnel (jusqu'à −50%)."},
      {q:"Servir une table",a:"Quand tous les plats d'une table sont prêts (✅ PRÊT), le bouton 🍽 Servir apparaît. La table passe en phase repas avant encaissement."},
      {q:"Chef et commis",a:"Le chef gagne +12 XP par plat. Les commis gagnent 40% de ce montant. 3 commis débloqués aux niveaux 2 et 4 du chef (niveaux 1, 2 et 3 selon l'avancement)."},
      {q:"Améliorations cuisine",a:"🔥 Fourneau (+1 feu, 3 niveaux) · 🏺 Four professionnel (−50% temps, 3 niveaux) · 🧊 Chambre froide (capacité stock ×3, 2 niveaux) · 🚿 Station de plonge (nettoyage −40s, 2 niveaux)."},
    ]
  },
  {
    icon:"📋", title:"Menu",
    color:"#5c2e96",
    items:[
      {q:"4 sous-onglets",a:"📋 Carte (plats actifs), 🍽 Formules (menus combinés), 🎨 Thèmes (modificateurs globaux), 📊 Performance (analyse de rentabilité)."},
      {q:"Prix dynamique",a:"Sur chaque carte, ajustez le prix : −10%, −5%, +5%, +10%, +20%. Le bouton ↺ réinitialise au prix de base. Les prix ajustés s'appliquent aux nouvelles commandes."},
      {q:"Activer / Désactiver",a:"Le bouton ⏸ retire un plat du menu sans le supprimer. Les plats désactivés ne sont plus commandés par les clients."},
      {q:"Score de rentabilité",a:"Chaque plat a un score composé : 40% marge brute + 40% popularité + 20% disponibilité stock. Badge 🔥 pour le plat le mieux noté."},
      {q:"Formules",a:"3 modèles : Menu Découverte (−12%, 3 services), Menu Express (−8%, 2 services), Menu Prestige (−15%, 4 services). Configurez les plats de chaque catégorie puis activez."},
      {q:"Thèmes",a:"🍺 Bistrot (×0.90 prix) · ⭐ Gastronomique (×1.15 prix, +5 rép, +20% XP) · 🌿 Saisonnier (+8 rép, +10% XP). Le thème actif s'applique à chaque encaissement."},
      {q:"Plats du jour",a:"2 plats aléatoires sont mis en avant chaque heure avec −20% de réduction. Ils apparaissent dans la file d'attente et dans l'onglet Tables."},
    ]
  },
  {
    icon:"📦", title:"Stocks",
    color:"#162d4a",
    items:[
      {q:"3 modes de vue",a:"⊞ Cartes (défaut, accordéon par catégorie), ☰ Liste (tableau compact), 📊 Graphique (barres horizontales triées par urgence). Triez par urgence, catégorie ou alphabétique."},
      {q:"Prévision rupture",a:"Le bloc 🔮 calcule combien de repas chaque ingrédient peut encore couvrir selon les recettes actives. Couleur : ✓ vert (>10 repas) · ⚠ orange (<10) · ⛔ rouge (<3 ou épuisé)."},
      {q:"Commander selon prévision",a:"Le bouton 🛒 Commander réapprovisionne automatiquement les 3 ingrédients les plus critiques jusqu'au niveau optimal, en tenant compte du fournisseur actif."},
      {q:"Fournisseurs",a:"⚡ Grossiste Premium : prix plein, livraison instantanée. 🚚 Fournisseur Local : −20% mais livraison en 2 minutes. Les livraisons en cours s'affichent avec une barre de progression."},
      {q:"Accordéon catégories",a:"Cliquez sur l'en-tête d'une catégorie pour la réduire ou l'agrandir. Le badge rouge indique combien d'alertes il y a dans chaque catégorie sans avoir à dérouler."},
      {q:"KPI inventaire",a:"4 métriques en haut : alertes stock, valeur totale de l'inventaire, ruptures prévues, nombre d'articles. Mis à jour en temps réel."},
    ]
  },
  {
    icon:"🎯", title:"Objectifs & Défis",
    color:"#a06c08",
    items:[
      {q:"Séries d'objectifs",a:"16 objectifs en 4 séries : Premiers pas, Croissance, Excellence, Légende. Chaque objectif complété donne des espèces et de l'XP restaurant. Cliquez Récupérer pour encaisser."},
      {q:"Défis quotidiens",a:"3 défis renouvelés chaque jour, tirés au sort selon la date. Catégories : clients servis, recettes, notes, rush express, service VIP, salle comble, pourboires. Récompenses immédiates."},
      {q:"Jalons de progression",a:"Une frise chronologique affiche 6 jalons clés (10 clients, 50 clients, 1k€, 5k€, 20k€, Palace). Les jalons atteints s'illuminent en or."},
      {q:"Badge et notifications",a:"Un badge rouge sur l'onglet Objectifs indique les récompenses prêtes + défis quotidiens complétés. Les toasts sont cliquables pour y accéder directement."},
    ]
  },
  {
    icon:"💰", title:"Finances",
    color:"#a06c08",
    items:[
      {q:"Caisse",a:"Le restaurant démarre avec 5 000 €. Affiché en vert (≥ 200 €) ou rouge (critique). Cliquez sur 💰 pour ouvrir le Grand Livre."},
      {q:"Résultat du jour",a:"Dans l'onglet Statistiques : revenus encaissés, dépenses du jour et résultat net. La masse salariale active (chef + commis + serveurs) est détaillée en €/h."},
      {q:"Grand livre",a:"Toutes les transactions avec résumé Recettes / Dépenses / Résultat net. Limité aux 200 dernières entrées."},
      {q:"Prêts bancaires",a:"3 options : Petit prêt (1 500€), Standard (4 000€), Grand prêt (9 000€). Remboursement automatique par mensualités horaires. Un seul prêt actif à la fois. Remboursement anticipé possible."},
      {q:"Salaires",a:"Débités automatiquement toutes les heures réelles. Seuls les personnels actifs sont payés. Les commis non débloqués ne sont pas comptés."},
    ]
  },
  {
    icon:"📊", title:"Statistiques",
    color:"#1e5c38",
    items:[
      {q:"Graphiques linéaires",a:"3 courbes SVG interactives : Revenus, Clients servis, Réputation. Passez la souris sur un point pour voir la valeur exacte. Un indicateur ↗/↘ montre la tendance vs j−1."},
      {q:"Période",a:"Sélecteur 3 jours / 5 jours pour zoomer ou élargir la vue."},
      {q:"Analyse financière",a:"Compte de résultat du jour (revenus, dépenses, résultat net), masse salariale active, camembert de répartition des revenus par catégorie de menu, panier moyen."},
      {q:"Réputation",a:"Jauge circulaire SVG avec palier actuel, effets sur les pourboires et le taux de spawn clients. Barre de progression vers le palier suivant."},
      {q:"Tableau journalier",a:"Les N derniers jours : clients servis, perdus, taux de service (barre colorée) et revenus. La ligne du jour est mise en avant."},
    ]
  },
  {
    icon:"⭐", title:"Réputation",
    color:"#5c2e96",
    items:[
      {q:"5 paliers",a:"💀 Désastreuse (0–19) · 😟 Dégradée (20–39) · 😐 Neutre (40–59) · 😊 Appréciée (60–79) · 🌟 Réputée (80+). Chaque palier modifie les pourboires et le taux d'arrivée des clients."},
      {q:"Gain de réputation",a:"★★★★★ +4 pts · ★★★★ +2 pts · ★★★ 0 pt · ★★ −4 pts · ★ −8 pts. Client VIP servi +6 pts. Bonus selon le thème de menu actif."},
      {q:"Perte de réputation",a:"Client perdu −3 pts · Plainte −5 pts · Amende inspection −6 pts · Passage inspection réussie +3 pts."},
      {q:"Effets en jeu",a:"Les pourboires et le taux de spawn clients sont multipliés par le modificateur du palier (×0.5 à ×1.25). Visible dans le header et l'onglet Statistiques."},
    ]
  },
  {
    icon:"⚠", title:"Plaintes",
    color:"#b85520",
    items:[
      {q:"Génération automatique",a:"Une plainte est générée automatiquement si la note est ≤ 2 étoiles lors d'un encaissement, ou en cas d'amende d'inspection sanitaire."},
      {q:"Liste des plaintes",a:"Triées de la plus récente à la plus ancienne. Badge ● NOUVEAU sur les plaintes non encore consultées. Priorités : haute (rouge), moyenne (orange), basse (bleu)."},
      {q:"Alerte header",a:"L'alerte 💬 indique le nombre de nouvelles plaintes. Cliquez dessus pour accéder directement à l'onglet — le badge disparaît après consultation."},
    ]
  },
  {
    icon:"🏆", title:"Niveau Restaurant",
    color:"#a06c08",
    items:[
      {q:"Progression",a:"Chaque encaissement ajoute de l'XP (modifié par l'humeur du groupe, le statut VIP et le thème de menu). La barre dans le header indique l'avancement."},
      {q:"Déblocage des tables",a:"☕ Café de quartier (3 tables) → 🍺 Bistrot (5) → 🍽 Brasserie (7) → ⭐ Restaurant (9) → 🌟 Grand Restaurant (11) → 👑 Palace (12 tables)."},
      {q:"Déblocage des serveurs",a:"Bistrot +1 slot (3 total) → Brasserie +1 (4) → Restaurant +1 (5) → Grand Restaurant +1 (6) → Palace +2 (8 serveurs maximum)."},
      {q:"Événements aléatoires",a:"Toutes les 4 minutes réelles : 🔍 Inspection sanitaire (amende ou bonus), ⚡ Rush inattendu (3 groupes ajoutés), 🧊 Panne frigo (stocks réduits), 🎩 Critique Michelin (client VIP)."},
    ]
  },
];

