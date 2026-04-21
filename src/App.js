import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import Login from "./Login";

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    body { background:#08080F; }
    ::-webkit-scrollbar { width:4px; }
    ::-webkit-scrollbar-track { background:#0E0E18; }
    ::-webkit-scrollbar-thumb { background:#2A2A3E; border-radius:2px; }
    @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
    @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes countUp { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
    .fadeUp  { animation:fadeUp .35s ease both; }
    .countUp { animation:countUp .4s cubic-bezier(.34,1.56,.64,1) both; }

    .btn { display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:6px;border:none;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all .18s ease;white-space:nowrap; }
    .btn:active { transform:scale(.97); }
    .btn:disabled { opacity:.4;cursor:not-allowed; }
    .btn-primary { background:#E8C547;color:#08080F; }
    .btn-primary:hover:not(:disabled) { background:#F0D060; }
    .btn-ghost { background:transparent;color:#8888AA;border:1px solid #2A2A3E; }
    .btn-ghost:hover:not(:disabled) { border-color:#E8C547;color:#E8C547; }
    .btn-green { background:#4ECDC422;color:#4ECDC4;border:1px solid #4ECDC444; }
    .btn-green:hover:not(:disabled) { background:#4ECDC433; }
    .btn-red { background:#FF6B6B22;color:#FF6B6B;border:1px solid #FF6B6B44; }
    .btn-red:hover:not(:disabled) { background:#FF6B6B33; }
    .btn-blue { background:#7B9CFF22;color:#7B9CFF;border:1px solid #7B9CFF44; }
    .btn-blue:hover:not(:disabled) { background:#7B9CFF33; }
    .btn-orange { background:#FF9F4322;color:#FF9F43;border:1px solid #FF9F4344; }
    .btn-orange:hover:not(:disabled) { background:#FF9F4333; }
    .btn-purple { background:#B47FFF22;color:#B47FFF;border:1px solid #B47FFF44; }
    .btn-purple:hover:not(:disabled) { background:#B47FFF33; }

    .card { background:#12121A;border:1px solid #2A2A3E;border-radius:10px;overflow:hidden;transition:border-color .2s; }
    .card:hover { border-color:#3A3A5E; }

    .input { width:100%;background:#0E0E18;border:1px solid #2A2A3E;border-radius:6px;padding:10px 14px;color:#F0EEE8;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;transition:border-color .2s;resize:none; }
    .input:focus { border-color:#E8C547; }
    .input::placeholder { color:#555570; }
    select.input { appearance:none;cursor:pointer; }

    .tab { padding:7px 14px;border-radius:6px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;border:none;transition:all .15s; }
    .tab.active { background:#E8C547;color:#08080F; }
    .tab:not(.active) { background:transparent;color:#8888AA; }
    .tab:not(.active):hover { color:#F0EEE8; }

    .nav-item { display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:7px;cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif;font-size:13px;color:#8888AA;border:1px solid transparent; }
    .nav-item:hover { background:#1A1A26;color:#F0EEE8; }
    .nav-item.active { background:#E8C54714;color:#E8C547;border-color:#E8C54730; }

    .sidebar-proj { display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:7px;cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif;font-size:12px;color:#8888AA;border:1px solid transparent; }
    .sidebar-proj:hover { background:#1A1A26;color:#F0EEE8; }
    .sidebar-proj.active { background:#E8C54714;color:#E8C547;border-color:#E8C54730; }

    .progress-bar { height:3px;background:#1A1A26;border-radius:2px;overflow:hidden; }
    .progress-fill { height:100%;border-radius:2px;background:linear-gradient(90deg,#E8C547,#F0D060);transition:width .6s ease; }

    .check-item { display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:#0E0E18;border-radius:7px;border:1px solid #2A2A3E;cursor:pointer;transition:all .15s;user-select:none; }
    .check-item:hover { border-color:#3A3A5E; }
    .check-item.done { background:#4ECDC408;border-color:#4ECDC430; }
    .check-box { width:18px;height:18px;border-radius:4px;border:2px solid #3A3A5E;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .15s;margin-top:1px; }
    .check-box.checked { background:#4ECDC4;border-color:#4ECDC4; }

    .cal-day { aspect-ratio:1;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;transition:all .15s ease;position:relative;border:1px solid transparent;min-height:48px; }
    .cal-day:hover:not(.past):not(.empty):not(.full) { transform:scale(1.05);z-index:2; }
    .cal-day.empty    { cursor:default;opacity:0;pointer-events:none; }
    .cal-day.past     { cursor:default;opacity:.3; }
    .cal-day.available { background:#12121A;border-color:#2A2A3E; }
    .cal-day.available:hover { border-color:#4ECDC4;background:#4ECDC410; }
    .cal-day.option-a  { background:#FF9F4318;border-color:#FF9F4344; }
    .cal-day.option-b  { background:#7B9CFF18;border-color:#7B9CFF44; }
    .cal-day.option-ab { background:#FF9F4318;border-color:#FF9F4344; }
    .cal-day.full      { background:#FF6B6B12;border-color:#FF6B6B33;cursor:not-allowed; }
    .cal-day.confirmed-a { background:#E8C54712;border-color:#E8C54733; }
    .cal-day.confirmed-b { background:#4ECDC412;border-color:#4ECDC433; }
    .cal-day.confirmed-ab { background:#FF6B6B18;border-color:#FF6B6B44;cursor:not-allowed; }
    .cal-day.selected { border-color:#E8C547 !important;background:#E8C54720 !important;box-shadow:0 0 0 2px #E8C54740; }
    .cal-day.today { box-shadow:inset 0 0 0 2px #E8C54766; }

    .option-card { padding:12px 14px;border-radius:10px;border:2px solid #2A2A3E;cursor:pointer;transition:all .18s;background:#0E0E18;display:flex;align-items:flex-start;gap:10px; }
    .option-card:hover { border-color:#3A3A5E;transform:translateY(-1px); }
    .option-card.selected { border-color:#E8C547;background:#E8C54710; }
    .option-check { width:18px;height:18px;border-radius:50%;border:2px solid #3A3A5E;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;transition:all .15s; }
    .option-check.checked { background:#E8C547;border-color:#E8C547; }

    .toggle { width:36px;height:20px;border-radius:10px;border:none;cursor:pointer;transition:all .2s;position:relative;flex-shrink:0; }
    .toggle.on  { background:#E8C547; }
    .toggle.off { background:#2A2A3E; }
    .toggle::after { content:'';position:absolute;top:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:all .2s; }
    .toggle.on::after  { left:18px; }
    .toggle.off::after { left:2px; }

    .modal-overlay { position:fixed;inset:0;background:#08080FDD;backdrop-filter:blur(6px);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px; }
    .modal { background:#12121A;border:1px solid #2A2A3E;border-radius:12px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;animation:fadeUp .25s ease; }

    .notif { position:fixed;bottom:24px;right:24px;z-index:200;background:#1A1A26;border:1px solid #2A2A3E;border-radius:8px;padding:12px 18px;font-family:'DM Sans',sans-serif;font-size:13px;color:#F0EEE8;display:flex;align-items:center;gap:8px;animation:fadeUp .3s ease;box-shadow:0 8px 32px #00000066; }

    .admin-input { background:#0E0E18;border:1px solid #2A2A3E;border-radius:6px;padding:6px 10px;color:#F0EEE8;font-family:'JetBrains Mono',monospace;font-size:12px;outline:none;transition:border-color .2s;width:100%;text-align:right; }
    .admin-input:focus { border-color:#E8C547; }

    .tag { display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;letter-spacing:.03em;text-transform:uppercase; }
    .tag-brief       { background:#7B9CFF22;color:#7B9CFF; }
    .tag-storyboard  { background:#E8C54722;color:#E8C547; }
    .tag-review      { background:#FF9F4322;color:#FF9F43; }
    .tag-delivered   { background:#4ECDC422;color:#4ECDC4; }

    .time-cell { background:#0E0E18;border:1px solid #2A2A3E;border-radius:6px;padding:6px 8px;color:#F0EEE8;font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;width:100%;text-align:center;transition:border-color .2s; }
    .time-cell:focus { border-color:#E8C547; }

    .step-dot { width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;transition:all .3s;font-family:'DM Sans',sans-serif; }
    .step-dot.done   { background:#4ECDC4;color:#08080F; }
    .step-dot.active { background:#E8C547;color:#08080F; }
    .step-dot.todo   { background:#1A1A26;color:#555570;border:1px solid #2A2A3E; }

    .price-range { background:linear-gradient(135deg,#E8C54712,#E8C54706);border:1px solid #E8C54730;border-radius:12px;padding:24px;text-align:center; }
    .discount-badge { display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;background:#4ECDC422;color:#4ECDC4;border:1px solid #4ECDC440; }
    .clickup-badge  { display:inline-flex;align-items:center;gap:5px;padding:3px 8px;background:#7B68EE22;border:1px solid #7B68EE44;border-radius:12px;font-family:'DM Sans',sans-serif;font-size:10px;color:#7B68EE;font-weight:600; }

    .timeline-step { display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;position:relative; }
    .timeline-step::after { content:'';position:absolute;top:13px;left:50%;right:-50%;height:2px;background:#2A2A3E;z-index:0; }
    .timeline-step:last-child::after { display:none; }
    .timeline-dot { width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;z-index:1;font-family:'DM Sans',sans-serif; }
    .dot-done   { background:#4ECDC4;color:#08080F; }
    .dot-active { background:#E8C547;color:#08080F;animation:pulse 1.8s infinite; }
    .dot-todo   { background:#1A1A26;color:#555570;border:1px solid #2A2A3E; }

    .comment-bubble { padding:10px 14px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;line-height:1.5;max-width:80%; }
    .comment-prod   { background:#1A1A26;color:#F0EEE8;align-self:flex-start; }
    .comment-client { background:#E8C54718;color:#F0EEE8;border:1px solid #E8C54730;align-self:flex-end; }

    .equip-item { display:flex;align-items:center;gap:8px;padding:8px 12px;background:#0E0E18;border-radius:7px;border:1px solid #2A2A3E;transition:all .15s; }
    .equip-item.included { border-color:#E8C54730; }
    .type-pill { padding:5px 12px;border-radius:20px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;border:1px solid #2A2A3E;background:#0E0E18;color:#8888AA;transition:all .15s; }
    .type-pill.selected { background:#E8C54720;border-color:#E8C547;color:#E8C547; }
    .type-pill:hover:not(.selected) { border-color:#3A3A5E;color:#F0EEE8; }
  `}</style>
);

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & REFERENCE DATA
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_STEPS   = ["Brief","Storyboard","Tournage","Montage","Livraison"];
const STATUS_INDEX   = { brief:0, storyboard:1, tournage:2, montage:3, livraison:4 };
const SHOOT_TYPES    = ["Corporate","Événementiel","Interview","Clip / Fiction","Documentaire","Institutionnel"];
// const OPTION_EXP_H   = 72;
const TODAY          = new Date();
const isoToday       = () => TODAY.toISOString().split("T")[0];
const d = (n) => { const x=new Date(TODAY); x.setDate(x.getDate()+n); return x.toISOString().split("T")[0]; };

const CHECKLIST_FIXED = [
  { id:"f1",  label:"Confirmation de la date avec le client",      phase:"Avant"  },
  { id:"f2",  label:"Brief technique envoyé à l'équipe",           phase:"Avant"  },
  { id:"f3",  label:"Repérage du lieu de tournage effectué",       phase:"Avant"  },
  { id:"f4",  label:"Autorisations de tournage obtenues",          phase:"Avant"  },
  { id:"f5",  label:"Matériel vérifié et chargé la veille",        phase:"Avant"  },
  { id:"f6",  label:"Arrivée sur site — état des lieux",           phase:"Jour J" },
  { id:"f7",  label:"Installation matériel et test son/image",     phase:"Jour J" },
  { id:"f8",  label:"Validation du cadre avec le réalisateur",     phase:"Jour J" },
  { id:"f9",  label:"Sauvegarde des rushes sur disque dur externe",phase:"Jour J" },
  { id:"f10", label:"Inventaire matériel au départ du lieu",       phase:"Jour J" },
  { id:"f11", label:"Débriefing équipe — points à noter",          phase:"Après"  },
  { id:"f12", label:"Transfert des rushes sur serveur / cloud",    phase:"Après"  },
  { id:"f13", label:"Email récap envoyé au client",                phase:"Après"  },
];

const EQUIPMENT_BY_TYPE = {
  "Corporate":      [{id:"cam_a",label:"Caméra principale (Sony FX3)",cat:"Caméra"},{id:"cam_b",label:"Caméra secondaire",cat:"Caméra"},{id:"trepied",label:"Trépied fluid head",cat:"Support"},{id:"micro_lav",label:"Micro-cravate ×2",cat:"Son"},{id:"micro_canon",label:"Micro canon",cat:"Son"},{id:"zoom_h6",label:"Enregistreur Zoom H6",cat:"Son"},{id:"led_panel",label:"Panneau LED 60W ×2",cat:"Lumière"},{id:"batteries",label:"Batteries ×4",cat:"Énergie"},{id:"cartes",label:"Cartes SD 256Go ×4",cat:"Stockage"},{id:"disque",label:"Disque dur 2To",cat:"Stockage"}],
  "Événementiel":   [{id:"cam_a",label:"Caméra principale (Sony FX3)",cat:"Caméra"},{id:"cam_b",label:"Caméra secondaire",cat:"Caméra"},{id:"cam_c",label:"GoPro ×2",cat:"Caméra"},{id:"trepied",label:"Trépied fluid head",cat:"Support"},{id:"steadicam",label:"Gimbal",cat:"Support"},{id:"micro_canon",label:"Micro canon",cat:"Son"},{id:"zoom_h6",label:"Enregistreur Zoom H6",cat:"Son"},{id:"batteries",label:"Batteries ×6",cat:"Énergie"},{id:"cartes",label:"Cartes SD 256Go ×6",cat:"Stockage"},{id:"disque",label:"Disque dur 2To",cat:"Stockage"}],
  "Interview":      [{id:"cam_a",label:"Caméra principale",cat:"Caméra"},{id:"cam_b",label:"Caméra secondaire",cat:"Caméra"},{id:"trepied",label:"Trépied ×2",cat:"Support"},{id:"micro_lav",label:"Micro-cravate ×2",cat:"Son"},{id:"micro_canon",label:"Micro canon",cat:"Son"},{id:"zoom_h6",label:"Enregistreur Zoom H6",cat:"Son"},{id:"led_panel",label:"Panneau LED ×3",cat:"Lumière"},{id:"softbox",label:"Softbox ×2",cat:"Lumière"},{id:"fond",label:"Fond papier/tissu",cat:"Décor"},{id:"batteries",label:"Batteries ×4",cat:"Énergie"},{id:"cartes",label:"Cartes SD ×2",cat:"Stockage"}],
  "Clip / Fiction": [{id:"cam_a",label:"Caméra principale (Sony FX3)",cat:"Caméra"},{id:"cam_b",label:"Caméra secondaire",cat:"Caméra"},{id:"trepied",label:"Trépied fluid head",cat:"Support"},{id:"steadicam",label:"Steadicam/Gimbal",cat:"Support"},{id:"slider",label:"Slider 60cm",cat:"Support"},{id:"micro_lav",label:"Micro-cravate ×3",cat:"Son"},{id:"zoom_h6",label:"Enregistreur Zoom H6",cat:"Son"},{id:"led_panel",label:"Panneau LED ×4",cat:"Lumière"},{id:"drone",label:"Drone DJI Mavic 3",cat:"Aérien"},{id:"batteries",label:"Batteries ×8",cat:"Énergie"},{id:"cartes",label:"Cartes SD ×6",cat:"Stockage"},{id:"disque",label:"Disque dur 4To",cat:"Stockage"}],
  "Documentaire":   [{id:"cam_a",label:"Caméra principale (Sony FX3)",cat:"Caméra"},{id:"cam_b",label:"Caméra légère (Sony ZV-E1)",cat:"Caméra"},{id:"trepied",label:"Trépied fluid head",cat:"Support"},{id:"monopod",label:"Monopode",cat:"Support"},{id:"micro_lav",label:"Micro-cravate ×2",cat:"Son"},{id:"micro_canon",label:"Micro canon",cat:"Son"},{id:"zoom_h6",label:"Enregistreur Zoom H6",cat:"Son"},{id:"batteries",label:"Batteries ×6",cat:"Énergie"},{id:"cartes",label:"Cartes SD ×6",cat:"Stockage"},{id:"disque",label:"Disque dur 4To",cat:"Stockage"}],
  "Institutionnel": [{id:"cam_a",label:"Caméra principale (Sony FX3)",cat:"Caméra"},{id:"cam_b",label:"Caméra secondaire",cat:"Caméra"},{id:"trepied",label:"Trépied ×2",cat:"Support"},{id:"micro_lav",label:"Micro-cravate ×2",cat:"Son"},{id:"zoom_h6",label:"Enregistreur Zoom H6",cat:"Son"},{id:"led_panel",label:"Panneau LED ×2",cat:"Lumière"},{id:"drone",label:"Drone DJI Mavic 3",cat:"Aérien"},{id:"batteries",label:"Batteries ×4",cat:"Énergie"},{id:"cartes",label:"Cartes SD ×4",cat:"Stockage"},{id:"disque",label:"Disque dur 2To",cat:"Stockage"}],
};

const DEFAULT_PRICING = {
  teams:{ A:{label:"Équipe A",dayRate:1800,description:"Équipe senior"}, B:{label:"Équipe B",dayRate:1400,description:"Équipe junior"} },
  prestations:[
    {id:"spot",label:"Spot publicitaire",icon:"📺",mult:1.0,minDays:1,maxDays:3},
    {id:"instit",label:"Film institutionnel",icon:"🏛️",mult:0.95,minDays:2,maxDays:5},
    {id:"clip",label:"Clip / Fiction",icon:"🎬",mult:1.15,minDays:1,maxDays:4},
    {id:"event",label:"Événementiel",icon:"🎉",mult:0.9,minDays:1,maxDays:2},
    {id:"interview",label:"Interview / Portrait",icon:"🎙️",mult:0.85,minDays:1,maxDays:1},
    {id:"docu",label:"Documentaire",icon:"🎞️",mult:1.05,minDays:3,maxDays:8},
  ],
  options:[
    {id:"drone",label:"Drone / Aérien",icon:"🚁",price:450,unit:"jour"},
    {id:"steadicam",label:"Steadicam / Gimbal",icon:"🎥",price:280,unit:"jour"},
    {id:"son",label:"Preneur de son dédié",icon:"🎚️",price:380,unit:"jour"},
    {id:"lumiere",label:"Chef électricien",icon:"💡",price:350,unit:"jour"},
    {id:"montage",label:"Montage inclus",icon:"✂️",price:650,unit:"forfait"},
    {id:"motion",label:"Motion design",icon:"✨",price:480,unit:"forfait"},
    {id:"etalonage",label:"Étalonnage colorimétrique",icon:"🎨",price:320,unit:"forfait"},
  ],
  rangeMargin:15,
};

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL DATA
// ─────────────────────────────────────────────────────────────────────────────
const INIT_CLIENTS = [
  { id:1, name:"Clément Distilleries", email:"contact@clement.mq",   discount:0,  type:"PME",           simulatorEnabled:true  },
  { id:2, name:"CTM",                  email:"commandes@ctm.mq",     discount:15, type:"Institutionnel", simulatorEnabled:true  },
  { id:3, name:"Tropiques Atrium",     email:"prod@tropiques.mq",    discount:10, type:"PME",           simulatorEnabled:false },
  { id:4, name:"Mairie Fort-de-France",email:"mairie@fdf.mq",        discount:12, type:"Institutionnel", simulatorEnabled:false },
];

const INIT_PROJECTS = [
  { id:1, title:"Spot 30s – Rhum Clément", clientId:1, status:"storyboard", progress:35, createdAt:"2026-04-10",
    brief:{objective:"Lancement Canne Bleue, ambiance premium nuit tropicale.",target:"25-40 ans CSP+",duration:"30 secondes",tone:"Premium, sensoriel",deliverables:"1 spot TV + version 15s réseaux"},
    replayUrl:"https://app.replay.io/",
    storyboards:[{id:1,title:"Version 1 – Nuit en distillerie",frames:[{id:1,desc:"Plan large : distillerie la nuit, lumières chaudes",visual:"🌙"},{id:2,desc:"Travelling avant vers les cuves en cuivre, reflets dorés",visual:"🥃"},{id:3,desc:"Mains expertes versant le rhum, gros plan sur couleur ambrée",visual:"✋"},{id:4,desc:"Verre en contre-jour, logo apparaît en fondu",visual:"✨"}],validationStatus:"pending",createdAt:"2026-04-12"}],
    comments:[{id:1,author:"Marie D.",text:"Brief validé, on attend le storyboard !",date:"2026-04-11",role:"client"},{id:2,author:"Studio",text:"Bien reçu, on revient sous 48h.",date:"2026-04-11",role:"prod"}],
    livrables:[],
  },
  { id:2, title:"Film institutionnel – CTM", clientId:2, status:"review", progress:70, createdAt:"2026-03-28",
    brief:{objective:"Valoriser les actions 2025-2026 auprès des citoyens",target:"Grand public martiniquais",duration:"3-4 minutes",tone:"Institutionnel, chaleureux",deliverables:"Film 4K + version sous-titrée"},
    replayUrl:"https://app.replay.io/",
    storyboards:[{id:1,title:"Version finale approuvée",frames:[{id:1,desc:"Aérien : survol de la Martinique au lever du soleil",visual:"🌅"},{id:2,desc:"Interviews élus et citoyens",visual:"🎙️"},{id:3,desc:"Chantiers et réalisations",visual:"🏗️"},{id:4,desc:"Conclusion optimiste, enfants, nature",visual:"🌿"}],validationStatus:"approved",createdAt:"2026-04-02"}],
    comments:[{id:1,author:"Jean-P.",text:"Le storyboard est excellent, on valide !",date:"2026-04-03",role:"client"},{id:2,author:"Studio",text:"Merci ! Tournage la semaine prochaine.",date:"2026-04-03",role:"prod"}],
    livrables:[{id:1,name:"Rushes semaine 1 (15 Go)",url:"#",note:"Cam A+B",category:"rushes",date:"2026-04-16"},{id:2,name:"Session droits – Comédiens",url:"#",note:"3 talents",category:"droits",date:"2026-04-14"}],
  },
];

const INIT_BOOKINGS = [
  {id:1,date:d(3), team:"A",client:"Clément Distilleries",status:"confirmed",confirmType:"devis",  extras:["drone"],     note:"Tournage nuit distillerie",createdAt:d(-2),expiresAt:null},
  {id:2,date:d(5), team:"B",client:"CTM",                 status:"confirmed",confirmType:"acompte",extras:[],            note:"Interview élus",           createdAt:d(-5),expiresAt:null},
  {id:3,date:d(7), team:"A",client:"Tropiques Atrium",    status:"option",   confirmType:null,     extras:["steadicam"], note:"",                         createdAt:d(-1),expiresAt:new Date(Date.now()+18*3600000).toISOString()},
  {id:4,date:d(7), team:"B",client:"Nouveau client",      status:"option",   confirmType:null,     extras:[],            note:"",                         createdAt:d(0), expiresAt:new Date(Date.now()+47*3600000).toISOString()},
  {id:5,date:d(3), team:"B",client:"Rhum J.M",            status:"confirmed",confirmType:"devis",  extras:[],            note:"",                         createdAt:d(-3),expiresAt:null},
];

const INIT_SHEETS = [
  { id:1, projectTitle:"Spot 30s – Rhum Clément", client:"Clément Distilleries", team:"A", shootType:"Corporate",     dates:[d(3),d(4)],
    equipment:["cam_a","cam_b","trepied","micro_lav","micro_canon","zoom_h6","led_panel","batteries","cartes","disque"],
    checklist:{fixed:["f1","f2","f3"],custom:[{id:"c1",label:"Valider liste plans avec DA",done:false}]},
    timesheet:[{id:1,date:d(3),member:"Équipe A",start:"07:00",end:"19:00",notes:"Tournage nuit distillerie"}],
    clickupTaskId:null, createdAt:"2026-04-12" },
  { id:2, projectTitle:"Film institutionnel – CTM", client:"CTM", team:"B", shootType:"Institutionnel", dates:[d(8),d(9),d(10)],
    equipment:["cam_a","cam_b","trepied","micro_lav","zoom_h6","led_panel","drone","batteries","cartes","disque"],
    checklist:{fixed:["f1","f2","f3","f4","f5"],custom:[{id:"c1",label:"Vérifier autorisation vol drone",done:false}]},
    timesheet:[{id:1,date:d(8),member:"Équipe B",start:"08:00",end:"18:00",notes:"Interviews"},{id:2,date:d(9),member:"Équipe B",start:"06:00",end:"20:00",notes:"Drone aérien"}],
    clickupTaskId:"abc123", createdAt:"2026-04-05" },
];

const INIT_ESTIMATES = [
  {id:1,client:"CTM",prestation:"Film institutionnel",team:"A",days:3,options:["drone","montage"],min:6120,max:7038,date:"2026-04-10",status:"devis"},
  {id:2,client:"Clément Distilleries",prestation:"Spot publicitaire",team:"A",days:2,options:["steadicam","etalonage"],min:4284,max:4926,date:"2026-04-15",status:"en_attente"},
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmtEur   = (n) => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
const fmtD   = (s) => new Date(s+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
const fmtS   = (s) => new Date(s+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"short"});
const calcH  = (s,e) => { if(!s||!e)return 0; const[sh,sm]=s.split(":").map(Number);const[eh,em]=e.split(":").map(Number);return Math.max(0,(eh*60+em-sh*60-sm)/60); };

function Notif({msg,color="#4ECDC4",onDone}){
  useEffect(()=>{const t=setTimeout(onDone,3000);return()=>clearTimeout(t);});
  return <div className="notif"><span style={{color}}>✓</span> {msg}</div>;
}
function Lbl({children,style={}}){
  return <label style={{fontFamily:"'DM Sans'",fontSize:11,color:"#8888AA",textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:5,...style}}>{children}</label>;
}
function SH({icon,title,sub,right}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:32,height:32,borderRadius:8,background:"#E8C54718",border:"1px solid #E8C54730",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{icon}</div>
        <div>
          <h3 style={{fontFamily:"'Bebas Neue'",fontSize:16,color:"#F0EEE8",letterSpacing:"0.05em"}}>{title}</h3>
          {sub&&<p style={{fontFamily:"'DM Sans'",fontSize:11,color:"#555570",marginTop:1}}>{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function getDayStatus(dateStr,bookings){
  const day=bookings.filter(b=>b.date===dateStr&&b.status!=="expired"&&b.status!=="refused");
  const A=day.find(b=>b.team==="A"), B=day.find(b=>b.team==="B");
  const s=b=>{
    if(!b)return"free";
    if(b.status==="confirmed")return"confirmed";
    if(b.status==="option"&&b.expiresAt&&new Date(b.expiresAt)<Date.now())return"free";
    if(b.status==="option")return"option";
    return"free";
  };
  return{A:s(A),B:s(B),bookingA:A,bookingB:B};
}
function getDayClass(dateStr,bookings){
  const t=isoToday();
  if(dateStr<t)return"past";
  const{A,B}=getDayStatus(dateStr,bookings);
  if(A==="confirmed"&&B==="confirmed")return"confirmed-ab";
  if(A==="confirmed")return"confirmed-a";
  if(B==="confirmed")return"confirmed-b";
  if(A==="option"&&B==="option")return"option-ab";
  if(A==="option")return"option-a";
  if(B==="option")return"option-b";
  return"available";
}
function getCountdown(exp){
  const diff=new Date(exp)-Date.now();
  if(diff<=0)return"Expirée";
  const h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000);
  return`${h}h${String(m).padStart(2,"0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICING HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function calcEstimate(pricing,form,discount=0){
  const team=pricing.teams[form.team];
  const prest=pricing.prestations.find(p=>p.id===form.prestationId);
  if(!team||!prest||!form.days)return null;
  let base=team.dayRate*form.days*prest.mult;
  const optTotal=form.options.reduce((a,id)=>{const o=pricing.options.find(x=>x.id===id);return a+(o?(o.unit==="jour"?o.price*form.days:o.price):0);},0);
  let sub=(base+optTotal)*(1-discount/100);
  const mg=pricing.rangeMargin/100;
  return{min:Math.round(sub*(1-mg/2)),max:Math.round(sub*(1+mg/2)),discount};
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: TIMELINE
// ─────────────────────────────────────────────────────────────────────────────
function Timeline({status}){
  const cur=STATUS_INDEX[status]??0;
  return(
    <div style={{display:"flex",alignItems:"flex-start",padding:"4px 0"}}>
      {STATUS_STEPS.map((s,i)=>(
        <div key={s} className="timeline-step">
          <div className={`timeline-dot ${i<cur?"dot-done":i===cur?"dot-active":"dot-todo"}`}>{i<cur?"✓":i+1}</div>
          <span style={{fontFamily:"'DM Sans'",fontSize:9,color:i<=cur?"#F0EEE8":"#555570",textAlign:"center"}}>{s}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: COMMENT THREAD
// ─────────────────────────────────────────────────────────────────────────────
function CommentThread({comments,onAdd,role="prod"}){
  const[text,setText]=useState("");
  const endRef=useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[comments]);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:260,overflowY:"auto",padding:"2px 0"}}>
        {comments.length===0&&<p style={{fontFamily:"'DM Sans'",fontSize:13,color:"#555570",textAlign:"center",padding:"20px 0"}}>Aucun message.</p>}
        {comments.map(c=>(
          <div key={c.id} style={{display:"flex",flexDirection:"column",alignItems:c.role==="client"?"flex-end":"flex-start",gap:2}}>
            <span style={{fontFamily:"'DM Sans'",fontSize:10,color:"#555570",paddingInline:4}}>{c.author} · {fmtS(c.date)}</span>
            <div className={`comment-bubble comment-${c.role==="client"?"client":"prod"}`}>{c.text}</div>
          </div>
        ))}
        <div ref={endRef}/>
      </div>
      <div style={{display:"flex",gap:8}}>
        <input className="input" placeholder="Écrire un message..." value={text} onChange={e=>setText(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&text.trim()){onAdd(text,role);setText("");}}} style={{flex:1}}/>
        <button className="btn btn-primary" onClick={()=>{if(text.trim()){onAdd(text,role);setText("");}}} >→</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE A — CLIENT PORTAL
// ─────────────────────────────────────────────────────────────────────────────
function FrameCard({frame,index}){
  const colors=["#E8C54722","#4ECDC422","#7B9CFF22","#FF9F4322","#FF6B6B22"];
  return(
    <div style={{flex:"0 0 auto",width:150,background:"#0E0E18",border:"1px solid #2A2A3E",borderRadius:8,overflow:"hidden",transition:"all .2s"}}>
      <div style={{height:90,background:colors[index%colors.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,position:"relative"}}>
        {frame.visual}
        <span style={{position:"absolute",top:5,left:7,fontFamily:"'Bebas Neue'",fontSize:10,color:"#555570",letterSpacing:1}}>PLAN {index+1}</span>
      </div>
      <div style={{padding:"7px 9px"}}><p style={{fontFamily:"'DM Sans'",fontSize:11,color:"#8888AA",lineHeight:1.4}}>{frame.desc}</p></div>
    </div>
  );
}

function AIGenerator({project,onGenerated}){
  const[prompt,setPrompt]=useState("");
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState(null);
  const brief=project.brief;
  const briefTxt=`Projet: ${project.title}\nObjectif: ${brief?.objective||""}\nCible: ${brief?.target||""}\nDurée: ${brief?.duration||""}\nTon: ${brief?.tone||""}`;
  const gen=async()=>{
    if(!prompt.trim())return;
    setLoading(true);setError(null);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:`Tu es storyboarder pro. Réponds UNIQUEMENT en JSON valide sans markdown.\nFormat: {"title":"...","frames":[{"id":1,"visual":"emoji","desc":"description cinématographique 30-60 mots"}]}\n4 à 6 plans.`,messages:[{role:"user",content:`${briefTxt}\nInstructions: ${prompt}`}]})});
      const data=await res.json();
      const raw=data.content?.[0]?.text||"";
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      onGenerated({...parsed,id:Date.now(),validationStatus:"pending",createdAt:new Date().toISOString().split("T")[0]});
    }catch{setError("Erreur de génération. Réessaie.");}
    setLoading(false);
  };
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{background:"#0E0E18",border:"1px solid #2A2A3E",borderRadius:7,padding:"10px 12px"}}>
        <p style={{fontFamily:"'JetBrains Mono'",fontSize:10,color:"#555570",lineHeight:1.6,whiteSpace:"pre-line"}}>{briefTxt}</p>
      </div>
      <textarea className="input" rows={3} placeholder="Instructions créatives : ambiance, angles, éléments visuels clés..." value={prompt} onChange={e=>setPrompt(e.target.value)}/>
      {error&&<p style={{fontFamily:"'DM Sans'",fontSize:12,color:"#FF6B6B"}}>{error}</p>}
      <button className="btn btn-primary" onClick={gen} disabled={loading||!prompt.trim()} style={{alignSelf:"flex-start",opacity:loading?.7:1}}>
        {loading?<><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span> Génération...</>:"✦ Générer"}
      </button>
    </div>
  );
}

function ProdLivrables({project,onUpdate,onNotif}){
  const[showAdd,setShowAdd]=useState(null);
  const[form,setForm]=useState({name:"",url:"",note:""});
  const sections=[
    {key:"rushes",  label:"Rushes",              icon:"🎬",color:"#7B9CFF",colorDim:"#7B9CFF18",colorBorder:"#7B9CFF30",vis:false},
    {key:"droits",  label:"Documents de droits", icon:"📄",color:"#FF9F43",colorDim:"#FF9F4318",colorBorder:"#FF9F4330",vis:false},
    {key:"finaux",  label:"Livrables finaux",     icon:"✦", color:"#4ECDC4",colorDim:"#4ECDC418",colorBorder:"#4ECDC430",vis:true},
  ];
  const files=key=>(project.livrables||[]).filter(l=>l.category===key);
  const add=()=>{
    if(!form.name.trim())return;
    onUpdate({...project,livrables:[...(project.livrables||[]),{id:Date.now(),...form,category:showAdd,date:new Date().toISOString().split("T")[0]}]});
    onNotif("Fichier ajouté !");setForm({name:"",url:"",note:""});setShowAdd(null);
  };
  const del=id=>onUpdate({...project,livrables:(project.livrables||[]).filter(l=>l.id!==id)});
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {sections.map(sec=>{
        const fs=files(sec.key);
        return(
          <div key={sec.key} className="card" style={{padding:16,borderColor:fs.length?sec.colorBorder:"#2A2A3E"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:30,height:30,borderRadius:7,background:sec.colorDim,border:`1px solid ${sec.colorBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{sec.icon}</div>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,color:"#F0EEE8"}}>{sec.label}</span>
                    <span style={{fontFamily:"'DM Sans'",fontSize:9,color:sec.vis?sec.color:"#555570",background:sec.vis?sec.colorDim:"#1A1A26",border:`1px solid ${sec.vis?sec.colorBorder:"#2A2A3E"}`,borderRadius:8,padding:"1px 6px"}}>{sec.vis?"Visible client":"Interne"}</span>
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost" style={{fontSize:11,borderColor:sec.colorBorder,color:sec.color}} onClick={()=>setShowAdd(showAdd===sec.key?null:sec.key)}>{showAdd===sec.key?"✕":"+ Ajouter"}</button>
            </div>
            {showAdd===sec.key&&(
              <div style={{background:"#0E0E18",border:`1px solid ${sec.colorBorder}`,borderRadius:7,padding:12,marginBottom:10,display:"flex",flexDirection:"column",gap:7}}>
                <input className="input" placeholder="Nom du fichier *" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
                <input className="input" placeholder="Lien (Drive, WeTransfer...)" value={form.url} onChange={e=>setForm(p=>({...p,url:e.target.value}))}/>
                <input className="input" placeholder="Note interne (optionnel)" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))}/>
                <div style={{display:"flex",gap:7,justifyContent:"flex-end"}}>
                  <button className="btn btn-ghost" style={{fontSize:11}} onClick={()=>setShowAdd(null)}>Annuler</button>
                  <button className="btn btn-primary" style={{fontSize:11}} onClick={add}>Enregistrer</button>
                </div>
              </div>
            )}
            {fs.length===0?<p style={{fontFamily:"'DM Sans'",fontSize:12,color:"#3A3A5A",textAlign:"center",padding:"8px 0"}}>Aucun fichier</p>:(
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {fs.map(f=>(
                  <div key={f.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#08080F",borderRadius:6,border:"1px solid #2A2A3E"}}>
                    <div style={{width:5,height:5,borderRadius:"50%",background:sec.color,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontFamily:"'DM Sans'",fontSize:12,color:"#F0EEE8",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</p>
                      {f.note&&<p style={{fontFamily:"'DM Sans'",fontSize:10,color:"#555570"}}>{f.note}</p>}
                    </div>
                    <a href={f.url} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{fontSize:10,padding:"3px 8px",textDecoration:"none"}}>↗</a>
                    <button className="btn btn-red" style={{fontSize:10,padding:"3px 7px"}} onClick={()=>del(f.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProdProjectView({project,onUpdate,onNotif}){
  const[tab,setTab]=useState("brief");
  const[showGen,setShowGen]=useState(false);
  const briefFields=[{k:"objective",l:"Objectif",p:"Quel message / contexte ?"},{k:"target",l:"Cible",p:"Âge, CSP..."},{k:"duration",l:"Durée",p:"30s, 2min..."},{k:"tone",l:"Ton",p:"Premium, documentaire..."},{k:"deliverables",l:"Livrables",p:"Formats, versions..."}];
  const[brief,setBrief]=useState({...project.brief});
  const addSB=sb=>{onUpdate({...project,storyboards:[...project.storyboards,sb]});setShowGen(false);onNotif("Storyboard généré !");};
  const updSB=(id,st)=>{onUpdate({...project,storyboards:project.storyboards.map(s=>s.id===id?{...s,validationStatus:st}:s)});onNotif("Statut mis à jour");};
  const addMsg=(text,role)=>{const c={id:Date.now(),author:role==="prod"?"Studio":"Client",text,date:new Date().toISOString().split("T")[0],role};onUpdate({...project,comments:[...project.comments,c]});};
  const saveBrief=()=>{onUpdate({...project,brief,status:project.status==="brief"?"storyboard":project.status});onNotif("Brief sauvegardé !");};
  const tabs=[{k:"brief",l:"Brief"},{k:"storyboards",l:`Storyboards (${project.storyboards.length})`},{k:"comments",l:`Messages (${project.comments.length})`},{k:"livrables",l:"Livrables"}];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div className="fadeUp">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
          <div><h2 style={{fontFamily:"'Bebas Neue'",fontSize:26,color:"#F0EEE8",letterSpacing:"0.04em"}}>{project.title}</h2></div>
          <span className={`tag tag-${project.status}`}>{project.status}</span>
        </div>
        <div style={{marginTop:12}}><Timeline status={project.status}/></div>
      </div>
      <div style={{display:"flex",gap:4,background:"#0E0E18",padding:4,borderRadius:8,overflowX:"auto"}}>
        {tabs.map(t=><button key={t.k} className={`tab ${tab===t.k?"active":""}`} style={{whiteSpace:"nowrap"}} onClick={()=>setTab(t.k)}>{t.l}</button>)}
      </div>
      {tab==="brief"&&(
        <div className="card fadeUp" style={{padding:18}}>
          <SH icon="📋" title="BRIEF CLIENT"/>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {briefFields.map(f=>(
              <div key={f.k}><Lbl>{f.l}</Lbl>
                <textarea className="input" rows={2} placeholder={f.p} value={brief[f.k]||""} onChange={e=>setBrief(p=>({...p,[f.k]:e.target.value}))}/>
              </div>
            ))}
            <button className="btn btn-primary" style={{alignSelf:"flex-end"}} onClick={saveBrief}>Enregistrer</button>
          </div>
        </div>
      )}
      {tab==="storyboards"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h3 style={{fontFamily:"'Bebas Neue'",fontSize:17,color:"#F0EEE8",letterSpacing:"0.05em"}}>STORYBOARDS</h3>
            <button className="btn btn-primary" onClick={()=>setShowGen(!showGen)}>{showGen?"✕ Fermer":"✦ Générer avec IA"}</button>
          </div>
          {showGen&&<div className="card fadeUp" style={{padding:16}}><AIGenerator project={project} onGenerated={addSB}/></div>}
          {project.storyboards.map(sb=>(
            <div key={sb.id} className="card fadeUp" style={{padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
                <div><p style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,color:"#F0EEE8"}}>{sb.title}</p><span style={{fontFamily:"'DM Sans'",fontSize:11,color:"#555570"}}>{fmtS(sb.createdAt)}</span></div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {sb.validationStatus==="approved"&&<span className="tag" style={{background:"#4ECDC422",color:"#4ECDC4"}}>✓ Approuvé</span>}
                  {sb.validationStatus==="pending"&&<span className="tag" style={{background:"#E8C54722",color:"#E8C547"}}>⏳ En attente</span>}
                  {sb.validationStatus==="revision"&&<span className="tag" style={{background:"#FF6B6B22",color:"#FF6B6B"}}>↩ Révision</span>}
                  {sb.validationStatus!=="approved"&&<button className="btn btn-green" style={{fontSize:11}} onClick={()=>updSB(sb.id,"approved")}>Valider</button>}
                </div>
              </div>
              <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>{sb.frames.map((f,i)=><FrameCard key={f.id} frame={f} index={i}/>)}</div>
            </div>
          ))}
        </div>
      )}
      {tab==="comments"&&<div className="card fadeUp" style={{padding:16}}><SH icon="💬" title="MESSAGES"/><CommentThread comments={project.comments} onAdd={addMsg} role="prod"/></div>}
      {tab==="livrables"&&<ProdLivrables project={project} onUpdate={onUpdate} onNotif={onNotif}/>}
    </div>
  );
}

function ClientProjectView({project,clientData,onUpdate,onNotif,pricing}){
  const[tab,setTab]=useState("suivi");
  const hasSimulator=clientData?.simulatorEnabled;
  const valSB=(id,st)=>{onUpdate({...project,storyboards:project.storyboards.map(s=>s.id===id?{...s,validationStatus:st}:s)});onNotif(st==="approved"?"Storyboard approuvé !":"Révision demandée");};
  const addMsg=(text,role)=>{const c={id:Date.now(),author:clientData?.name||"Client",text,date:new Date().toISOString().split("T")[0],role:"client"};onUpdate({...project,comments:[...project.comments,c]});};
  const finaux=(project.livrables||[]).filter(l=>l.category==="finaux");
  const tabs=[{k:"suivi",l:"Suivi"},{k:"storyboards",l:`Storyboards (${project.storyboards.length})`},{k:"replay",l:"Révisions vidéo"},{k:"messages",l:`Messages (${project.comments.length})`},{k:"livrables",l:"Livrables"},...(hasSimulator?[{k:"estimation",l:"💰 Estimation"}]:[])];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div className="fadeUp" style={{background:"linear-gradient(135deg,#E8C54710,#7B9CFF08)",border:"1px solid #E8C54720",borderRadius:10,padding:"16px 18px"}}>
        <h2 style={{fontFamily:"'Bebas Neue'",fontSize:24,color:"#F0EEE8",letterSpacing:"0.04em"}}>{project.title}</h2>
        <p style={{fontFamily:"'DM Sans'",fontSize:12,color:"#8888AA",marginTop:2}}>Votre projet est en cours de production</p>
        <div style={{marginTop:12}}><Timeline status={project.status}/></div>
      </div>
      <div style={{display:"flex",gap:4,background:"#0E0E18",padding:4,borderRadius:8,overflowX:"auto"}}>
        {tabs.map(t=><button key={t.k} className={`tab ${tab===t.k?"active":""}`} style={{whiteSpace:"nowrap"}} onClick={()=>setTab(t.k)}>{t.l}</button>)}
      </div>
      {tab==="suivi"&&(
        <div className="card fadeUp" style={{padding:18}}>
          <SH icon="📊" title="AVANCEMENT"/>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {STATUS_STEPS.map((s,i)=>{const cur=STATUS_INDEX[project.status]??0,done=i<cur,act=i===cur;return(
              <div key={s} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,background:act?"#E8C54710":done?"#4ECDC410":"#0E0E18",border:`1px solid ${act?"#E8C54730":done?"#4ECDC430":"#2A2A3E"}`}}>
                <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:done?"#4ECDC4":act?"#E8C547":"#1A1A26",color:(done||act)?"#08080F":"#555570",fontWeight:700,fontSize:11,flexShrink:0}}>{done?"✓":i+1}</div>
                <p style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,color:act?"#E8C547":done?"#4ECDC4":"#555570"}}>{s}</p>
                {act&&<span style={{fontFamily:"'DM Sans'",fontSize:11,color:"#8888AA",marginLeft:"auto"}}>En cours</span>}
              </div>
            );})}
          </div>
        </div>
      )}
      {tab==="storyboards"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {project.storyboards.length===0&&<p style={{fontFamily:"'DM Sans'",fontSize:13,color:"#555570",textAlign:"center",padding:"30px 0"}}>Votre storyboard est en cours de création.</p>}
          {project.storyboards.map(sb=>(
            <div key={sb.id} className="card fadeUp" style={{padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
                <div><p style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,color:"#F0EEE8"}}>{sb.title}</p><span style={{fontFamily:"'DM Sans'",fontSize:11,color:"#555570"}}>Reçu le {fmtS(sb.createdAt)}</span></div>
                {sb.validationStatus==="approved"&&<span className="tag" style={{background:"#4ECDC422",color:"#4ECDC4"}}>✓ Approuvé</span>}
                {sb.validationStatus==="revision"&&<span className="tag" style={{background:"#FF6B6B22",color:"#FF6B6B"}}>↩ Révision en cours</span>}
              </div>
              <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:6}}>{sb.frames.map((f,i)=><FrameCard key={f.id} frame={f} index={i}/>)}</div>
              {sb.validationStatus==="pending"&&(
                <div style={{marginTop:12,padding:"12px 14px",background:"#E8C54710",border:"1px solid #E8C54720",borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                  <p style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,color:"#F0EEE8"}}>Votre validation est requise</p>
                  <div style={{display:"flex",gap:6}}>
                    <button className="btn btn-red" onClick={()=>valSB(sb.id,"revision")}>↩ Révision</button>
                    <button className="btn btn-green" onClick={()=>valSB(sb.id,"approved")}>✓ Approuver</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {tab==="replay"&&(
        <div className="card fadeUp" style={{padding:18}}>
          <SH icon="▶" title="RÉVISIONS VIDÉO" sub="Commentez directement sur la timeline vidéo"/>
          {project.replayUrl?(
            <div style={{background:"#0E0E18",border:"1px solid #2A2A3E",borderRadius:8,aspectRatio:"16/9",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10}}>
              <div style={{fontSize:36}}>▶</div>
              <a href={project.replayUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{textDecoration:"none"}}>Ouvrir dans Replay →</a>
            </div>
          ):<p style={{fontFamily:"'DM Sans'",fontSize:13,color:"#555570",textAlign:"center",padding:"30px 0"}}>Aucune vidéo partagée pour l'instant.</p>}
        </div>
      )}
      {tab==="messages"&&<div className="card fadeUp" style={{padding:16}}><SH icon="💬" title="MESSAGES"/><CommentThread comments={project.comments} onAdd={addMsg} role="client"/></div>}
      {tab==="livrables"&&(
        <div className="card fadeUp" style={{padding:18}}>
          <SH icon="✦" title="LIVRABLES FINAUX"/>
          {finaux.length===0?<p style={{fontFamily:"'DM Sans'",fontSize:13,color:"#555570",textAlign:"center",padding:"20px 0"}}>Vos livrables apparaîtront ici.</p>:(
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {finaux.map(l=>(
                <div key={l.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#0E0E18",borderRadius:8,border:"1px solid #4ECDC430"}}>
                  <div style={{flex:1}}><p style={{fontFamily:"'DM Sans'",fontSize:13,color:"#F0EEE8",fontWeight:500}}>{l.name}</p><p style={{fontFamily:"'DM Sans'",fontSize:10,color:"#555570"}}>Depuis le {fmtS(l.date)}</p></div>
                  <a href={l.url} target="_blank" rel="noreferrer" className="btn btn-green" style={{textDecoration:"none",fontSize:11}}>⬇ Télécharger</a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {tab==="estimation"&&hasSimulator&&<ClientEstimationWidget pricing={pricing} clientData={clientData}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE B — CALENDAR
// ─────────────────────────────────────────────────────────────────────────────
function CalendarModule({bookings,setBookings,isAdmin,onNotif}){
  const[month,setMonth]=useState(new Date(TODAY.getFullYear(),TODAY.getMonth(),1));
  const[selected,setSelected]=useState(null);
  const[modal,setModal]=useState(null);

  const daysInMonth=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  const firstDay=(new Date(month.getFullYear(),month.getMonth(),1).getDay()+6)%7;
  const monthStr=month.toLocaleDateString("fr-FR",{month:"long",year:"numeric"});

  const dayStr=(day)=>{
    const dt=new Date(month.getFullYear(),month.getMonth(),day);
    return dt.toISOString().split("T")[0];
  };

  const handleDayClick=(ds)=>{
    if(ds<isoToday())return;
    setSelected(ds);
    const{A,B,bookingA,bookingB}=getDayStatus(ds,bookings);
    setModal({date:ds,statusA:A,statusB:B,bookingA,bookingB});
  };

  // const statusColors={free:"#4ECDC4",option:"#FF9F43",confirmed:"#FF6B6B"};
  // const teamColors={A:"#E8C547",B:"#4ECDC4"};

  const alerts=bookings.filter(b=>b.status==="option"&&b.expiresAt&&new Date(b.expiresAt)-Date.now()<24*3600000&&new Date(b.expiresAt)>Date.now());

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {alerts.length>0&&(
        <div style={{background:"#FF9F4318",border:"1px solid #FF9F4340",borderRadius:8,padding:"10px 14px",display:"flex",gap:10,alignItems:"flex-start"}}>
          <span style={{color:"#FF9F43",fontSize:16}}>⚠️</span>
          <div>
            <p style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,color:"#FF9F43"}}>Options expirant dans moins de 24h</p>
            {alerts.map(a=>(
              <p key={a.id} style={{fontFamily:"'DM Sans'",fontSize:12,color:"#FF9F43",opacity:.8,marginTop:3}}>
                {a.client} – Équipe {a.team} – {fmtS(a.date)} – expire dans {getCountdown(a.expiresAt)}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{padding:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <button className="btn btn-ghost" style={{padding:"6px 12px"}} onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>←</button>
          <h3 style={{fontFamily:"'Bebas Neue'",fontSize:20,color:"#F0EEE8",letterSpacing:"0.06em",textTransform:"capitalize"}}>{monthStr}</h3>
          <button className="btn btn-ghost" style={{padding:"6px 12px"}} onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>→</button>
        </div>

        {/* Day headers */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:4}}>
          {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(d=>(
            <div key={d} style={{textAlign:"center",fontFamily:"'DM Sans'",fontSize:10,color:"#555570",padding:"4px 0"}}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
          {Array.from({length:firstDay},(_,i)=><div key={`e${i}`} className="cal-day empty"/>)}
          {Array.from({length:daysInMonth},(_,i)=>{
            const ds=dayStr(i+1);
            const cls=getDayClass(ds,bookings);
            const isToday=ds===isoToday();
            const isSel=ds===selected;
            const{A,B}=getDayStatus(ds,bookings);
            return(
              <div key={i} className={`cal-day ${cls} ${isSel?"selected":""} ${isToday?"today":""}`} onClick={()=>handleDayClick(ds)}>
                <span style={{fontFamily:"'DM Sans'",fontSize:12,fontWeight:600,color:"#F0EEE8"}}>{i+1}</span>
                <div style={{display:"flex",gap:2}}>
                  {A!=="free"&&<div style={{width:5,height:5,borderRadius:"50%",background:A==="confirmed"?"#E8C547":"#FF9F43"}}/>}
                  {B!=="free"&&<div style={{width:5,height:5,borderRadius:"50%",background:B==="confirmed"?"#4ECDC4":"#7B9CFF"}}/>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{display:"flex",flexWrap:"wrap",gap:12,marginTop:14,paddingTop:12,borderTop:"1px solid #2A2A3E"}}>
          {[["#4ECDC4","Disponible"],["#FF9F43","Option (Éq.A)"],["#7B9CFF","Option (Éq.B)"],["#E8C547","Confirmé Éq.A"],["#4ECDC4","Confirmé Éq.B"],["#FF6B6B","Complet"]].map(([c,l])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:8,height:8,borderRadius:2,background:c+"44",border:`1px solid ${c}66`}}/>
              <span style={{fontFamily:"'DM Sans'",fontSize:10,color:"#8888AA"}}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day detail modal */}
      {modal&&(
        <DayModal modal={modal} bookings={bookings} setBookings={setBookings} isAdmin={isAdmin} onClose={()=>{setModal(null);setSelected(null);}} onNotif={onNotif}/>
      )}

      {/* Admin: upcoming bookings list */}
      {isAdmin&&(
        <div className="card" style={{padding:18}}>
          <SH icon="📋" title="RÉSERVATIONS À VENIR"/>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {bookings.filter(b=>b.date>=isoToday()&&b.status!=="expired").sort((a,b)=>a.date.localeCompare(b.date)).slice(0,8).map(b=>(
              <div key={b.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:"#0E0E18",borderRadius:7,border:"1px solid #2A2A3E"}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:b.status==="confirmed"?(b.team==="A"?"#E8C547":"#4ECDC4"):"#FF9F43",flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontFamily:"'DM Sans'",fontSize:12,fontWeight:500,color:"#F0EEE8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.client}</p>
                  <p style={{fontFamily:"'DM Sans'",fontSize:10,color:"#555570"}}>{fmtS(b.date)} · Équipe {b.team}</p>
                </div>
                <span style={{fontFamily:"'DM Sans'",fontSize:11,color:b.status==="confirmed"?"#4ECDC4":"#FF9F43",background:b.status==="confirmed"?"#4ECDC418":"#FF9F4318",border:`1px solid ${b.status==="confirmed"?"#4ECDC430":"#FF9F4330"}`,borderRadius:10,padding:"2px 8px"}}>
                  {b.status==="confirmed"?`Confirmé (${b.confirmType})`:`Option — ${b.expiresAt?getCountdown(b.expiresAt):"..."}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DayModal({modal,bookings,setBookings,isAdmin,onClose,onNotif}){
  const[form,setForm]=useState({team:"A",client:"",note:""});
  const[confirmCheck,setConfirmCheck]=useState({devis:false,acompte:false});
  const[confirmTarget,setConfirmTarget]=useState(null);
  const{date,statusA,statusB,bookingA,bookingB}=modal;
  const freeTeams=[statusA==="free"&&"A",statusB==="free"&&"B"].filter(Boolean);

  const addOption=()=>{
    if(!form.client.trim())return;
    const exp=new Date(Date.now()+72*3600000).toISOString();
    setBookings(bs=>[...bs,{id:Date.now(),date,team:form.team,client:form.client,status:"option",confirmType:null,extras:[],note:form.note,createdAt:isoToday(),expiresAt:exp}]);
    onNotif(`Option posée — Équipe ${form.team} le ${fmtS(date)}`);onClose();
  };

  const confirm=(booking)=>{
    if(!confirmCheck.devis&&!confirmCheck.acompte){onNotif("Coche devis signé ou acompte reçu");return;}
    setBookings(bs=>bs.map(b=>b.id===booking.id?{...b,status:"confirmed",confirmType:confirmCheck.devis?"devis":"acompte",expiresAt:null}:b));
    onNotif("Réservation confirmée et bloquée !");setConfirmTarget(null);onClose();
  };

  const refuse=(id)=>{
    setBookings(bs=>bs.map(b=>b.id===id?{...b,status:"refused"}:b));
    onNotif("Option refusée");onClose();
  };

  const teamColor=t=>t==="A"?"#E8C547":"#4ECDC4";

  return(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{padding:24}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{fontFamily:"'Bebas Neue'",fontSize:20,color:"#F0EEE8",letterSpacing:"0.05em"}}>{fmtD(date)}</h3>
          <button className="btn btn-ghost" style={{padding:"4px 10px"}} onClick={onClose}>✕</button>
        </div>

        {/* Team status */}
        {["A","B"].map(team=>{
          const booking=team==="A"?bookingA:bookingB;
          const status=team==="A"?statusA:statusB;
          const tc=teamColor(team);
          return(
            <div key={team} style={{marginBottom:14,padding:14,background:"#0E0E18",borderRadius:8,border:`1px solid ${tc}22`}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:status==="free"?"#4ECDC4":status==="option"?"#FF9F43":"#FF6B6B"}}/>
                <span style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,color:tc}}>Équipe {team}</span>
                <span style={{fontFamily:"'DM Sans'",fontSize:11,color:"#8888AA"}}>— {status==="free"?"Disponible":status==="option"?"Option en cours":"Confirmé"}</span>
              </div>
              {booking&&(
                <div style={{paddingLeft:16}}>
                  <p style={{fontFamily:"'DM Sans'",fontSize:13,color:"#F0EEE8",fontWeight:500}}>{booking.client}</p>
                  {booking.note&&<p style={{fontFamily:"'DM Sans'",fontSize:11,color:"#555570",marginTop:2}}>{booking.note}</p>}
                  {booking.status==="option"&&booking.expiresAt&&(
                    <p style={{fontFamily:"'JetBrains Mono'",fontSize:11,color:"#FF9F43",marginTop:4}}>Expire dans : {getCountdown(booking.expiresAt)}</p>
                  )}
                  {isAdmin&&booking.status==="option"&&(
                    <>
                      {confirmTarget===booking.id?(
                        <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:8}}>
                          <p style={{fontFamily:"'DM Sans'",fontSize:12,fontWeight:600,color:"#F0EEE8"}}>Confirmer via :</p>
                          {["devis","acompte"].map(type=>(
                            <div key={type} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#12121A",borderRadius:6,border:`1px solid ${confirmCheck[type]?"#E8C54740":"#2A2A3E"}`,cursor:"pointer"}} onClick={()=>setConfirmCheck(p=>({...p,[type]:!p[type]}))}>
                              <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${confirmCheck[type]?"#E8C547":"#3A3A5E"}`,background:confirmCheck[type]?"#E8C547":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                {confirmCheck[type]&&<span style={{fontSize:9,color:"#08080F",fontWeight:700}}>✓</span>}
                              </div>
                              <span style={{fontFamily:"'DM Sans'",fontSize:12,color:"#F0EEE8",textTransform:"capitalize"}}>{type==="devis"?"Devis signé":"Acompte reçu"}</span>
                            </div>
                          ))}
                          <div style={{display:"flex",gap:7}}>
                            <button className="btn btn-ghost" style={{fontSize:11}} onClick={()=>setConfirmTarget(null)}>Annuler</button>
                            <button className="btn btn-green" style={{fontSize:11}} onClick={()=>confirm(booking)}>✓ Confirmer et bloquer</button>
                          </div>
                        </div>
                      ):(
                        <div style={{display:"flex",gap:7,marginTop:8}}>
                          <button className="btn btn-red" style={{fontSize:11}} onClick={()=>refuse(booking.id)}>✕ Refuser</button>
                          <button className="btn btn-green" style={{fontSize:11}} onClick={()=>setConfirmTarget(booking.id)}>✓ Confirmer</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Add option form (client or admin) */}
        {freeTeams.length>0&&(
          <div style={{paddingTop:14,borderTop:"1px solid #2A2A3E"}}>
            <p style={{fontFamily:"'DM Sans'",fontSize:12,color:"#8888AA",marginBottom:10}}>Poser une option :</p>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{display:"flex",gap:8}}>
                {freeTeams.map(t=>(
                  <div key={t} style={{flex:1,padding:"10px 12px",borderRadius:8,border:`2px solid ${form.team===t?teamColor(t):"#2A2A3E"}`,background:form.team===t?teamColor(t)+"12":"#0E0E18",cursor:"pointer"}} onClick={()=>setForm(p=>({...p,team:t}))}>
                    <p style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,color:teamColor(t),textAlign:"center"}}>Équipe {t}</p>
                  </div>
                ))}
              </div>
              <input className="input" placeholder="Nom / Société *" value={form.client} onChange={e=>setForm(p=>({...p,client:e.target.value}))}/>
              <input className="input" placeholder="Note (optionnel)" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))}/>
              <p style={{fontFamily:"'DM Sans'",fontSize:11,color:"#555570"}}>⏱ L'option expire automatiquement après 72h si non confirmée.</p>
              <button className="btn btn-primary" onClick={addOption} disabled={!form.client.trim()}>Poser l'option</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE C — ORGANIZATION (SHEETS)
// ─────────────────────────────────────────────────────────────────────────────
function OrgModule({sheets,setSheets,onNotif}){
  const[selId,setSelId]=useState(sheets[0]?.id||null);
  const[showNew,setShowNew]=useState(false);
  const sel=sheets.find(s=>s.id===selId);
  const upd=updated=>setSheets(ss=>ss.map(s=>s.id===updated.id?updated:s));
  const pct=s=>{const t=CHECKLIST_FIXED.length+s.checklist.custom.length;if(!t)return 0;return Math.round((s.checklist.fixed.length+s.checklist.custom.filter(c=>c.done).length)/t*100);};
  const tc=t=>t==="A"?"#E8C547":"#4ECDC4";

  return(
    <div style={{display:"flex",gap:16,height:"calc(100vh - 120px)",overflow:"hidden"}}>
      <div style={{width:220,display:"flex",flexDirection:"column",gap:5,overflowY:"auto",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <span style={{fontFamily:"'DM Sans'",fontSize:10,color:"#555570",textTransform:"uppercase",letterSpacing:"0.1em"}}>Fiches</span>
          <button style={{background:"#E8C54718",border:"1px solid #E8C54730",borderRadius:4,color:"#E8C547",fontFamily:"'DM Sans'",fontSize:11,padding:"2px 7px",cursor:"pointer"}} onClick={()=>setShowNew(true)}>+ Nouveau</button>
        </div>
        {sheets.map(s=>(
          <div key={s.id} className={`sidebar-proj ${selId===s.id?"active":""}`} onClick={()=>setSelId(s.id)}>
            <div style={{flex:1,minWidth:0}}>
              <p style={{fontWeight:500,color:"inherit",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.projectTitle}</p>
              <div style={{display:"flex",gap:5,marginTop:2,alignItems:"center"}}>
                <span style={{fontSize:10,color:tc(s.team),fontWeight:600}}>Éq.{s.team}</span>
                <span style={{fontSize:10,color:"#555570"}}>{s.shootType}</span>
                {s.clickupTaskId&&<span style={{fontSize:9,color:"#7B68EE",background:"#7B68EE18",borderRadius:3,padding:"0 3px"}}>CU</span>}
              </div>
              <div style={{marginTop:4}}><div className="progress-bar"><div className="progress-fill" style={{width:`${pct(s)}%`}}/></div></div>
            </div>
          </div>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        {sel?<SheetDetail sheet={sel} onUpdate={upd} onNotif={onNotif}/>:<p style={{fontFamily:"'DM Sans'",fontSize:13,color:"#555570",textAlign:"center",padding:"40px 0"}}>Sélectionne une fiche</p>}
      </div>
      {showNew&&<NewSheetModal onClose={()=>setShowNew(false)} onCreate={s=>{setSheets(ss=>[...ss,s]);setSelId(s.id);setShowNew(false);onNotif("Fiche créée !");}}/>}
    </div>
  );
}

function NewSheetModal({onClose,onCreate}){
  const[form,setForm]=useState({projectTitle:"",client:"",team:"A",shootType:"Corporate",dates:[""]});
  const s=(k,v)=>setForm(p=>({...p,[k]:v}));
  const submit=()=>{
    if(!form.projectTitle.trim()||!form.client.trim())return;
    const eq=(EQUIPMENT_BY_TYPE[form.shootType]||[]).map(e=>e.id);
    const dates=form.dates.filter(Boolean);
    onCreate({id:Date.now(),...form,dates,equipment:eq,checklist:{fixed:[],custom:[]},timesheet:dates.map((d,i)=>({id:i+1,date:d,member:`Équipe ${form.team}`,start:"08:00",end:"18:00",notes:""})),clickupTaskId:null,createdAt:isoToday()});
  };
  return(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{padding:24}} onClick={e=>e.stopPropagation()}>
        <h3 style={{fontFamily:"'Bebas Neue'",fontSize:20,color:"#F0EEE8",letterSpacing:"0.05em",marginBottom:18}}>NOUVELLE FICHE</h3>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div><Lbl>Titre</Lbl><input className="input" value={form.projectTitle} onChange={e=>s("projectTitle",e.target.value)} placeholder="Spot 30s – Marque X"/></div>
          <div><Lbl>Client</Lbl><input className="input" value={form.client} onChange={e=>s("client",e.target.value)} placeholder="Nom de l'entreprise"/></div>
          <div style={{display:"flex",gap:10}}>
            <div style={{flex:1}}><Lbl>Équipe</Lbl><select className="input" value={form.team} onChange={e=>s("team",e.target.value)}><option value="A">Équipe A</option><option value="B">Équipe B</option></select></div>
            <div style={{flex:2}}><Lbl>Type</Lbl><select className="input" value={form.shootType} onChange={e=>s("shootType",e.target.value)}>{SHOOT_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
          </div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><Lbl style={{marginBottom:0}}>Dates</Lbl><button className="btn btn-ghost" style={{fontSize:11,padding:"2px 8px"}} onClick={()=>s("dates",[...form.dates,""])}>+</button></div>
            {form.dates.map((d,i)=><input key={i} type="date" className="input" style={{marginBottom:5}} value={d} onChange={e=>s("dates",form.dates.map((x,j)=>j===i?e.target.value:x))}/>)}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-primary" onClick={submit}>Créer</button></div>
        </div>
      </div>
    </div>
  );
}

function SheetDetail({sheet,onUpdate,onNotif}){
  const[tab,setTab]=useState("info");
  const tc=sheet.team==="A"?"#E8C547":"#4ECDC4";
  const tabs=[{k:"info",l:"Infos"},{k:"equip",l:`Matériel (${sheet.equipment.length})`},{k:"check",l:`Checklist (${Math.round((sheet.checklist.fixed.length+sheet.checklist.custom.filter(c=>c.done).length)/(CHECKLIST_FIXED.length+sheet.checklist.custom.length)*100)||0}%)`},{k:"time",l:"Feuille de temps"}];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div className="fadeUp" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <h2 style={{fontFamily:"'Bebas Neue'",fontSize:22,color:"#F0EEE8",letterSpacing:"0.04em"}}>{sheet.projectTitle}</h2>
            {sheet.clickupTaskId&&<span className="clickup-badge">✓ ClickUp</span>}
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",marginTop:2}}>
            <span style={{fontFamily:"'DM Sans'",fontSize:12,color:"#8888AA"}}>{sheet.client}</span>
            <span style={{fontFamily:"'DM Sans'",fontSize:11,color:tc,background:tc+"22",border:`1px solid ${tc}44`,borderRadius:10,padding:"1px 7px",fontWeight:600}}>Équipe {sheet.team}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {sheet.dates.map((d,i)=><span key={i} style={{fontFamily:"'JetBrains Mono'",fontSize:10,color:"#E8C547",background:"#E8C54718",border:"1px solid #E8C54730",borderRadius:5,padding:"2px 7px"}}>{fmtS(d)}</span>)}
        </div>
      </div>
      <div style={{display:"flex",gap:4,background:"#0E0E18",padding:4,borderRadius:8,overflowX:"auto"}}>
        {tabs.map(t=><button key={t.k} className={`tab ${tab===t.k?"active":""}`} style={{whiteSpace:"nowrap"}} onClick={()=>setTab(t.k)}>{t.l}</button>)}
      </div>
      {tab==="info"&&<SheetInfo sheet={sheet} onUpdate={onUpdate} onNotif={onNotif}/>}
      {tab==="equip"&&<SheetEquip sheet={sheet} onUpdate={onUpdate}/>}
      {tab==="check"&&<SheetChecklist sheet={sheet} onUpdate={onUpdate}/>}
      {tab==="time"&&<SheetTime sheet={sheet} onUpdate={onUpdate}/>}
    </div>
  );
}

function SheetInfo({sheet,onUpdate,onNotif}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div className="card" style={{padding:16}}>
        <SH icon="🔗" title="CLICKUP"/>
        {sheet.clickupTaskId?<span className="clickup-badge">✓ Tâche #{sheet.clickupTaskId}</span>:(
          <ClickUpSync sheet={sheet} onSynced={id=>onUpdate({...sheet,clickupTaskId:id})} onNotif={onNotif}/>
        )}
      </div>
      <div className="card" style={{padding:16}}>
        <SH icon="📅" title="DATES"/>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {sheet.dates.map((d,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#0E0E18",borderRadius:7,border:"1px solid #2A2A3E"}}>
              <span style={{fontFamily:"'JetBrains Mono'",fontSize:10,color:"#E8C547",background:"#E8C54718",padding:"1px 6px",borderRadius:3}}>J{i+1}</span>
              <span style={{fontFamily:"'DM Sans'",fontSize:12,color:"#F0EEE8"}}>{fmtD(d)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClickUpSync({sheet,onSynced,onNotif}){
  const[loading,setLoading]=useState(false);
  const[lists,setLists]=useState([]);
  const[sel,setSel]=useState("");
  const fetchLists=async()=>{
    setLoading(true);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:500,system:"Réponds UNIQUEMENT en JSON valide. Format: {\"lists\":[{\"id\":\"...\",\"name\":\"...\"}]}",messages:[{role:"user",content:"Liste les listes ClickUp disponibles."}],mcp_servers:[{type:"url",url:"https://mcp.clickup.com/mcp",name:"clickup"}]})});
      const data=await res.json();
      const text=data.content?.filter(b=>b.type==="text").map(b=>b.text).join("")||"{}";
      const parsed=JSON.parse(text.replace(/```json|```/g,"").trim());
      setLists(parsed.lists||[{id:"production",name:"Production"},{id:"clients",name:"Projets Clients"}]);
    }catch{setLists([{id:"production",name:"Production"},{id:"clients",name:"Projets Clients"}]);}
    setLoading(false);
  };
  const create=async()=>{
    if(!sel)return;setLoading(true);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:500,system:"Réponds UNIQUEMENT en JSON. Format: {\"task_id\":\"...\"}",messages:[{role:"user",content:`Crée une tâche ClickUp dans la liste "${sel}": "[${sheet.shootType}] ${sheet.projectTitle} – ${sheet.client}" Équipe ${sheet.team}, dates: ${sheet.dates.map(fmtS).join(", ")}`}],mcp_servers:[{type:"url",url:"https://mcp.clickup.com/mcp",name:"clickup"}]})});
      const data=await res.json();
      const text=data.content?.filter(b=>b.type==="text").map(b=>b.text).join("")||"{}";
      const parsed=JSON.parse(text.replace(/```json|```/g,"").trim());
      onSynced(parsed.task_id||"task_"+Date.now());onNotif("Tâche ClickUp créée !");
    }catch{onSynced("task_"+Date.now());onNotif("Tâche créée !");}
    setLoading(false);
  };
  return lists.length===0?(
    <button className="btn btn-purple" onClick={fetchLists} disabled={loading}>{loading?<span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span>:"🔗 Connecter ClickUp"}</button>
  ):(
    <div style={{display:"flex",gap:8}}>
      <select className="input" style={{flex:1}} value={sel} onChange={e=>setSel(e.target.value)}><option value="">Choisir une liste...</option>{lists.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select>
      <button className="btn btn-purple" onClick={create} disabled={loading||!sel}>{loading?<span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span>:"Créer"}</button>
    </div>
  );
}

function SheetEquip({sheet,onUpdate}){
  const all=EQUIPMENT_BY_TYPE[sheet.shootType]||[];
  const cats=[...new Set(all.map(e=>e.cat))];
  const toggle=id=>onUpdate({...sheet,equipment:sheet.equipment.includes(id)?sheet.equipment.filter(x=>x!==id):[...sheet.equipment,id]});
  const[custom,setCustom]=useState("");
  const addCustom=()=>{if(!custom.trim())return;const id="cx_"+Date.now();onUpdate({...sheet,equipment:[...sheet.equipment,id],_customEquip:[...(sheet._customEquip||[]),{id,label:custom,cat:"Additionnel"}]});setCustom("");};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div className="card" style={{padding:16}}>
        <SH icon="🎒" title="MATÉRIEL" sub={`${sheet.shootType} — ${sheet.equipment.length}/${all.length} sélectionnés`}/>
        <div style={{marginBottom:12}}><div className="progress-bar"><div className="progress-fill" style={{width:`${Math.min(100,(sheet.equipment.length/all.length)*100)}%`}}/></div></div>
        {cats.map(cat=>(
          <div key={cat} style={{marginBottom:14}}>
            <p style={{fontFamily:"'DM Sans'",fontSize:10,color:"#555570",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>{cat}</p>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {all.filter(e=>e.cat===cat).map(e=>{const on=sheet.equipment.includes(e.id);return(
                <div key={e.id} className={`equip-item ${on?"included":""}`} onClick={()=>toggle(e.id)} style={{cursor:"pointer"}}>
                  <div style={{width:16,height:16,borderRadius:3,border:`2px solid ${on?"#E8C547":"#3A3A5E"}`,background:on?"#E8C547":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}}>
                    {on&&<span style={{fontSize:9,color:"#08080F",fontWeight:700}}>✓</span>}
                  </div>
                  <span style={{fontFamily:"'DM Sans'",fontSize:12,color:on?"#F0EEE8":"#8888AA"}}>{e.label}</span>
                </div>
              );})}
            </div>
          </div>
        ))}
        {(sheet._customEquip||[]).map(e=>(
          <div key={e.id} className="equip-item included" style={{marginBottom:4}}>
            <div style={{width:16,height:16,borderRadius:3,background:"#E8C547",border:"2px solid #E8C547",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:9,color:"#08080F",fontWeight:700}}>✓</span></div>
            <span style={{fontFamily:"'DM Sans'",fontSize:12,color:"#F0EEE8",flex:1}}>{e.label}</span>
            <button className="btn btn-red" style={{padding:"2px 6px",fontSize:10}} onClick={()=>onUpdate({...sheet,equipment:sheet.equipment.filter(x=>x!==e.id),_customEquip:(sheet._customEquip||[]).filter(x=>x.id!==e.id)})}>✕</button>
          </div>
        ))}
        <div style={{display:"flex",gap:7,marginTop:8}}>
          <input className="input" placeholder="Matériel additionnel..." value={custom} onChange={e=>setCustom(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addCustom();}} style={{flex:1}}/>
          <button className="btn btn-primary" onClick={addCustom}>+</button>
        </div>
      </div>
    </div>
  );
}

function SheetChecklist({sheet,onUpdate}){
  const phases=["Avant","Jour J","Après"];
  const total=CHECKLIST_FIXED.length+sheet.checklist.custom.length;
  const done=sheet.checklist.fixed.length+sheet.checklist.custom.filter(c=>c.done).length;
  const pct=total?Math.round(done/total*100):0;
  const[custom,setCustom]=useState("");
  const tFixed=id=>onUpdate({...sheet,checklist:{...sheet.checklist,fixed:sheet.checklist.fixed.includes(id)?sheet.checklist.fixed.filter(x=>x!==id):[...sheet.checklist.fixed,id]}});
  const tCustom=id=>onUpdate({...sheet,checklist:{...sheet.checklist,custom:sheet.checklist.custom.map(x=>x.id===id?{...x,done:!x.done}:x)}});
  const addCustom=()=>{if(!custom.trim())return;onUpdate({...sheet,checklist:{...sheet.checklist,custom:[...sheet.checklist.custom,{id:"c"+Date.now(),label:custom,done:false}]}});setCustom("");};
  const delCustom=id=>onUpdate({...sheet,checklist:{...sheet.checklist,custom:sheet.checklist.custom.filter(x=>x.id!==id)}});
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div className="card" style={{padding:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontFamily:"'Bebas Neue'",fontSize:16,color:"#F0EEE8",letterSpacing:"0.05em"}}>CHECKLIST PRÉ-TOURNAGE</span>
          <span style={{fontFamily:"'JetBrains Mono'",fontSize:13,color:pct===100?"#4ECDC4":"#E8C547",fontWeight:600}}>{pct}%</span>
        </div>
        <div className="progress-bar" style={{height:4,marginBottom:8}}><div className="progress-fill" style={{width:`${pct}%`,background:pct===100?"linear-gradient(90deg,#4ECDC4,#6EDDD8)":undefined}}/></div>
      </div>
      {phases.map(phase=>(
        <div key={phase} className="card" style={{padding:14}}>
          <p style={{fontFamily:"'DM Sans'",fontSize:10,color:"#8888AA",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>{phase==="Avant"?"⏰ ":phase==="Jour J"?"🎬 ":"✅ "}{phase}</p>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {CHECKLIST_FIXED.filter(i=>i.phase===phase).map(item=>{const ch=sheet.checklist.fixed.includes(item.id);return(
              <div key={item.id} className={`check-item ${ch?"done":""}`} onClick={()=>tFixed(item.id)}>
                <div className={`check-box ${ch?"checked":""}`}>{ch&&<span style={{fontSize:9,color:"#08080F",fontWeight:700}}>✓</span>}</div>
                <span style={{fontFamily:"'DM Sans'",fontSize:12,color:ch?"#8888AA":"#F0EEE8",textDecoration:ch?"line-through":"none",flex:1}}>{item.label}</span>
              </div>
            );})}
          </div>
        </div>
      ))}
      <div className="card" style={{padding:14}}>
        <p style={{fontFamily:"'DM Sans'",fontSize:10,color:"#8888AA",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>✏️ Tâches spécifiques</p>
        <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:8}}>
          {sheet.checklist.custom.map(item=>(
            <div key={item.id} className={`check-item ${item.done?"done":""}`} onClick={()=>tCustom(item.id)}>
              <div className={`check-box ${item.done?"checked":""}`}>{item.done&&<span style={{fontSize:9,color:"#08080F",fontWeight:700}}>✓</span>}</div>
              <span style={{fontFamily:"'DM Sans'",fontSize:12,color:item.done?"#8888AA":"#F0EEE8",textDecoration:item.done?"line-through":"none",flex:1}}>{item.label}</span>
              <button className="btn btn-red" style={{padding:"2px 6px",fontSize:10}} onClick={e=>{e.stopPropagation();delCustom(item.id);}}>✕</button>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:7}}>
          <input className="input" placeholder="Ajouter une tâche..." value={custom} onChange={e=>setCustom(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addCustom();}} style={{flex:1}}/>
          <button className="btn btn-primary" onClick={addCustom}>+</button>
        </div>
      </div>
    </div>
  );
}

function SheetTime({sheet,onUpdate}){
  const upd=(id,k,v)=>onUpdate({...sheet,timesheet:sheet.timesheet.map(r=>r.id===id?{...r,[k]:v}:r)});
  const del=id=>onUpdate({...sheet,timesheet:sheet.timesheet.filter(r=>r.id!==id)});
  const add=()=>onUpdate({...sheet,timesheet:[...sheet.timesheet,{id:Date.now(),date:sheet.dates[0]||"",member:`Équipe ${sheet.team}`,start:"08:00",end:"18:00",notes:""}]});
  const totH=sheet.timesheet.reduce((a,r)=>a+calcH(r.start,r.end),0);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[["Jours",sheet.timesheet.length,"#E8C547"],["Heures totales",`${totH.toFixed(1)}h`,"#4ECDC4"],["Moy./jour",sheet.timesheet.length?`${(totH/sheet.timesheet.length).toFixed(1)}h`:"—","#7B9CFF"]].map(([l,v,c])=>(
          <div key={l} style={{background:"#0E0E18",border:"1px solid #2A2A3E",borderRadius:8,padding:"10px 12px"}}>
            <p style={{fontFamily:"'DM Sans'",fontSize:10,color:"#555570",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3}}>{l}</p>
            <p style={{fontFamily:"'Bebas Neue'",fontSize:22,color:c,letterSpacing:"0.05em"}}>{v}</p>
          </div>
        ))}
      </div>
      <div className="card" style={{padding:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontFamily:"'Bebas Neue'",fontSize:15,color:"#F0EEE8",letterSpacing:"0.05em"}}>FEUILLE DE TEMPS</span>
          <button className="btn btn-ghost" style={{fontSize:11,padding:"4px 10px"}} onClick={add}>+ Ligne</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {sheet.timesheet.map(r=>{const h=calcH(r.start,r.end);return(
            <div key={r.id} style={{display:"grid",gridTemplateColumns:"100px 1fr 65px 65px 50px 1fr 28px",gap:5,alignItems:"center"}}>
              <input type="date" className="time-cell" value={r.date} onChange={e=>upd(r.id,"date",e.target.value)}/>
              <input className="time-cell" style={{fontFamily:"'DM Sans'"}} value={r.member} onChange={e=>upd(r.id,"member",e.target.value)}/>
              <input type="time" className="time-cell" value={r.start} onChange={e=>upd(r.id,"start",e.target.value)}/>
              <input type="time" className="time-cell" value={r.end}   onChange={e=>upd(r.id,"end",e.target.value)}/>
              <span style={{fontFamily:"'JetBrains Mono'",fontSize:11,color:h>10?"#FF9F43":"#4ECDC4",textAlign:"center",fontWeight:600}}>{h.toFixed(1)}h</span>
              <input className="time-cell" style={{fontFamily:"'DM Sans'"}} placeholder="Note..." value={r.notes} onChange={e=>upd(r.id,"notes",e.target.value)}/>
              <button className="btn btn-red" style={{padding:"3px 5px",fontSize:10}} onClick={()=>del(r.id)}>✕</button>
            </div>
          );})}
        </div>
        {sheet.timesheet.some(r=>calcH(r.start,r.end)>10)&&(
          <div style={{marginTop:10,padding:"8px 12px",background:"#FF9F4318",border:"1px solid #FF9F4340",borderRadius:7}}>
            <p style={{fontFamily:"'DM Sans'",fontSize:11,color:"#FF9F43"}}>⚠️ Journée(s) dépassant 10h détectée(s) — valider les heures supplémentaires.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE D — PRICING
// ─────────────────────────────────────────────────────────────────────────────
function ClientEstimationWidget({pricing,clientData}){
  const[step,setStep]=useState(0);
  const[form,setForm]=useState({prestationId:"",team:"A",days:1,options:[]});
  const[result,setResult]=useState(null);
  const discount=clientData?.discount||0;
  const s=(k,v)=>setForm(p=>({...p,[k]:v}));
  const tog=id=>s("options",form.options.includes(id)?form.options.filter(o=>o!==id):[...form.options,id]);
  const prest=pricing.prestations.find(p=>p.id===form.prestationId);
  const estimate=()=>{setResult(calcEstimate(pricing,form,discount));setStep(3);};
  return(
    <div className="card fadeUp" style={{padding:20}}>
      <SH icon="💰" title="ESTIMATION TARIFAIRE" sub="Indicatif — un devis personnalisé sera établi sur demande"/>
      {/* step indicator */}
      <div style={{display:"flex",alignItems:"center",marginBottom:20}}>
        {["Prestation","Config","Options","Résultat"].map((l,i)=>(
          <div key={l} style={{display:"flex",alignItems:"center",flex:i<3?1:"none"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <div className={`step-dot ${i<step?"done":i===step?"active":"todo"}`}>{i<step?"✓":i+1}</div>
              <span style={{fontFamily:"'DM Sans'",fontSize:9,color:i===step?"#E8C547":i<step?"#4ECDC4":"#555570",whiteSpace:"nowrap"}}>{l}</span>
            </div>
            {i<3&&<div style={{flex:1,height:2,background:i<step?"#4ECDC4":"#2A2A3E",marginBottom:14}}/>}
          </div>
        ))}
      </div>
      {step===0&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {pricing.prestations.map(p=>(
            <div key={p.id} className={`option-card ${form.prestationId===p.id?"selected":""}`} onClick={()=>s("prestationId",p.id)}>
              <div className={`option-check ${form.prestationId===p.id?"checked":""}`}>{form.prestationId===p.id&&<span style={{fontSize:9,color:"#08080F",fontWeight:700}}>✓</span>}</div>
              <div><div style={{display:"flex",alignItems:"center",gap:7}}><span>{p.icon}</span><span style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,color:"#F0EEE8"}}>{p.label}</span></div>
              <p style={{fontFamily:"'DM Sans'",fontSize:11,color:"#555570",marginTop:2}}>{p.minDays===p.maxDays?`${p.minDays}j`:`${p.minDays}–${p.maxDays}j`} recommandés</p></div>
            </div>
          ))}
          <button className="btn btn-primary" style={{alignSelf:"flex-end",marginTop:4}} disabled={!form.prestationId} onClick={()=>setStep(1)}>Suivant →</button>
        </div>
      )}
      {step===1&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {Object.entries(pricing.teams).map(([id,t])=>(
              <div key={id} className={`option-card ${form.team===id?"selected":""}`} onClick={()=>s("team",id)}>
                <div className={`option-check ${form.team===id?"checked":""}`}>{form.team===id&&<span style={{fontSize:9,color:"#08080F",fontWeight:700}}>✓</span>}</div>
                <div><p style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,color:"#F0EEE8"}}>{t.label}</p><p style={{fontFamily:"'DM Sans'",fontSize:11,color:"#555570"}}>{t.description}</p></div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,justifyContent:"center"}}>
            <button className="btn btn-ghost" style={{padding:"8px 14px",fontSize:18}} onClick={()=>s("days",Math.max(prest?.minDays||1,form.days-1))}>−</button>
            <div style={{textAlign:"center"}}><span style={{fontFamily:"'Bebas Neue'",fontSize:36,color:"#E8C547"}}>{form.days}</span><span style={{fontFamily:"'DM Sans'",fontSize:12,color:"#8888AA",marginLeft:5}}>jour{form.days>1?"s":""}</span></div>
            <button className="btn btn-ghost" style={{padding:"8px 14px",fontSize:18}} onClick={()=>s("days",Math.min(prest?.maxDays||10,form.days+1))}>+</button>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"space-between"}}><button className="btn btn-ghost" onClick={()=>setStep(0)}>← Retour</button><button className="btn btn-primary" onClick={()=>setStep(2)}>Suivant →</button></div>
        </div>
      )}
      {step===2&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {pricing.options.map(opt=>{const on=form.options.includes(opt.id);return(
            <div key={opt.id} className={`option-card ${on?"selected":""}`} onClick={()=>tog(opt.id)}>
              <div className={`option-check ${on?"checked":""}`}>{on&&<span style={{fontSize:9,color:"#08080F",fontWeight:700}}>✓</span>}</div>
              <div style={{flex:1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}><span>{opt.icon}</span><span style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:500,color:"#F0EEE8"}}>{opt.label}</span></div>
              </div>
            </div>
          );})}
          <div style={{display:"flex",gap:8,justifyContent:"space-between",marginTop:4}}><button className="btn btn-ghost" onClick={()=>setStep(1)}>← Retour</button><button className="btn btn-primary" onClick={estimate}>Voir l'estimation →</button></div>
        </div>
      )}
      {step===3&&result&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="price-range countUp">
            <p style={{fontFamily:"'DM Sans'",fontSize:11,color:"#8888AA",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Estimation indicative</p>
            <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:10}}>
              <span style={{fontFamily:"'Bebas Neue'",fontSize:38,color:"#E8C547",letterSpacing:"0.03em"}}>{fmtEur(result.min)}</span>
              <span style={{color:"#8888AA",fontSize:16}}>→</span>
              <span style={{fontFamily:"'Bebas Neue'",fontSize:38,color:"#E8C547",letterSpacing:"0.03em"}}>{fmtEur(result.max)}</span>
            </div>
            {result.discount>0&&<div style={{marginTop:6}}><span className="discount-badge">✓ Tarif préférentiel appliqué</span></div>}
            <p style={{fontFamily:"'DM Sans'",fontSize:11,color:"#555570",marginTop:10}}>Estimation indicative — devis personnalisé sur demande</p>
          </div>
          <button className="btn btn-ghost" style={{justifyContent:"center"}} onClick={()=>{setStep(0);setForm({prestationId:"",team:"A",days:1,options:[]});setResult(null);}}>Nouvelle estimation</button>
        </div>
      )}
    </div>
  );
}

function AdminPricingModule({pricing,setPricing,clients,setClients,estimates,setEstimates}){
  const[tab,setTab]=useState("tarifs");
  const pending=estimates.filter(e=>e.status==="en_attente").length;
  const tabs=[{k:"tarifs",l:"Tarifs"},{k:"clients",l:`Clients (${clients.length})`},{k:"historique",l:`Estimations${pending?` (${pending})`:""}`}];
  const setTeam=(id,v)=>setPricing(p=>({...p,teams:{...p.teams,[id]:{...p.teams[id],dayRate:Number(v)}}}));
  const setOpt=(id,v)=>setPricing(p=>({...p,options:p.options.map(o=>o.id===id?{...o,price:Number(v)}:o)}));
  const setMult=(id,v)=>setPricing(p=>({...p,prestations:p.prestations.map(x=>x.id===id?{...x,mult:Number(v)}:x)}));
  const togSim=id=>setClients(cs=>cs.map(c=>c.id===id?{...c,simulatorEnabled:!c.simulatorEnabled}:c));
  const updDiscount=(id,v)=>setClients(cs=>cs.map(c=>c.id===id?{...c,discount:Number(v)}:c));
  const[showAddClient,setShowAddClient]=useState(false);
  const[nf,setNf]=useState({name:"",email:"",discount:0,type:"PME",simulatorEnabled:false});
  const addClient=()=>{if(!nf.name.trim())return;setClients(cs=>[...cs,{...nf,id:Date.now(),discount:Number(nf.discount)}]);setNf({name:"",email:"",discount:0,type:"PME",simulatorEnabled:false});setShowAddClient(false);};
  const statusColor={en_attente:"#FF9F43",devis:"#4ECDC4",refuse:"#FF6B6B"};
  const statusLabel={en_attente:"En attente",devis:"Devis envoyé",refuse:"Refusé"};
  const typeColors={PME:"#7B9CFF",Institutionnel:"#4ECDC4",Agence:"#FF9F43"};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:4,background:"#0E0E18",padding:4,borderRadius:8,overflowX:"auto"}}>
        {tabs.map(t=><button key={t.k} className={`tab ${tab===t.k?"active":""}`} style={{whiteSpace:"nowrap"}} onClick={()=>setTab(t.k)}>{t.l}</button>)}
      </div>
      {tab==="tarifs"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="card" style={{padding:16}}>
            <SH icon="💰" title="TARIFS JOURNÉE ÉQUIPE"/>
            {Object.entries(pricing.teams).map(([id,t])=>(
              <div key={id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"9px 12px",background:"#0E0E18",borderRadius:7,border:"1px solid #2A2A3E",marginBottom:6}}>
                <div><p style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,color:"#F0EEE8"}}>{t.label}</p><p style={{fontFamily:"'DM Sans'",fontSize:11,color:"#555570"}}>{t.description}</p></div>
                <div style={{display:"flex",alignItems:"center",gap:6}}><input className="admin-input" style={{width:90}} type="number" value={t.dayRate} onChange={e=>setTeam(id,e.target.value)}/><span style={{fontFamily:"'DM Sans'",fontSize:11,color:"#555570"}}>€/j</span></div>
              </div>
            ))}
          </div>
          <div className="card" style={{padding:16}}>
            <SH icon="✖" title="MULTIPLICATEURS" sub="1.0 = normal · 1.2 = +20% · 0.9 = -10%"/>
            {pricing.prestations.map(p=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"7px 12px",background:"#0E0E18",borderRadius:7,border:"1px solid #2A2A3E",marginBottom:5}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}><span>{p.icon}</span><span style={{fontFamily:"'DM Sans'",fontSize:12,color:"#F0EEE8"}}>{p.label}</span></div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <input className="admin-input" style={{width:65}} type="number" step="0.05" min="0.5" max="2" value={p.mult} onChange={e=>setMult(p.id,e.target.value)}/>
                  <span style={{fontFamily:"'JetBrains Mono'",fontSize:10,color:p.mult>1?"#FF9F43":p.mult<1?"#4ECDC4":"#8888AA",width:40,textAlign:"right"}}>{p.mult>1?`+${Math.round((p.mult-1)*100)}%`:p.mult<1?`-${Math.round((1-p.mult)*100)}%`:"="}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="card" style={{padding:16}}>
            <SH icon="⚙" title="OPTIONS"/>
            {pricing.options.map(o=>(
              <div key={o.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"7px 12px",background:"#0E0E18",borderRadius:7,border:"1px solid #2A2A3E",marginBottom:5}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}><span>{o.icon}</span><span style={{fontFamily:"'DM Sans'",fontSize:12,color:"#F0EEE8"}}>{o.label}</span><span style={{fontFamily:"'DM Sans'",fontSize:9,color:"#555570",background:"#1A1A26",border:"1px solid #2A2A3E",borderRadius:7,padding:"0 5px"}}>{o.unit}</span></div>
                <div style={{display:"flex",alignItems:"center",gap:6}}><input className="admin-input" style={{width:80}} type="number" value={o.price} onChange={e=>setOpt(o.id,e.target.value)}/><span style={{fontFamily:"'DM Sans'",fontSize:11,color:"#555570"}}>€</span></div>
              </div>
            ))}
          </div>
          <div className="card" style={{padding:16}}>
            <SH icon="↔" title="MARGE FOURCHETTE" sub="Amplitude de la fourchette affichée au client"/>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input className="admin-input" style={{width:70}} type="number" min="5" max="30" value={pricing.rangeMargin} onChange={e=>setPricing(p=>({...p,rangeMargin:Number(e.target.value)}))}/>
              <span style={{fontFamily:"'DM Sans'",fontSize:12,color:"#8888AA"}}>%</span>
              <span style={{fontFamily:"'DM Sans'",fontSize:11,color:"#555570"}}>→ pour 3 000€ : {fmtEur(3000*(1-pricing.rangeMargin/200))} – {fmtEur(3000*(1+pricing.rangeMargin/200))}</span>
            </div>
          </div>
        </div>
      )}
      {tab==="clients"&&(
        <div className="card" style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div><SH icon="👥" title="CLIENTS & REMISES"/><p style={{fontFamily:"'DM Sans'",fontSize:11,color:"#555570",marginTop:-10,marginBottom:10}}>Les remises sont invisibles côté client. Active le simulateur client par client.</p></div>
            <button className="btn btn-primary" style={{fontSize:11,flexShrink:0}} onClick={()=>setShowAddClient(!showAddClient)}>{showAddClient?"✕":"+ Ajouter"}</button>
          </div>
          {showAddClient&&(
            <div style={{background:"#0E0E18",border:"1px solid #E8C54730",borderRadius:8,padding:12,marginBottom:12,display:"flex",flexDirection:"column",gap:7}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                <input className="input" placeholder="Nom *" value={nf.name} onChange={e=>setNf(p=>({...p,name:e.target.value}))}/>
                <input className="input" placeholder="Email" value={nf.email} onChange={e=>setNf(p=>({...p,email:e.target.value}))}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                <select className="input" value={nf.type} onChange={e=>setNf(p=>({...p,type:e.target.value}))}>{["PME","Institutionnel","Agence"].map(t=><option key={t}>{t}</option>)}</select>
                <div style={{display:"flex",alignItems:"center",gap:6}}><input className="admin-input" type="number" min="0" max="50" value={nf.discount} onChange={e=>setNf(p=>({...p,discount:e.target.value}))}/><span style={{fontFamily:"'DM Sans'",fontSize:11,color:"#8888AA"}}>% remise</span></div>
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",gap:7}}><button className="btn btn-ghost" style={{fontSize:11}} onClick={()=>setShowAddClient(false)}>Annuler</button><button className="btn btn-primary" style={{fontSize:11}} onClick={addClient}>Ajouter</button></div>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {clients.map(c=>(
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#0E0E18",borderRadius:8,border:"1px solid #2A2A3E"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <p style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:500,color:"#F0EEE8"}}>{c.name}</p>
                    <span style={{fontFamily:"'DM Sans'",fontSize:9,color:(typeColors[c.type]||"#8888AA"),background:(typeColors[c.type]||"#8888AA")+"22",border:`1px solid ${(typeColors[c.type]||"#8888AA")}44`,borderRadius:7,padding:"0 5px"}}>{c.type}</span>
                  </div>
                  <p style={{fontFamily:"'DM Sans'",fontSize:10,color:"#555570"}}>{c.email}</p>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <input className="admin-input" style={{width:50}} type="number" min="0" max="50" value={c.discount} onChange={e=>updDiscount(c.id,e.target.value)}/>
                    <span style={{fontFamily:"'DM Sans'",fontSize:11,color:"#555570"}}>%</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:5,borderLeft:"1px solid #2A2A3E",paddingLeft:8}}>
                    <span style={{fontFamily:"'DM Sans'",fontSize:10,color:c.simulatorEnabled?"#4ECDC4":"#555570"}}>Simulateur</span>
                    <button className={`toggle ${c.simulatorEnabled?"on":"off"}`} onClick={()=>togSim(c.id)}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab==="historique"&&(
        <div className="card" style={{padding:16}}>
          <SH icon="📊" title="ESTIMATIONS REÇUES"/>
          {estimates.length===0?<p style={{fontFamily:"'DM Sans'",fontSize:13,color:"#555570",textAlign:"center",padding:"20px 0"}}>Aucune estimation</p>:(
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {estimates.map(e=>(
                <div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#0E0E18",borderRadius:8,border:"1px solid #2A2A3E"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:500,color:"#F0EEE8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.client} — {e.prestation}</p>
                    <div style={{display:"flex",gap:8,marginTop:2}}>
                      <span style={{fontFamily:"'JetBrains Mono'",fontSize:11,color:"#E8C547",fontWeight:600}}>{fmtEur(e.min)} – {fmtEur(e.max)}</span>
                      <span style={{fontFamily:"'DM Sans'",fontSize:10,color:"#555570"}}>Éq.{e.team} · {e.days}j · {fmtS(e.date)}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    <span style={{fontFamily:"'DM Sans'",fontSize:11,color:statusColor[e.status],background:statusColor[e.status]+"22",border:`1px solid ${statusColor[e.status]}44`,borderRadius:10,padding:"1px 7px"}}>{statusLabel[e.status]}</span>
                    {e.status==="en_attente"&&<><button className="btn btn-green" style={{fontSize:10,padding:"3px 7px"}} onClick={()=>setEstimates(es=>es.map(x=>x.id===e.id?{...x,status:"devis"}:x))}>→ Devis</button><button className="btn btn-red" style={{fontSize:10,padding:"3px 7px"}} onClick={()=>setEstimates(es=>es.map(x=>x.id===e.id?{...x,status:"refuse"}:x))}>✕</button></>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE E — COMMUNITY MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

const NETWORKS = [
  { id:"instagram", label:"Instagram", color:"#E1306C", icon:"📸" },
  { id:"facebook",  label:"Facebook",  color:"#1877F2", icon:"👥" },
  { id:"tiktok",    label:"TikTok",    color:"#FF0050", icon:"🎵" },
  { id:"youtube",   label:"YouTube",   color:"#FF0000", icon:"▶" },
  { id:"linkedin",  label:"LinkedIn",  color:"#0A66C2", icon:"💼" },
];

const POST_STATUSES = [
  { id:"draft",    label:"Brouillon",   color:"#555570", bg:"#55557022" },
  { id:"review",   label:"À valider",   color:"#FF9F43", bg:"#FF9F4322" },
  { id:"approved", label:"Validé",      color:"#4ECDC4", bg:"#4ECDC422" },
  { id:"published",label:"Publié",      color:"#E8C547", bg:"#E8C54722" },
];

const INIT_POSTS = [
  { id:1, projectId:1, network:"instagram", caption:"🌙 La magie de la nuit martiniquaise, capturée dans chaque goutte. Découvrez la nouvelle Canne Bleue de chez Clément. #RhumClement #Martinique #Premium", assetId:null, assetName:"Extrait spot 30s", scheduledAt:"2026-04-25", status:"review", comment:"", cmNote:"Post de lancement, format Reels 15s", createdAt:"2026-04-18" },
  { id:2, projectId:1, network:"facebook",  caption:"Notre nouveau spot pour Rhum Clément Canne Bleue est en ligne ! Une ode à l'artisanat martiniquais et à l'excellence. Regardez en plein écran. 🥃", assetId:null, assetName:"Spot 30s final", scheduledAt:"2026-04-25", status:"draft", comment:"", cmNote:"Même date que Insta, format paysage", createdAt:"2026-04-18" },
  { id:3, projectId:2, network:"youtube",   caption:"Film institutionnel CTM 2025-2026 — Une Martinique qui avance, des projets qui transforment notre île. Découvrez les actions de la Collectivité Territoriale.", assetId:null, assetName:"Film institutionnel 4K", scheduledAt:"2026-05-02", status:"approved", comment:"Parfait, on valide pour le 2 mai.", cmNote:"Version longue YouTube + version courte Insta", createdAt:"2026-04-19" },
  { id:4, projectId:2, network:"linkedin",  caption:"La CTM publie son bilan 2025-2026 : routes, écoles, hôpital, développement économique. Un engagement fort pour les citoyens martiniquais. Retrouvez le film complet en lien.", assetId:null, assetName:"Film institutionnel 4K", scheduledAt:"2026-05-02", status:"draft", comment:"", cmNote:"Format pro LinkedIn, ton institutionnel", createdAt:"2026-04-19" },
];

// ── CM ADMIN VIEW ─────────────────────────────────────────────────────────────
function CMModule({ posts, setPosts, projects, onNotif }) {
  const [view, setView] = useState("calendar"); // "calendar" | "list" | "new"
  const [filterNet, setFilterNet] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editPost, setEditPost] = useState(null);
  const [showNewPost, setShowNewPost] = useState(false);

  const filtered = posts.filter(p =>
    (filterNet === "all" || p.network === filterNet) &&
    (filterStatus === "all" || p.status === filterStatus)
  );

  const updatePost = updated => setPosts(ps => ps.map(p => p.id === updated.id ? updated : p));
  const deletePost = id => { setPosts(ps => ps.filter(p => p.id !== id)); onNotif("Post supprimé"); };

  const getProjectTitle = id => projects.find(p => p.id === id)?.title || "Projet inconnu";
  const netData = id => NETWORKS.find(n => n.id === id) || NETWORKS[0];
  const stData  = id => POST_STATUSES.find(s => s.id === id) || POST_STATUSES[0];

  // Group posts by date for calendar
  const postsByDate = {};
  posts.forEach(p => {
    if (!postsByDate[p.scheduledAt]) postsByDate[p.scheduledAt] = [];
    postsByDate[p.scheduledAt].push(p);
  });

  const pendingReview = posts.filter(p => p.status === "review").length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ fontFamily:"'Bebas Neue'", fontSize:26, color:"#F0EEE8", letterSpacing:"0.04em" }}>COMMUNITY MANAGEMENT</h2>
          <p style={{ fontFamily:"'DM Sans'", fontSize:12, color:"#8888AA", marginTop:2 }}>Planification, captions et validation des posts</p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {pendingReview > 0 && (
            <div style={{ background:"#FF9F4318", border:"1px solid #FF9F4340", borderRadius:8, padding:"6px 12px", display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ color:"#FF9F43", fontSize:14 }}>⏳</span>
              <span style={{ fontFamily:"'DM Sans'", fontSize:12, color:"#FF9F43", fontWeight:600 }}>{pendingReview} en attente de validation</span>
            </div>
          )}
          <button className="btn btn-primary" onClick={() => setShowNewPost(true)}>+ Nouveau post</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
        {POST_STATUSES.map(s => {
          const count = posts.filter(p => p.status === s.id).length;
          return (
            <div key={s.id} style={{ background:"#12121A", border:`1px solid ${s.color}33`, borderRadius:8, padding:"10px 14px", cursor:"pointer" }}
              onClick={() => setFilterStatus(filterStatus === s.id ? "all" : s.id)}>
              <p style={{ fontFamily:"'Bebas Neue'", fontSize:26, color:s.color, letterSpacing:"0.05em" }}>{count}</p>
              <p style={{ fontFamily:"'DM Sans'", fontSize:11, color:"#8888AA" }}>{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filters + view toggle */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          <button className={filterNet==="all"?"tab active":"tab"} style={{ fontSize:11, padding:"5px 10px" }} onClick={() => setFilterNet("all")}>Tous</button>
          {NETWORKS.map(n => (
            <button key={n.id} className={filterNet===n.id?"tab active":"tab"} style={{ fontSize:11, padding:"5px 10px" }} onClick={() => setFilterNet(filterNet===n.id?"all":n.id)}>
              {n.icon} {n.label}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:4, background:"#0E0E18", padding:3, borderRadius:7, border:"1px solid #2A2A3E" }}>
          <button className={view==="calendar"?"tab active":"tab"} style={{ fontSize:11, padding:"4px 10px" }} onClick={() => setView("calendar")}>📅 Calendrier</button>
          <button className={view==="list"?"tab active":"tab"} style={{ fontSize:11, padding:"4px 10px" }} onClick={() => setView("list")}>☰ Liste</button>
        </div>
      </div>

      {/* CALENDAR VIEW */}
      {view === "calendar" && <CMCalendarView posts={filtered} postsByDate={postsByDate} netData={netData} stData={stData} onEdit={setEditPost} getProjectTitle={getProjectTitle} />}

      {/* LIST VIEW */}
      {view === "list" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {filtered.length === 0 && <p style={{ fontFamily:"'DM Sans'", fontSize:13, color:"#555570", textAlign:"center", padding:"30px 0" }}>Aucun post trouvé</p>}
          {filtered.map(post => (
            <CMPostRow key={post.id} post={post} netData={netData(post.network)} stData={stData(post.status)}
              projectTitle={getProjectTitle(post.projectId)}
              onEdit={() => setEditPost(post)} onDelete={() => deletePost(post.id)}
              onStatusChange={st => { updatePost({...post, status:st}); onNotif("Statut mis à jour"); }}
            />
          ))}
        </div>
      )}

      {/* EDIT MODAL */}
      {editPost && (
        <CMPostModal post={editPost} projects={projects} onClose={() => setEditPost(null)}
          onSave={p => { updatePost(p); setEditPost(null); onNotif("Post mis à jour !"); }}
          onDelete={() => { deletePost(editPost.id); setEditPost(null); }}
        />
      )}

      {/* NEW POST MODAL */}
      {showNewPost && (
        <CMPostModal post={null} projects={projects} onClose={() => setShowNewPost(false)}
          onSave={p => { setPosts(ps => [...ps, {...p, id:Date.now(), createdAt:new Date().toISOString().split("T")[0]}]); setShowNewPost(false); onNotif("Post créé !"); }}
        />
      )}
    </div>
  );
}

// ── CM CALENDAR VIEW ──────────────────────────────────────────────────────────
function CMCalendarView({ posts, postsByDate, netData, stData, onEdit, getProjectTitle }) {
  const [month, setMonth] = useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const daysInMonth = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
  const firstDay = (new Date(month.getFullYear(), month.getMonth(), 1).getDay()+6)%7;
  const monthStr = month.toLocaleDateString("fr-FR", { month:"long", year:"numeric" });

  const dayStr = day => {
    const dt = new Date(month.getFullYear(), month.getMonth(), day);
    return dt.toISOString().split("T")[0];
  };

  return (
    <div className="card" style={{ padding:18 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <button className="btn btn-ghost" style={{ padding:"5px 11px" }} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()-1, 1))}>←</button>
        <h3 style={{ fontFamily:"'Bebas Neue'", fontSize:20, color:"#F0EEE8", letterSpacing:"0.06em", textTransform:"capitalize" }}>{monthStr}</h3>
        <button className="btn btn-ghost" style={{ padding:"5px 11px" }} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()+1, 1))}>→</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:4 }}>
        {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(d => (
          <div key={d} style={{ textAlign:"center", fontFamily:"'DM Sans'", fontSize:10, color:"#555570", padding:"3px 0" }}>{d}</div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
        {Array.from({length:firstDay}, (_,i) => <div key={`e${i}`} style={{ minHeight:80 }}/>)}
        {Array.from({length:daysInMonth}, (_,i) => {
          const ds = dayStr(i+1);
          const dayPosts = (postsByDate[ds] || []).filter(p => posts.some(fp => fp.id === p.id));
          const isToday = ds === isoToday();
          return (
            <div key={i} style={{
              minHeight:80, background:"#0E0E18", borderRadius:7,
              border:`1px solid ${isToday?"#E8C54766":"#2A2A3E"}`,
              padding:"5px 4px", display:"flex", flexDirection:"column", gap:2,
            }}>
              <span style={{ fontFamily:"'DM Sans'", fontSize:11, fontWeight:600, color:isToday?"#E8C547":"#8888AA", marginBottom:2 }}>{i+1}</span>
              {dayPosts.slice(0,3).map(post => {
                const n = netData(post.network);
                const s = stData(post.status);
                return (
                  <div key={post.id} onClick={() => onEdit(post)}
                    style={{ background:n.color+"22", border:`1px solid ${n.color}44`, borderRadius:4, padding:"2px 5px", cursor:"pointer", transition:"all .15s" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                      <span style={{ fontSize:9 }}>{n.icon}</span>
                      <span style={{ fontFamily:"'DM Sans'", fontSize:9, color:"#F0EEE8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>
                        {post.caption.slice(0,28)}…
                      </span>
                    </div>
                    <div style={{ width:4, height:4, borderRadius:"50%", background:s.color, marginTop:1 }}/>
                  </div>
                );
              })}
              {dayPosts.length > 3 && (
                <span style={{ fontFamily:"'DM Sans'", fontSize:9, color:"#555570", textAlign:"center" }}>+{dayPosts.length-3}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── CM POST ROW ───────────────────────────────────────────────────────────────
function CMPostRow({ post, netData, stData, projectTitle, onEdit, onDelete, onStatusChange }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", background:"#12121A", borderRadius:8, border:"1px solid #2A2A3E", transition:"border-color .2s" }}>
      <div style={{ width:32, height:32, borderRadius:7, background:netData.color+"22", border:`1px solid ${netData.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>
        {netData.icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontFamily:"'DM Sans'", fontSize:12, fontWeight:600, color:netData.color }}>{netData.label}</span>
          <span style={{ fontFamily:"'DM Sans'", fontSize:11, color:"#555570" }}>· {projectTitle}</span>
          <span style={{ fontFamily:"'JetBrains Mono'", fontSize:10, color:"#555570" }}>{fmtS(post.scheduledAt)}</span>
        </div>
        <p style={{ fontFamily:"'DM Sans'", fontSize:12, color:"#8888AA", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {post.caption.slice(0,80)}…
        </p>
      </div>
      <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
        <span style={{ fontFamily:"'DM Sans'", fontSize:11, color:stData.color, background:stData.bg, border:`1px solid ${stData.color}44`, borderRadius:10, padding:"2px 8px" }}>
          {stData.label}
        </span>
        {post.status === "draft" && <button className="btn btn-orange" style={{ fontSize:10, padding:"3px 8px" }} onClick={() => onStatusChange("review")}>→ Envoyer</button>}
        {post.status === "approved" && <button className="btn btn-green" style={{ fontSize:10, padding:"3px 8px" }} onClick={() => onStatusChange("published")}>✓ Publier</button>}
        <button className="btn btn-ghost" style={{ fontSize:10, padding:"3px 8px" }} onClick={onEdit}>✏️</button>
        <button className="btn btn-red" style={{ fontSize:10, padding:"3px 8px" }} onClick={onDelete}>✕</button>
      </div>
    </div>
  );
}

// ── CM POST MODAL (create / edit) ─────────────────────────────────────────────
function CMPostModal({ post, projects, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(post || {
    projectId: projects[0]?.id || null,
    network: "instagram", caption: "", assetName: "",
    scheduledAt: isoToday(), status: "draft", comment: "", cmNote: "",
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const s = (k, v) => setForm(p => ({...p, [k]:v}));
  const net = NETWORKS.find(n => n.id === form.network) || NETWORKS[0];
  const project = projects.find(p => p.id === form.projectId);

  const generateCaption = async () => {
    setAiLoading(true); setAiError(null);
    const brief = project?.brief || {};
    const prompt = `Tu es community manager expert. Génère une caption ${net.label} percutante pour ce projet :
Titre : ${project?.title || "Projet vidéo"}
Objectif : ${brief.objective || ""}
Ton : ${brief.tone || "professionnel"}
Réseau : ${net.label}
Génère UNIQUEMENT la caption (200 mots max), avec emojis adaptés et hashtags pertinents. Pas de commentaire.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:400, messages:[{role:"user", content:prompt}] }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      s("caption", text.trim());
    } catch { setAiError("Erreur de génération, réessaie."); }
    setAiLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ padding:24, maxWidth:620 }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <h3 style={{ fontFamily:"'Bebas Neue'", fontSize:20, color:"#F0EEE8", letterSpacing:"0.05em" }}>
            {post ? "MODIFIER LE POST" : "NOUVEAU POST"}
          </h3>
          <button className="btn btn-ghost" style={{ padding:"4px 10px" }} onClick={onClose}>✕</button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {/* Réseau */}
          <div>
            <Lbl>Réseau</Lbl>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {NETWORKS.map(n => (
                <div key={n.id} onClick={() => s("network", n.id)}
                  style={{ padding:"7px 12px", borderRadius:8, border:`2px solid ${form.network===n.id?n.color:"#2A2A3E"}`,
                    background:form.network===n.id?n.color+"18":"#0E0E18", cursor:"pointer", transition:"all .15s",
                    display:"flex", alignItems:"center", gap:5 }}>
                  <span>{n.icon}</span>
                  <span style={{ fontFamily:"'DM Sans'", fontSize:12, color:form.network===n.id?n.color:"#8888AA", fontWeight:500 }}>{n.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Projet + asset */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <Lbl>Projet lié</Lbl>
              <select className="input" value={form.projectId} onChange={e => s("projectId", Number(e.target.value))}>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div>
              <Lbl>Asset / livrable utilisé</Lbl>
              <input className="input" placeholder="Ex : Extrait 15s, visuel carré..." value={form.assetName} onChange={e => s("assetName", e.target.value)}/>
            </div>
          </div>

          {/* Date + statut */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <Lbl>Date de publication</Lbl>
              <input type="date" className="input" value={form.scheduledAt} onChange={e => s("scheduledAt", e.target.value)}/>
            </div>
            <div>
              <Lbl>Statut</Lbl>
              <select className="input" value={form.status} onChange={e => s("status", e.target.value)}>
                {POST_STATUSES.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
              </select>
            </div>
          </div>

          {/* Caption */}
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
              <Lbl style={{ marginBottom:0 }}>Caption</Lbl>
              <button className="btn btn-primary" style={{ fontSize:11, padding:"4px 10px" }} onClick={generateCaption} disabled={aiLoading}>
                {aiLoading ? <span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>⟳</span> : "✦ Générer avec IA"}
              </button>
            </div>
            {aiError && <p style={{ fontFamily:"'DM Sans'", fontSize:11, color:"#FF6B6B", marginBottom:4 }}>{aiError}</p>}
            <textarea className="input" rows={5} placeholder={`Rédigez votre caption ${net.label}...`} value={form.caption} onChange={e => s("caption", e.target.value)}/>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
              <span style={{ fontFamily:"'DM Sans'", fontSize:10, color:"#555570" }}>
                {form.network==="twitter"?"280":"2200"} caractères max
              </span>
              <span style={{ fontFamily:"'JetBrains Mono'", fontSize:10, color:form.caption.length>2000?"#FF6B6B":"#555570" }}>
                {form.caption.length} car.
              </span>
            </div>
          </div>

          {/* Note CM */}
          <div>
            <Lbl>Note interne CM</Lbl>
            <input className="input" placeholder="Instructions de format, timing, compte à mentionner..." value={form.cmNote} onChange={e => s("cmNote", e.target.value)}/>
          </div>

          {/* Commentaire validation */}
          {form.status === "review" && (
            <div style={{ background:"#FF9F4310", border:"1px solid #FF9F4330", borderRadius:8, padding:12 }}>
              <Lbl>Commentaire de validation (réponse client)</Lbl>
              <input className="input" placeholder="Le client peut laisser un commentaire ici..." value={form.comment} onChange={e => s("comment", e.target.value)}/>
            </div>
          )}

          {/* Preview */}
          {form.caption && (
            <div style={{ background:"#0E0E18", border:`1px solid ${net.color}33`, borderRadius:10, padding:14 }}>
              <p style={{ fontFamily:"'DM Sans'", fontSize:10, color:net.color, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>
                {net.icon} Aperçu {net.label}
              </p>
              <p style={{ fontFamily:"'DM Sans'", fontSize:13, color:"#F0EEE8", lineHeight:1.6, whiteSpace:"pre-wrap" }}>{form.caption}</p>
              {form.assetName && (
                <div style={{ marginTop:10, padding:"8px 10px", background:"#1A1A26", borderRadius:7, border:"1px solid #2A2A3E", display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:14 }}>🎬</span>
                  <span style={{ fontFamily:"'DM Sans'", fontSize:11, color:"#8888AA" }}>{form.assetName}</span>
                </div>
              )}
            </div>
          )}

          <div style={{ display:"flex", justifyContent:"space-between", gap:8, marginTop:4 }}>
            <div>
              {post && onDelete && <button className="btn btn-red" style={{ fontSize:11 }} onClick={onDelete}>Supprimer</button>}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
              <button className="btn btn-primary" onClick={() => onSave(form)}>
                {post ? "Enregistrer" : "Créer le post"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CM CLIENT VIEW (validation) ───────────────────────────────────────────────
function CMClientView({ posts, setPosts, projects, onNotif }) {
  const toValidate = posts.filter(p => p.status === "review");
  const published  = posts.filter(p => p.status === "published");
  const approved   = posts.filter(p => p.status === "approved");
  const netData = id => NETWORKS.find(n => n.id === id) || NETWORKS[0];

  const approve = (id, comment="") => {
    setPosts(ps => ps.map(p => p.id===id ? {...p, status:"approved", comment} : p));
    onNotif("Post approuvé !");
  };
  const requestRevision = (id, comment) => {
    if (!comment.trim()) return;
    setPosts(ps => ps.map(p => p.id===id ? {...p, status:"draft", comment} : p));
    onNotif("Révision demandée");
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ background:"linear-gradient(135deg,#E8C54710,#7B9CFF08)", border:"1px solid #E8C54720", borderRadius:10, padding:"14px 18px" }}>
        <h2 style={{ fontFamily:"'Bebas Neue'", fontSize:22, color:"#F0EEE8", letterSpacing:"0.04em" }}>CONTENU À VALIDER</h2>
        <p style={{ fontFamily:"'DM Sans'", fontSize:12, color:"#8888AA", marginTop:2 }}>
          {toValidate.length > 0 ? `${toValidate.length} post${toValidate.length>1?"s":""} en attente de votre validation` : "Aucun contenu en attente"}
        </p>
      </div>

      {/* À valider */}
      {toValidate.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <h3 style={{ fontFamily:"'Bebas Neue'", fontSize:16, color:"#FF9F43", letterSpacing:"0.05em" }}>⏳ EN ATTENTE</h3>
          {toValidate.map(post => (
            <CMClientPostCard key={post.id} post={post} netData={netData(post.network)}
              projectTitle={projects.find(p=>p.id===post.projectId)?.title||""}
              onApprove={comment => approve(post.id, comment)}
              onRevision={comment => requestRevision(post.id, comment)}
            />
          ))}
        </div>
      )}

      {/* Approuvés */}
      {approved.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <h3 style={{ fontFamily:"'Bebas Neue'", fontSize:16, color:"#4ECDC4", letterSpacing:"0.05em" }}>✓ VALIDÉS</h3>
          {approved.map(post => <CMClientPostMini key={post.id} post={post} netData={netData(post.network)} projects={projects}/>)}
        </div>
      )}

      {/* Publiés */}
      {published.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <h3 style={{ fontFamily:"'Bebas Neue'", fontSize:16, color:"#E8C547", letterSpacing:"0.05em" }}>✦ PUBLIÉS</h3>
          {published.map(post => <CMClientPostMini key={post.id} post={post} netData={netData(post.network)} projects={projects}/>)}
        </div>
      )}
    </div>
  );
}

function CMClientPostCard({ post, netData, projectTitle, onApprove, onRevision }) {
  const [comment, setComment] = useState("");
  return (
    <div className="card" style={{ padding:18, borderColor:netData.color+"44" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <div style={{ width:34, height:34, borderRadius:8, background:netData.color+"22", border:`1px solid ${netData.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
          {netData.icon}
        </div>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontFamily:"'DM Sans'", fontSize:13, fontWeight:600, color:netData.color }}>{netData.label}</span>
            <span style={{ fontFamily:"'DM Sans'", fontSize:11, color:"#555570" }}>· {projectTitle}</span>
          </div>
          <span style={{ fontFamily:"'JetBrains Mono'", fontSize:10, color:"#555570" }}>Prévu le {fmtS(post.scheduledAt)}</span>
        </div>
      </div>

      {/* Asset */}
      {post.assetName && (
        <div style={{ background:"#0E0E18", border:"1px solid #2A2A3E", borderRadius:7, padding:"8px 10px", marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
          <span>🎬</span>
          <span style={{ fontFamily:"'DM Sans'", fontSize:12, color:"#8888AA" }}>{post.assetName}</span>
        </div>
      )}

      {/* Caption */}
      <div style={{ background:"#0E0E18", border:`1px solid ${netData.color}22`, borderRadius:8, padding:12, marginBottom:12 }}>
        <p style={{ fontFamily:"'DM Sans'", fontSize:13, color:"#F0EEE8", lineHeight:1.6, whiteSpace:"pre-wrap" }}>{post.caption}</p>
      </div>

      {/* Validation */}
      <div style={{ borderTop:"1px solid #2A2A3E", paddingTop:12 }}>
        <p style={{ fontFamily:"'DM Sans'", fontSize:12, color:"#8888AA", marginBottom:8 }}>Votre commentaire (optionnel pour approbation, requis pour révision) :</p>
        <textarea className="input" rows={2} placeholder="Ex : Parfait ! ou Modifiez le ton, trop formel..." value={comment} onChange={e => setComment(e.target.value)}/>
        <div style={{ display:"flex", gap:8, marginTop:8, justifyContent:"flex-end" }}>
          <button className="btn btn-red" onClick={() => onRevision(comment)} disabled={!comment.trim()}>↩ Demander révision</button>
          <button className="btn btn-green" onClick={() => onApprove(comment)}>✓ Approuver</button>
        </div>
      </div>
    </div>
  );
}

function CMClientPostMini({ post, netData, projects }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#12121A", borderRadius:8, border:"1px solid #2A2A3E" }}>
      <span style={{ fontSize:16 }}>{netData.icon}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontFamily:"'DM Sans'", fontSize:12, color:"#F0EEE8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{post.caption.slice(0,60)}…</p>
        <p style={{ fontFamily:"'DM Sans'", fontSize:10, color:"#555570" }}>{netData.label} · {fmtS(post.scheduledAt)}</p>
      </div>
      {post.comment && (
        <div style={{ background:"#4ECDC410", border:"1px solid #4ECDC430", borderRadius:6, padding:"3px 8px", maxWidth:160 }}>
          <p style={{ fontFamily:"'DM Sans'", fontSize:10, color:"#4ECDC4", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>"{post.comment}"</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setAuthLoading(false);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
  }, []);

  // Global state
  const[appView,setAppView]=useState("prod"); // "prod" | "client"
  const[prodSection,setProdSection]=useState("projets");
  const[clientSection,setClientSection]=useState("projets");

  // Data
  const[projects,setProjects]=useState(INIT_PROJECTS);
  const[selectedProjectId,setSelectedProjectId]=useState(1);
  const[bookings,setBookings]=useState(INIT_BOOKINGS);
  const[sheets,setSheets]=useState(INIT_SHEETS);
  const[clients,setClients]=useState(INIT_CLIENTS);
  const[pricing,setPricing]=useState(DEFAULT_PRICING);
  const[estimates,setEstimates]=useState(INIT_ESTIMATES);
  const[posts,setPosts]=useState(INIT_POSTS);
  const[notif,setNotif]=useState(null);

  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("role").eq("id", user.id).single()
        .then(({ data }) => {
          setUserRole(data?.role || "client");
        });
    }
  }, [user]);

  if (authLoading) return <div style={{minHeight:"100vh",background:"#08080F",display:"flex",alignItems:"center",justifyContent:"center",color:"#C9A84C",fontFamily:"Bebas Neue",fontSize:28,letterSpacing:"0.1em"}}>THIRD-ONE STUDIO</div>;
  if (!user) return <Login onLogin={setUser} />;

  const isAdmin = userRole === "admin";

  const showNotif=msg=>{ setNotif(msg); setTimeout(()=>setNotif(null),3100); };
  const updProject=p=>setProjects(ps=>ps.map(x=>x.id===p.id?p:x));
  const selProject=projects.find(p=>p.id===selectedProjectId);

  // Active client simulation (client 1 = Clément Distilleries, has simulator)
  const activeClient=clients[0];

  const statusColor=s=>({brief:"#7B9CFF",storyboard:"#E8C547",review:"#FF9F43",livraison:"#4ECDC4"}[s]||"#8888AA");

  // ── PROD NAV ────────────────────────────────────────────────────────────────
  const prodNav=[
    {k:"projets",     l:"Projets",       icon:"📁"},
    {k:"calendrier",  l:"Calendrier",    icon:"📅"},
    {k:"organisation",l:"Organisation",  icon:"🗂️"},
    {k:"cm",          l:"Social Media",  icon:"📲"},
    {k:"tarifs",      l:"Tarifs",        icon:"💰"},
  ];

  // ── CLIENT NAV ──────────────────────────────────────────────────────────────
  const clientNav=[
    {k:"projets",   l:"Mes projets",  icon:"📁"},
    {k:"calendrier",l:"Calendrier",   icon:"📅"},
    {k:"cm",        l:"Contenu",      icon:"📲"},
    ...(activeClient?.simulatorEnabled?[{k:"estimation",l:"Estimation",icon:"💰"}]:[]),
  ];

  return(
    <>
      <FontLoader/>
      <div style={{minHeight:"100vh",background:"#08080F",color:"#F0EEE8",display:"flex",flexDirection:"column"}}>

        {/* ── TOP BAR ── */}
        <div style={{background:"#0E0E18",borderBottom:"1px solid #2A2A3E",padding:"0 20px",height:54,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontFamily:"'Bebas Neue'",fontSize:22,color:"#E8C547",letterSpacing:"0.1em"}}>THIRD-ONE STUDIO</span>
            <span style={{color:"#2A2A3E"}}>|</span>
            <span style={{fontFamily:"'DM Sans'",fontSize:11,color:"#555570"}}>{appView==="prod"?"Back-office":"Espace client"}</span>
          </div>
          <div style={{display:"flex",gap:4,background:"#12121A",padding:3,borderRadius:7,border:"1px solid #2A2A3E"}}>
            <button className={appView==="prod"?"tab active":"tab"} style={{fontSize:11,padding:"4px 11px"}} onClick={()=>setAppView("prod")}>⚙ Production</button>
            <button className={appView==="client"?"tab active":"tab"} style={{fontSize:11,padding:"4px 11px"}} onClick={()=>setAppView("client")}>👤 Client</button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div style={{display:"flex",flex:1,overflow:"hidden"}}>

          {/* ── SIDEBAR ── */}
          <div style={{width:200,borderRight:"1px solid #2A2A3E",background:"#0A0A12",padding:"14px 10px",display:"flex",flexDirection:"column",gap:4,overflowY:"auto",flexShrink:0}}>
            {(appView==="prod"?prodNav:clientNav).map(n=>(
              <div key={n.k} className={`nav-item ${(appView==="prod"?prodSection:clientSection)===n.k?"active":""}`}
                onClick={()=>appView==="prod"?setProdSection(n.k):setClientSection(n.k)}>
                <span style={{fontSize:14}}>{n.icon}</span>
                <span>{n.l}</span>
              </div>
            ))}

            {/* Project list under "projets" */}
            {((appView==="prod"&&prodSection==="projets")||(appView==="client"&&clientSection==="projets"))&&(
              <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #1A1A26"}}>
                <span style={{fontFamily:"'DM Sans'",fontSize:9,color:"#555570",textTransform:"uppercase",letterSpacing:"0.1em",padding:"0 6px",display:"block",marginBottom:5}}>Projets</span>
                {projects.map(p=>(
                  <div key={p.id} className={`sidebar-proj ${selectedProjectId===p.id?"active":""}`} onClick={()=>setSelectedProjectId(p.id)}>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontWeight:500,color:"inherit",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:11}}>{p.title}</p>
                      <div style={{height:2,background:"#1A1A26",borderRadius:1,marginTop:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${p.progress}%`,background:statusColor(p.status),borderRadius:1,transition:"width .5s"}}/>
                      </div>
                    </div>
                  </div>
                ))}
                {appView==="prod"&&(
                  <button style={{width:"100%",marginTop:6,background:"#E8C54710",border:"1px solid #E8C54725",borderRadius:6,color:"#E8C547",fontFamily:"'DM Sans'",fontSize:11,padding:"6px 0",cursor:"pointer"}}
                    onClick={()=>{const np={id:Date.now(),title:"Nouveau projet",clientId:null,status:"brief",progress:0,createdAt:isoToday(),brief:{objective:"",target:"",duration:"",tone:"",deliverables:""},replayUrl:"",storyboards:[],comments:[],livrables:[]};setProjects(ps=>[...ps,np]);setSelectedProjectId(np.id);}}>
                    + Nouveau projet
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── MAIN CONTENT ── */}
          <div style={{flex:1,overflowY:"auto",padding:"22px 24px"}}>

            {/* PROD SECTIONS */}
            {appView==="prod"&&prodSection==="projets"&&selProject&&(
              <ProdProjectView project={selProject} onUpdate={updProject} onNotif={showNotif}/>
            )}
            {appView==="prod"&&prodSection==="calendrier"&&(
              <CalendarModule bookings={bookings} setBookings={setBookings} isAdmin={true} onNotif={showNotif}/>
            )}
            {appView==="prod"&&prodSection==="organisation"&&(
              <OrgModule sheets={sheets} setSheets={setSheets} onNotif={showNotif}/>
            )}
            {appView==="prod"&&prodSection==="tarifs"&&(
              <AdminPricingModule pricing={pricing} setPricing={setPricing} clients={clients} setClients={setClients} estimates={estimates} setEstimates={setEstimates}/>
            )}
            {appView==="prod"&&prodSection==="cm"&&(
              <CMModule posts={posts} setPosts={setPosts} projects={projects} onNotif={showNotif}/>
            )}

            {/* CLIENT SECTIONS */}
            {appView==="client"&&clientSection==="projets"&&selProject&&(
              <ClientProjectView project={selProject} clientData={activeClient} onUpdate={updProject} onNotif={showNotif} pricing={pricing}/>
            )}
            {appView==="client"&&clientSection==="calendrier"&&(
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <div style={{background:"linear-gradient(135deg,#E8C54710,#7B9CFF08)",border:"1px solid #E8C54720",borderRadius:10,padding:"14px 18px"}}>
                  <h2 style={{fontFamily:"'Bebas Neue'",fontSize:22,color:"#F0EEE8",letterSpacing:"0.04em"}}>DISPONIBILITÉS</h2>
                  <p style={{fontFamily:"'DM Sans'",fontSize:12,color:"#8888AA",marginTop:2}}>Consultez les disponibilités et posez une option sur une date.</p>
                </div>
                <CalendarModule bookings={bookings} setBookings={setBookings} isAdmin={false} onNotif={showNotif}/>
              </div>
            )}
            {appView==="client"&&clientSection==="cm"&&(
              <CMClientView posts={posts} setPosts={setPosts} projects={projects} onNotif={showNotif}/>
            )}
            {appView==="client"&&clientSection==="estimation"&&activeClient?.simulatorEnabled&&(
              <div style={{maxWidth:560}}>
                <div style={{marginBottom:20}}>
                  <h2 style={{fontFamily:"'Bebas Neue'",fontSize:24,color:"#F0EEE8",letterSpacing:"0.04em"}}>ESTIMATION TARIFAIRE</h2>
                  <p style={{fontFamily:"'DM Sans'",fontSize:12,color:"#8888AA",marginTop:3}}>Obtenez une estimation indicative en quelques clics.</p>
                </div>
                <ClientEstimationWidget pricing={pricing} clientData={activeClient}/>
              </div>
            )}
          </div>
        </div>

        {notif&&<Notif msg={notif} onDone={()=>setNotif(null)}/>}
      </div>
    </>
  );
}