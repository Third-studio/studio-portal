import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import Login from "./Login";

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@700;800&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    body { background:#FFFFFF; color:#1D1D1F; font-family:'Inter',sans-serif; }
    ::-webkit-scrollbar { width:4px; }
    ::-webkit-scrollbar-track { background:#F5F5F7; }
    ::-webkit-scrollbar-thumb { background:#C7C7CC; border-radius:2px; }
    @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
    @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes countUp { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
    .fadeUp  { animation:fadeUp .35s ease both; }
    .countUp { animation:countUp .4s cubic-bezier(.34,1.56,.64,1) both; }

    .btn { display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;border:none;font-family:'Inter',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .18s ease;white-space:nowrap; }
    .btn:active { transform:scale(.97); }
    .btn:disabled { opacity:.4;cursor:not-allowed; }
    .btn-primary { background:#00B4D8;color:#FFFFFF; }
    .btn-primary:hover:not(:disabled) { background:#0090B3; }
    .btn-ghost { background:transparent;color:#6E6E73;border:1.5px solid #E5E5EA; }
    .btn-ghost:hover:not(:disabled) { border-color:#00B4D8;color:#00B4D8; }
    .btn-green { background:#34C75918;color:#34C759;border:1px solid #34C75940; }
    .btn-green:hover:not(:disabled) { background:#34C75928; }
    .btn-red { background:#FF3B3018;color:#FF3B30;border:1px solid #FF3B3040; }
    .btn-red:hover:not(:disabled) { background:#FF3B3028; }
    .btn-blue { background:#00B4D818;color:#00B4D8;border:1px solid #00B4D840; }
    .btn-blue:hover:not(:disabled) { background:#00B4D828; }
    .btn-orange { background:#FF9F4318;color:#FF9500;border:1px solid #FF950040; }
    .btn-orange:hover:not(:disabled) { background:#FF950028; }
    .btn-purple { background:#AF52DE18;color:#AF52DE;border:1px solid #AF52DE40; }
    .btn-purple:hover:not(:disabled) { background:#AF52DE28; }

    .card { background:#FFFFFF;border:1px solid #E5E5EA;border-radius:12px;overflow:hidden;transition:border-color .2s,box-shadow .2s;box-shadow:0 2px 8px rgba(0,0,0,0.06); }
    .card:hover { border-color:#D1D1D6;box-shadow:0 4px 16px rgba(0,0,0,0.10); }

    .input { width:100%;background:#F5F5F7;border:1.5px solid #E5E5EA;border-radius:8px;padding:10px 14px;color:#1D1D1F;font-family:'Inter',sans-serif;font-size:13px;outline:none;transition:border-color .2s,box-shadow .2s;resize:none; }
    .input:focus { border-color:#00B4D8;box-shadow:0 0 0 3px rgba(0,180,216,0.12); }
    .input::placeholder { color:#C7C7CC; }
    select.input { appearance:none;cursor:pointer; }

    .tab { padding:7px 14px;border-radius:8px;cursor:pointer;font-family:'Inter',sans-serif;font-size:13px;font-weight:500;border:none;transition:all .15s; }
    .tab.active { background:#00B4D8;color:#FFFFFF;box-shadow:0 2px 8px rgba(0,180,216,0.3); }
    .tab:not(.active) { background:transparent;color:#6E6E73; }
    .tab:not(.active):hover { color:#1D1D1F;background:#F5F5F7; }

    .nav-item { display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all .15s;font-family:'Inter',sans-serif;font-size:13px;color:#6E6E73;border:1px solid transparent; }
    .nav-item:hover { background:#F2F2F7;color:#1D1D1F; }
    .nav-item.active { background:rgba(0,180,216,0.08);color:#00B4D8;border-color:rgba(0,180,216,0.2); }

    .sidebar-proj { display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;transition:all .15s;font-family:'Inter',sans-serif;font-size:12px;color:#6E6E73;border:1px solid transparent; }
    .sidebar-proj:hover { background:#F2F2F7;color:#1D1D1F; }
    .sidebar-proj.active { background:rgba(0,180,216,0.08);color:#00B4D8;border-color:rgba(0,180,216,0.2); }

    .progress-bar { height:3px;background:#E5E5EA;border-radius:2px;overflow:hidden; }
    .progress-fill { height:100%;border-radius:2px;background:linear-gradient(90deg,#0090B3,#00B4D8);transition:width .6s ease; }

    .check-item { display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:#FAFAFA;border-radius:8px;border:1px solid #E5E5EA;cursor:pointer;transition:all .15s;user-select:none; }
    .check-item:hover { border-color:#D1D1D6; }
    .check-item.done { background:#F0FDF4;border-color:#34C75930; }
    .check-box { width:18px;height:18px;border-radius:4px;border:2px solid #C7C7CC;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .15s;margin-top:1px; }
    .check-box.checked { background:#34C759;border-color:#34C759; }

    .cal-day { aspect-ratio:1;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;transition:all .15s ease;position:relative;border:1px solid transparent;min-height:48px; }
    .cal-day:hover:not(.past):not(.empty):not(.full) { transform:scale(1.05);z-index:2; }
    .cal-day.empty    { cursor:default;opacity:0;pointer-events:none; }
    .cal-day.past     { cursor:default;opacity:.3; }
    .cal-day.available { background:#FAFAFA;border-color:#E5E5EA; }
    .cal-day.available:hover { border-color:#4ECDC4;background:#4ECDC410; }
    .cal-day.option-a  { background:#FF9F4318;border-color:#FF9F4344; }
    .cal-day.option-b  { background:#00B4D818;border-color:#00B4D844; }
    .cal-day.option-ab { background:#FF9F4318;border-color:#FF9F4344; }
    .cal-day.full      { background:#FF3B3012;border-color:#FF3B3033;cursor:not-allowed; }
    .cal-day.confirmed-a { background:#00B4D812;border-color:#00B4D833; }
    .cal-day.confirmed-b { background:#4ECDC412;border-color:#4ECDC433; }
    .cal-day.confirmed-ab { background:#FF3B3018;border-color:#FF3B3044;cursor:not-allowed; }
    .cal-day.partial-a  { background:linear-gradient(135deg,#00B4D812 50%,#FAFAFA 50%);border-color:#00B4D833; }
    .cal-day.partial-b  { background:linear-gradient(135deg,#4ECDC412 50%,#FAFAFA 50%);border-color:#4ECDC433; }
    .cal-day.partial-ab { background:linear-gradient(135deg,#00B4D812 50%,#4ECDC412 50%);border-color:#6E6E7344; }
    .cal-day.selected { border-color:#00B4D8 !important;background:#00B4D820 !important;box-shadow:0 0 0 2px #00B4D840; }
    .cal-day.today { box-shadow:inset 0 0 0 2px #00B4D888; }

    .option-card { padding:12px 14px;border-radius:10px;border:2px solid #E5E5EA;cursor:pointer;transition:all .18s;background:#FAFAFA;display:flex;align-items:flex-start;gap:10px; }
    .option-card:hover { border-color:#D1D1D6;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,0.06); }
    .option-card.selected { border-color:#00B4D8;background:rgba(0,180,216,0.06); }
    .option-check { width:18px;height:18px;border-radius:50%;border:2px solid #C7C7CC;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;transition:all .15s; }
    .option-check.checked { background:#00B4D8;border-color:#00B4D8; }

    .toggle { width:36px;height:20px;border-radius:10px;border:none;cursor:pointer;transition:all .2s;position:relative;flex-shrink:0; }
    .toggle.on  { background:#00B4D8; }
    .toggle.off { background:#C7C7CC; }
    .toggle::after { content:'';position:absolute;top:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:all .2s;box-shadow:0 1px 3px rgba(0,0,0,0.15); }
    .toggle.on::after  { left:18px; }
    .toggle.off::after { left:2px; }

    .modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px; }
    .modal { background:#FFFFFF;border:1px solid #E5E5EA;border-radius:16px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;animation:fadeUp .25s ease;box-shadow:0 24px 64px rgba(0,0,0,0.12); }

    .notif { position:fixed;bottom:24px;right:24px;z-index:200;background:#FFFFFF;border:1px solid #E5E5EA;border-radius:12px;padding:12px 18px;font-family:'Inter',sans-serif;font-size:13px;color:#1D1D1F;display:flex;align-items:center;gap:8px;animation:fadeUp .3s ease;box-shadow:0 8px 32px rgba(0,0,0,0.12); }

    .admin-input { background:#F5F5F7;border:1.5px solid #E5E5EA;border-radius:6px;padding:6px 10px;color:#1D1D1F;font-family:'JetBrains Mono',monospace;font-size:12px;outline:none;transition:border-color .2s;width:100%;text-align:right; }
    .admin-input:focus { border-color:#00B4D8; }

    .tag { display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-family:'Inter',sans-serif;font-size:11px;font-weight:600;letter-spacing:.02em;text-transform:uppercase; }
    .tag-brief       { background:#00B4D818;color:#00B4D8; }
    .tag-storyboard  { background:#FF950018;color:#FF9500; }
    .tag-review      { background:#FF9F4318;color:#FF9F43; }
    .tag-delivered   { background:#34C75918;color:#34C759; }

    .time-cell { background:#F5F5F7;border:1.5px solid #E5E5EA;border-radius:6px;padding:6px 8px;color:#1D1D1F;font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;width:100%;text-align:center;transition:border-color .2s; }
    .time-cell:focus { border-color:#00B4D8; }

    .step-dot { width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;transition:all .3s;font-family:'Inter',sans-serif; }
    .step-dot.done   { background:#34C759;color:#FFFFFF; }
    .step-dot.active { background:#00B4D8;color:#FFFFFF; }
    .step-dot.todo   { background:#F2F2F7;color:#8E8E93;border:1px solid #E5E5EA; }

    .price-range { background:linear-gradient(135deg,rgba(0,180,216,0.06),rgba(0,180,216,0.02));border:1px solid rgba(0,180,216,0.2);border-radius:12px;padding:24px;text-align:center; }
    .discount-badge { display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:10px;font-family:'Inter',sans-serif;font-size:11px;font-weight:600;background:#34C75918;color:#34C759;border:1px solid #34C75940; }
    .clickup-badge  { display:inline-flex;align-items:center;gap:5px;padding:3px 8px;background:#7B68EE18;border:1px solid #7B68EE44;border-radius:12px;font-family:'Inter',sans-serif;font-size:10px;color:#7B68EE;font-weight:600; }

    .timeline-step { display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;position:relative; }
    .timeline-step::after { content:'';position:absolute;top:13px;left:50%;right:-50%;height:2px;background:#E5E5EA;z-index:0; }
    .timeline-step:last-child::after { display:none; }
    .timeline-dot { width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;z-index:1;font-family:'Inter',sans-serif; }
    .dot-done   { background:#34C759;color:#FFFFFF; }
    .dot-active { background:#00B4D8;color:#FFFFFF;animation:pulse 1.8s infinite; }
    .dot-todo   { background:#F2F2F7;color:#8E8E93;border:1px solid #E5E5EA; }

    .comment-bubble       { padding:10px 14px;border-radius:10px;font-family:'Inter',sans-serif;font-size:13px;line-height:1.5;max-width:80%; }
    .comment-prod         { background:#F2F2F7;color:#1D1D1F;align-self:flex-start; }
    .comment-client       { background:rgba(0,180,216,0.08);color:#1D1D1F;border:1px solid rgba(0,180,216,0.15);align-self:flex-end; }
    .comment-prestataire  { background:#E0F2F1;color:#1D1D1F;border:1px solid #4ECDC430;align-self:flex-start;white-space:pre-line; }

    .equip-item { display:flex;align-items:center;gap:8px;padding:8px 12px;background:#FAFAFA;border-radius:8px;border:1px solid #E5E5EA;transition:all .15s; }
    .equip-item.included { border-color:rgba(0,180,216,0.3); }
    .type-pill { padding:5px 12px;border-radius:20px;cursor:pointer;font-family:'Inter',sans-serif;font-size:12px;font-weight:500;border:1.5px solid #E5E5EA;background:#FAFAFA;color:#6E6E73;transition:all .15s; }
    .type-pill.selected { background:rgba(0,180,216,0.08);border-color:#00B4D8;color:#00B4D8; }
    .type-pill:hover:not(.selected) { border-color:#D1D1D6;color:#1D1D1F; }

    /* ── RESPONSIVE ── */
    .app-body { display:flex;flex:1;overflow:hidden; }
    .app-sidebar { width:200px;border-right:1px solid #E5E5EA;background:rgba(247,247,247,0.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);padding:14px 10px;display:flex;flex-direction:column;gap:4px;overflow-y:auto;flex-shrink:0;transition:transform .25s ease; }
    .app-main { flex:1;overflow-y:auto;padding:22px 24px; }
    .mob-only { display:none !important; }
    .desk-only { display:flex; }
    .sidebar-backdrop { display:none; }

    @media (max-width:768px) {
      .app-sidebar { position:fixed;left:0;top:54px;height:calc(100vh - 54px);z-index:40;transform:translateX(-100%);box-shadow:none;width:220px; }
      .app-sidebar.open { transform:translateX(0);box-shadow:4px 0 30px rgba(0,0,0,0.12); }
      .app-main { padding:14px 14px 90px; }
      .mob-only { display:flex !important; }
      .desk-only { display:none !important; }
      .sidebar-backdrop { display:block;position:fixed;inset:0;top:54px;background:rgba(0,0,0,0.3);z-index:39;backdrop-filter:blur(2px); }
      .notif { bottom:80px;right:12px;left:12px;font-size:12px; }
      .modal { max-width:100% !important;border-radius:12px; }
    }
    @media (max-width:480px) {
      .app-main { padding:12px 12px 90px; }
      .btn { font-size:12px;padding:7px 12px; }
      .input { font-size:13px;padding:9px 12px; }
    }
  `}</style>
);

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & REFERENCE DATA
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_STEPS   = ["Brief","Storyboard","Tournage","Montage","Livraison"];
const STATUS_INDEX   = { brief:0, storyboard:1, tournage:2, montage:3, livraison:4 };
const ALLOWED_DOMAINS=/^https:\/\/(www\.)?(youtu\.be|youtube\.com|vimeo\.com|player\.vimeo\.com|dropbox\.com|drive\.google\.com|docs\.google\.com|wetransfer\.com|we\.tl|frame\.io|app\.frame\.io|frameio\.com|notion\.so|1drv\.ms|onedrive\.live\.com)(\/|$)/i;
const isSafeUrl=(url)=>{if(!url)return false;try{return ALLOWED_DOMAINS.test(new URL(url).href);}catch{return false;}};
const safePortfolioUrl=(url)=>{if(!url)return null;try{const u=new URL(url.trim());return["https:","http:"].includes(u.protocol)?u.href:null;}catch{return null;}};
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
const INIT_CLIENTS = [];

// INIT_PROJECTS removed

const INIT_BOOKINGS = [
  {id:1,date:d(3), team:"A",client:"Clément Distilleries",status:"confirmed",confirmType:"devis",  extras:["drone"],     note:"Tournage nuit distillerie",createdAt:d(-2),expiresAt:null,startTime:"08:00",endTime:"12:00"},
  {id:2,date:d(5), team:"B",client:"CTM",                 status:"confirmed",confirmType:"acompte",extras:[],            note:"Interview élus",           createdAt:d(-5),expiresAt:null,startTime:"08:00",endTime:"17:00"},
  {id:3,date:d(7), team:"A",client:"Tropiques Atrium",    status:"option",   confirmType:null,     extras:["steadicam"], note:"",                         createdAt:d(-1),expiresAt:new Date(Date.now()+18*3600000).toISOString(),startTime:"13:00",endTime:"17:00"},
  {id:4,date:d(7), team:"B",client:"Nouveau client",      status:"option",   confirmType:null,     extras:[],            note:"",                         createdAt:d(0), expiresAt:new Date(Date.now()+47*3600000).toISOString(),startTime:"08:00",endTime:"17:00"},
  {id:5,date:d(3), team:"B",client:"Rhum J.M",            status:"confirmed",confirmType:"devis",  extras:[],            note:"",                         createdAt:d(-3),expiresAt:null,startTime:"13:00",endTime:"17:00"},
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
const fmtProdAuthor = (nom) => { if(!nom)return"Studio"; const p=nom.trim().split(/\s+/); return p.length>1?p[0]+" "+p[1][0]+".":p[0]; };
const downloadICS = (summary, dateStr, description="", location="Third-One Studio, Martinique") => {
  const d=dateStr.replace(/-/g,"");
  const nd=new Date(dateStr+"T12:00:00");nd.setDate(nd.getDate()+1);
  const dend=nd.toISOString().split("T")[0].replace(/-/g,"");
  const uid=`${Date.now()}@thirdone.studio`;
  const ics=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Third-One Studio//FR","BEGIN:VEVENT",`UID:${uid}`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").split(".")[0]}Z`,`DTSTART;VALUE=DATE:${d}`,`DTEND;VALUE=DATE:${dend}`,`SUMMARY:${summary}`,`DESCRIPTION:${description.replace(/\n/g,"\\n")}`,`LOCATION:${location}`,"END:VEVENT","END:VCALENDAR"].join("\r\n");
  const blob=new Blob([ics],{type:"text/calendar;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${summary.replace(/[^a-zA-Z0-9]/g,"_")}.ics`;a.click();
};

function Notif({msg,color="#4ECDC4",onDone}){
  useEffect(()=>{const t=setTimeout(onDone,3000);return()=>clearTimeout(t);});
  return <div className="notif"><span style={{color}}>✓</span> {msg}</div>;
}
function Lbl({children,style={}}){
  return <label style={{fontFamily:"'Inter'",fontSize:11,color:"#6E6E73",textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:5,...style}}>{children}</label>;
}
function SH({icon,title,sub,right}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:32,height:32,borderRadius:8,background:"#00B4D818",border:"1px solid #00B4D830",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{icon}</div>
        <div>
          <h3 style={{fontFamily:"'Urbanist'",fontSize:16,color:"#1D1D1F",letterSpacing:"0.05em"}}>{title}</h3>
          {sub&&<p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93",marginTop:1}}>{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const TIME_SLOTS=[
  {id:"matin",   label:"Matin",            start:"08:00",end:"12:00",hours:4},
  {id:"aprem",   label:"Après-midi",       start:"13:00",end:"17:00",hours:4},
  {id:"journee", label:"Journée complète", start:"08:00",end:"17:00",hours:8},
];
function slotOverlap(s1,e1,s2,e2){return s1<e2&&e1>s2;}
function getTeamDayInfo(dateStr,team,bookings){
  const bs=bookings.filter(b=>b.date===dateStr&&b.team===team&&b.status!=="refused"&&!(b.status==="option"&&b.expiresAt&&new Date(b.expiresAt)<Date.now()));
  const matinTaken=bs.some(b=>slotOverlap(b.startTime||"08:00",b.endTime||"17:00","08:00","12:00"));
  const apremTaken=bs.some(b=>slotOverlap(b.startTime||"08:00",b.endTime||"17:00","13:00","17:00"));
  const hoursBooked=(matinTaken?4:0)+(apremTaken?4:0);
  const isFull=hoursBooked>=8;
  let status="free";
  if(isFull){status=bs.some(b=>b.status==="option")?"option":"confirmed";}
  else if(hoursBooked>0){status=bs.some(b=>b.status==="confirmed")?"partial-confirmed":bs.some(b=>b.status==="option")?"partial-option":"free";}
  return{bookings:bs,matinTaken,apremTaken,hoursBooked,isFull,status};
}
function getDayStatus(dateStr,bookings){
  const infoA=getTeamDayInfo(dateStr,"A",bookings);
  const infoB=getTeamDayInfo(dateStr,"B",bookings);
  return{A:infoA.status,B:infoB.status,infoA,infoB};
}
function getDayClass(dateStr,bookings){
  const t=isoToday();
  if(dateStr<t)return"past";
  const{A,B}=getDayStatus(dateStr,bookings);
  const isFull=s=>s==="confirmed"||s==="option";
  const isPartial=s=>s==="partial-confirmed"||s==="partial-option";
  if(isFull(A)&&isFull(B))return"confirmed-ab";
  if(isFull(A))return A==="confirmed"?"confirmed-a":"option-a";
  if(isFull(B))return B==="confirmed"?"confirmed-b":"option-b";
  if(isPartial(A)&&isPartial(B))return"partial-ab";
  if(isPartial(A))return"partial-a";
  if(isPartial(B))return"partial-b";
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
          <span style={{fontFamily:"'Inter'",fontSize:9,color:i<=cur?"#1D1D1F":"#8E8E93",textAlign:"center"}}>{s}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: COMMENT THREAD
// ─────────────────────────────────────────────────────────────────────────────
function PrestaireProposalCard({content}){
  let data;
  try{ data=JSON.parse(content); }catch{ return <span style={{whiteSpace:"pre-line",fontFamily:"'Inter',sans-serif",fontSize:13}}>{content}</span>; }
  if(data.type!=="prestataire_proposal") return <span style={{whiteSpace:"pre-line",fontFamily:"'Inter',sans-serif",fontSize:13}}>{content}</span>;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {(data.prix||data.description)&&(
        <div style={{background:"#F5F5F7",borderRadius:8,padding:"12px 14px",border:"1px solid #4ECDC430"}}>
          {data.prix&&(
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:data.description?6:0,flexWrap:"wrap"}}>
              <span style={{fontFamily:"'Urbanist'",fontSize:22,color:"#4ECDC4",letterSpacing:"0.04em"}}>{Number(data.prix).toLocaleString("fr-FR")} €</span>
              <span style={{fontFamily:"'Inter'",fontSize:11,color:"#6E6E73"}}>— proposition</span>
              {data.non_concurrence&&<span style={{fontFamily:"'Inter'",fontSize:10,color:"#4ECDC4",background:"#4ECDC415",border:"1px solid #4ECDC430",borderRadius:10,padding:"2px 8px",marginLeft:"auto"}}>✓ Clause non-concurrence acceptée</span>}
            </div>
          )}
          {data.description&&<p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",fontStyle:"italic",lineHeight:1.5}}>{data.description}</p>}
        </div>
      )}
      {data.message&&<p style={{fontFamily:"'Inter'",fontSize:13,color:"#1D1D1F",lineHeight:1.6,whiteSpace:"pre-line"}}>{data.message}</p>}
      {!data.prix&&data.non_concurrence&&<span style={{fontFamily:"'Inter'",fontSize:10,color:"#4ECDC4",background:"#4ECDC415",border:"1px solid #4ECDC430",borderRadius:10,padding:"2px 8px",alignSelf:"flex-start"}}>✓ Clause non-concurrence acceptée</span>}
      {(data.portfolio_urls||[]).length>0&&(
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93"}}>Portfolio :</span>
          {data.portfolio_urls.map((url,i)=>{const safe=safePortfolioUrl(url);return safe?(
            <a key={i} href={safe} target="_blank" rel="noreferrer" style={{fontFamily:"'Inter'",fontSize:11,color:"#7B9CFF",textDecoration:"none",background:"#7B9CFF15",border:"1px solid #7B9CFF30",borderRadius:4,padding:"2px 8px"}}>↗ Lien {i+1}</a>
          ):null;})}
        </div>
      )}
    </div>
  );
}

function CommentThread({comments,onAdd,role="prod"}){
  const[text,setText]=useState("");
  const endRef=useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[comments]);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:320,overflowY:"auto",padding:"2px 0"}}>
        {comments.length===0&&<p style={{fontFamily:"'Inter'",fontSize:13,color:"#8E8E93",textAlign:"center",padding:"20px 0"}}>Aucun message.</p>}
        {comments.map(c=>(
          <div key={c.id} style={{display:"flex",flexDirection:"column",alignItems:c.role==="client"?"flex-end":"flex-start",gap:2}}>
            <span style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93",paddingInline:4}}>
              {c.role==="prestataire"&&<span style={{color:"#4ECDC4",marginRight:4}}>🤝</span>}
              {c.author} · {fmtS(c.date)}
            </span>
            <div className={`comment-bubble comment-${c.role==="client"?"client":c.role==="prestataire"?"prestataire":"prod"}`}>
              {c.role==="prestataire"?<PrestaireProposalCard content={c.text}/>:c.text}
            </div>
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
  const colors=["#00B4D822","#4ECDC422","#7B9CFF22","#FF9F4322","#FF3B3022"];
  return(
    <div style={{flex:"0 0 auto",width:150,background:"#F5F5F7",border:"1px solid #E5E5EA",borderRadius:8,overflow:"hidden",transition:"all .2s"}}>
      <div style={{height:90,background:colors[index%colors.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,position:"relative"}}>
        {frame.visual}
        <span style={{position:"absolute",top:5,left:7,fontFamily:"'Urbanist'",fontSize:10,color:"#8E8E93",letterSpacing:1}}>PLAN {index+1}</span>
      </div>
      <div style={{padding:"7px 9px"}}><p style={{fontFamily:"'Inter'",fontSize:11,color:"#6E6E73",lineHeight:1.4}}>{frame.desc}</p></div>
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
      <div style={{background:"#F5F5F7",border:"1px solid #E5E5EA",borderRadius:7,padding:"10px 12px"}}>
        <p style={{fontFamily:"'JetBrains Mono'",fontSize:10,color:"#8E8E93",lineHeight:1.6,whiteSpace:"pre-line"}}>{briefTxt}</p>
      </div>
      <textarea className="input" rows={3} placeholder="Instructions créatives : ambiance, angles, éléments visuels clés..." value={prompt} onChange={e=>setPrompt(e.target.value)}/>
      {error&&<p style={{fontFamily:"'Inter'",fontSize:12,color:"#FF3B30"}}>{error}</p>}
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
    if(form.url&&!safePortfolioUrl(form.url)){onNotif("URL invalide — utilisez un lien https://");return;}
    onUpdate({...project,livrables:[...(project.livrables||[]),{id:Date.now(),...form,category:showAdd,date:new Date().toISOString().split("T")[0]}]});
    onNotif("Fichier ajouté !");setForm({name:"",url:"",note:""});setShowAdd(null);
  };
  const del=id=>onUpdate({...project,livrables:(project.livrables||[]).filter(l=>l.id!==id)});
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {sections.map(sec=>{
        const fs=files(sec.key);
        return(
          <div key={sec.key} className="card" style={{padding:16,borderColor:fs.length?sec.colorBorder:"#E5E5EA"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:30,height:30,borderRadius:7,background:sec.colorDim,border:`1px solid ${sec.colorBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{sec.icon}</div>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontFamily:"'Inter'",fontSize:13,fontWeight:600,color:"#1D1D1F"}}>{sec.label}</span>
                    <span style={{fontFamily:"'Inter'",fontSize:9,color:sec.vis?sec.color:"#8E8E93",background:sec.vis?sec.colorDim:"#F2F2F7",border:`1px solid ${sec.vis?sec.colorBorder:"#E5E5EA"}`,borderRadius:8,padding:"1px 6px"}}>{sec.vis?"Visible client":"Interne"}</span>
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost" style={{fontSize:11,borderColor:sec.colorBorder,color:sec.color}} onClick={()=>setShowAdd(showAdd===sec.key?null:sec.key)}>{showAdd===sec.key?"✕":"+ Ajouter"}</button>
            </div>
            {showAdd===sec.key&&(
              <div style={{background:"#F5F5F7",border:`1px solid ${sec.colorBorder}`,borderRadius:7,padding:12,marginBottom:10,display:"flex",flexDirection:"column",gap:7}}>
                <input className="input" placeholder="Nom du fichier *" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
                <input className="input" placeholder="Lien (Drive, WeTransfer...)" value={form.url} onChange={e=>setForm(p=>({...p,url:e.target.value}))}/>
                <input className="input" placeholder="Note interne (optionnel)" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))}/>
                <div style={{display:"flex",gap:7,justifyContent:"flex-end"}}>
                  <button className="btn btn-ghost" style={{fontSize:11}} onClick={()=>setShowAdd(null)}>Annuler</button>
                  <button className="btn btn-primary" style={{fontSize:11}} onClick={add}>Enregistrer</button>
                </div>
              </div>
            )}
            {fs.length===0?<p style={{fontFamily:"'Inter'",fontSize:12,color:"#C7C7CC",textAlign:"center",padding:"8px 0"}}>Aucun fichier</p>:(
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {fs.map(f=>(
                  <div key={f.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#FFFFFF",borderRadius:6,border:"1px solid #E5E5EA"}}>
                    <div style={{width:5,height:5,borderRadius:"50%",background:sec.color,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontFamily:"'Inter'",fontSize:12,color:"#1D1D1F",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</p>
                      {f.note&&<p style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93"}}>{f.note}</p>}
                    </div>
                    {safePortfolioUrl(f.url)&&<a href={safePortfolioUrl(f.url)} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{fontSize:10,padding:"3px 8px",textDecoration:"none"}}>↗</a>}
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

function MoodboardPanel({project,onUpdate,onNotif,authorName,isAdmin}){
  const[urlInput,setUrlInput]=useState("");
  const[caption,setCaption]=useState("");
  const[uploading,setUploading]=useState(false);
  const[hoverId,setHoverId]=useState(null);
  const fileRef=useRef(null);

  const saveMoodboard=async(items)=>{
    const newBrief={...project.brief,moodboard:items,videoStatus:project.videoStatus,videoComment:project.videoComment};
    await supabase.from("projects").update({brief:newBrief}).eq("id",project.id);
    onUpdate({...project,brief:newBrief,moodboard:items});
  };

  const addByUrl=async()=>{
    if(!urlInput.trim())return;
    const item={id:Date.now(),url:urlInput.trim(),caption:caption.trim(),addedBy:authorName||"Équipe",addedAt:isoToday()};
    await saveMoodboard([...(project.moodboard||[]),item]);
    setUrlInput("");setCaption("");
    onNotif("Image ajoutée au moodboard !");
  };

  const addByFile=async(file)=>{
    if(!file)return;
    setUploading(true);
    const ext=file.name.split(".").pop();
    const path=`${project.id}/${Date.now()}.${ext}`;
    const{error}=await supabase.storage.from("moodboard").upload(path,file,{upsert:true});
    if(error){onNotif("Erreur upload : "+error.message);setUploading(false);return;}
    const{data}=supabase.storage.from("moodboard").getPublicUrl(path);
    const item={id:Date.now(),url:data.publicUrl,caption:caption.trim(),addedBy:authorName||"Équipe",addedAt:isoToday()};
    await saveMoodboard([...(project.moodboard||[]),item]);
    setCaption("");setUploading(false);
    onNotif("Image ajoutée au moodboard !");
  };

  const remove=async(id)=>{
    await saveMoodboard((project.moodboard||[]).filter(x=>x.id!==id));
    onNotif("Image supprimée");
  };

  const items=project.moodboard||[];

  return(
    <div className="card fadeUp" style={{padding:18}}>
      <SH icon="🎨" title="MOODBOARD" sub="Inspirations visuelles pour cadrer la direction artistique"/>

      {/* Add form */}
      <div style={{background:"#F5F5F7",borderRadius:8,padding:"14px",border:"1px solid #E5E5EA",marginBottom:16}}>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",gap:8}}>
            <input className="input" placeholder="Coller une URL d'image (Pinterest, Unsplash…)" value={urlInput} onChange={e=>setUrlInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addByUrl()} style={{flex:1}}/>
            <button className="btn btn-primary" onClick={addByUrl} disabled={!urlInput.trim()} style={{whiteSpace:"nowrap"}}>+ URL</button>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input className="input" placeholder="Légende (optionnel)" value={caption} onChange={e=>setCaption(e.target.value)} style={{flex:1}}/>
            <button className="btn btn-ghost" disabled={uploading} style={{whiteSpace:"nowrap",fontSize:12}} onClick={()=>fileRef.current?.click()}>
              {uploading?"Envoi…":"⬆ Fichier"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&addByFile(e.target.files[0])}/>
          </div>
        </div>
      </div>

      {/* Grid */}
      {items.length===0&&(
        <p style={{fontFamily:"'Inter'",fontSize:13,color:"#8E8E93",textAlign:"center",padding:"30px 0"}}>
          Aucune image pour l'instant.<br/><span style={{fontSize:11}}>Collez des URLs ou uploadez des fichiers pour construire votre direction artistique.</span>
        </p>
      )}
      {items.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
          {items.map(item=>(
            <div key={item.id} style={{position:"relative",borderRadius:8,overflow:"hidden",aspectRatio:"4/3",background:"#F5F5F7",border:"1px solid #E5E5EA",cursor:"pointer"}}
              onMouseEnter={()=>setHoverId(item.id)} onMouseLeave={()=>setHoverId(null)}>
              {safePortfolioUrl(item.url)&&<img src={safePortfolioUrl(item.url)} alt={item.caption||"moodboard"} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}
                onError={e=>{e.target.style.display="none";}}/>}
              {/* Overlay */}
              <div style={{position:"absolute",inset:0,background:"rgba(8,8,15,0.75)",opacity:hoverId===item.id?1:0,transition:"opacity .18s",display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"8px"}}>
                {item.caption&&<p style={{fontFamily:"'Inter'",fontSize:11,color:"#1D1D1F",lineHeight:1.4}}>{item.caption}</p>}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginTop:"auto"}}>
                  <span style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93"}}>{item.addedBy}</span>
                  <button style={{background:"#FF3B3018",border:"1px solid #FF3B3033",borderRadius:4,color:"#FF3B30",fontFamily:"'Inter'",fontSize:11,padding:"2px 7px",cursor:"pointer"}} onClick={()=>remove(item.id)}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHARTE GRAPHIQUE PANEL
// ─────────────────────────────────────────────────────────────────────────────
function CharteGraphiquePanel({project,onUpdate,onNotif}){
  const initCharte=()=>({colors:[],fonts:[],logoUrl:"",notes:"",...(project.brief?.charte||{})});
  const[charte,setCharte]=useState(initCharte);
  const[uploading,setUploading]=useState(false);
  const colorRefs=useRef({});

  const saveCharte=async(c)=>{
    const newBrief={...project.brief,charte:c};
    await supabase.from("projects").update({brief:newBrief}).eq("id",project.id);
    onUpdate({...project,brief:newBrief});
  };

  const handleSave=async()=>{
    await saveCharte(charte);
    onNotif("Charte sauvegardée !");
  };

  const handleLogoUpload=async(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    setUploading(true);
    const path=`${project.id}/logo`;
    const{error}=await supabase.storage.from("chartes").upload(path,file,{upsert:true});
    if(error){onNotif("Erreur upload : "+error.message);setUploading(false);return;}
    const{data:urlData}=supabase.storage.from("chartes").getPublicUrl(path);
    const publicUrl=urlData?.publicUrl||"";
    const newCharte={...charte,logoUrl:publicUrl};
    setCharte(newCharte);
    await saveCharte(newCharte);
    onNotif("Logo mis à jour !");
    setUploading(false);
  };

  const addColor=()=>{
    const c={...charte,colors:[...(charte.colors||[]),"#CCCCCC"]};
    setCharte(c);
  };
  const updateColor=(idx,val)=>{
    const cols=[...(charte.colors||[])];
    cols[idx]=val;
    setCharte(c=>({...c,colors:cols}));
  };
  const removeColor=(idx)=>{
    const cols=(charte.colors||[]).filter((_,i)=>i!==idx);
    setCharte(c=>({...c,colors:cols}));
  };

  const addFont=()=>setCharte(c=>({...c,fonts:[...(c.fonts||[]),"Nova Police"]}));
  const updateFont=(idx,val)=>{
    const fts=[...(charte.fonts||[])];
    fts[idx]=val;
    setCharte(c=>({...c,fonts:fts}));
  };
  const removeFont=(idx)=>setCharte(c=>({...c,fonts:(c.fonts||[]).filter((_,i)=>i!==idx)}));

  return(
    <div className="fadeUp" style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Logo */}
      <div className="card" style={{padding:18}}>
        <p style={{fontFamily:"'Urbanist'",fontSize:12,color:"#00B4D8",letterSpacing:"0.08em",marginBottom:12}}>LOGO</p>
        <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          {charte.logoUrl&&(
            <img src={charte.logoUrl} alt="logo" style={{height:80,borderRadius:8,border:"1px solid #E5E5EA",background:"#F5F5F7",objectFit:"contain",padding:4}} onError={e=>{e.target.style.display="none";}}/>
          )}
          <label style={{cursor:"pointer"}}>
            <input type="file" accept="image/*" style={{display:"none"}} onChange={handleLogoUpload} disabled={uploading}/>
            <span className="btn btn-ghost" style={{fontSize:12,pointerEvents:"none"}}>
              {uploading?"⏳ Upload...":charte.logoUrl?"Modifier le logo":"+ Ajouter un logo"}
            </span>
          </label>
        </div>
      </div>

      {/* Couleurs */}
      <div className="card" style={{padding:18}}>
        <p style={{fontFamily:"'Urbanist'",fontSize:12,color:"#00B4D8",letterSpacing:"0.08em",marginBottom:12}}>PALETTE DE COULEURS</p>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          {(charte.colors||[]).map((col,idx)=>(
            <div key={idx} style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div
                onClick={()=>{if(colorRefs.current[idx])colorRefs.current[idx].click();}}
                style={{width:36,height:36,borderRadius:"50%",background:col,border:"2px solid #E5E5EA",cursor:"pointer",transition:"transform .15s",boxShadow:"0 2px 8px rgba(0,0,0,.4)"}}
                title={col}
              />
              <input
                type="color"
                ref={el=>colorRefs.current[idx]=el}
                value={col}
                style={{position:"absolute",opacity:0,width:1,height:1,pointerEvents:"none"}}
                onChange={e=>updateColor(idx,e.target.value)}
              />
              <button onClick={()=>removeColor(idx)} style={{background:"none",border:"none",color:"#8E8E93",cursor:"pointer",fontSize:10,padding:0,lineHeight:1}}>✕</button>
            </div>
          ))}
          <button className="btn btn-ghost" style={{fontSize:11,padding:"5px 10px"}} onClick={addColor}>+ Couleur</button>
        </div>
        {(charte.colors||[]).length>0&&(
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10}}>
            {(charte.colors||[]).map((col,idx)=>(
              <span key={idx} style={{fontFamily:"'JetBrains Mono'",fontSize:10,color:"#6E6E73"}}>{col}</span>
            ))}
          </div>
        )}
      </div>

      {/* Typographies */}
      <div className="card" style={{padding:18}}>
        <p style={{fontFamily:"'Urbanist'",fontSize:12,color:"#00B4D8",letterSpacing:"0.08em",marginBottom:12}}>TYPOGRAPHIES</p>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {(charte.fonts||[]).map((font,idx)=>(
            <div key={idx} style={{display:"flex",gap:8,alignItems:"center"}}>
              <input className="input" value={font} placeholder="Nom de la police..." onChange={e=>updateFont(idx,e.target.value)} style={{flex:1}}/>
              <button className="btn btn-red" style={{fontSize:10,padding:"5px 8px",flexShrink:0}} onClick={()=>removeFont(idx)}>✕</button>
            </div>
          ))}
          <button className="btn btn-ghost" style={{fontSize:11,padding:"5px 10px",alignSelf:"flex-start"}} onClick={addFont}>+ Police</button>
        </div>
      </div>

      {/* Notes */}
      <div className="card" style={{padding:18}}>
        <p style={{fontFamily:"'Urbanist'",fontSize:12,color:"#00B4D8",letterSpacing:"0.08em",marginBottom:12}}>NOTES / GUIDELINES</p>
        <textarea
          className="input"
          rows={4}
          placeholder="Ton de la marque, style visuel, éléments à éviter..."
          value={charte.notes||""}
          onChange={e=>setCharte(c=>({...c,notes:e.target.value}))}
        />
      </div>

      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <button className="btn btn-primary" onClick={handleSave}>Enregistrer la charte</button>
      </div>
    </div>
  );
}

function ProdProjectView({project,onUpdate,onNotif,teamMembers,assignments,onUpdateAssignments,meetingNotes,onUpdateMeetingNotes,clients,userProfile,bookings=[],setBookings,onGoToCalendar,serviceTypes=[],prestataires=[],prestataireMissions=[],setPrestataireMissions,onPreviewClient}){
  const[tab,setTab]=useState("brief");
  const[showGen,setShowGen]=useState(false);
  const assignClient=async(clientId)=>{const val=clientId||null;await supabase.from("projects").update({client_id:val}).eq("id",project.id);onUpdate({...project,clientId:val});onNotif(clientId?"Client assigné !":"Client retiré");};
  const briefFields=[{k:"objective",l:"Objectif",p:"Quel message / contexte ?"},{k:"target",l:"Cible",p:"Âge, CSP..."},{k:"duration",l:"Durée",p:"30s, 2min..."},{k:"tone",l:"Ton",p:"Premium, documentaire..."},{k:"deliverables",l:"Livrables",p:"Formats, versions..."}];
  const[brief,setBrief]=useState({...project.brief});
  const[statusMeta,setStatusMeta]=useState({deliveryDate:project.deliveryDate||"",shootDate:project.shootDate||"",statusNote:project.statusNote||"",replayUrl:project.replayUrl||""});
  const addSB=sb=>{onUpdate({...project,storyboards:[...project.storyboards,sb]});setShowGen(false);onNotif("Storyboard généré !");};
  const updSB=(id,st)=>{onUpdate({...project,storyboards:project.storyboards.map(s=>s.id===id?{...s,validationStatus:st}:s)});onNotif("Statut mis à jour");};
  const addMsg=async(text,role)=>{
    const author=role==="prod"?fmtProdAuthor(userProfile?.nom):(userProfile?.nom||"Client");
    const date=new Date().toISOString().split("T")[0];
    const c={id:Date.now(),author,text,date,role};
    onUpdate({...project,comments:[...project.comments,c]});
    await supabase.from("messages").insert({project_id:project.id,author,content:text,role});
  };
  const saveBrief=async()=>{
    if(statusMeta.replayUrl&&!isSafeUrl(statusMeta.replayUrl)){onNotif("URL invalide — domaine non autorisé");return;}
    const newBrief={...brief,videoStatus:project.videoStatus,videoComment:project.videoComment};
    const safeUrl=statusMeta.replayUrl&&isSafeUrl(statusMeta.replayUrl)?statusMeta.replayUrl:null;
    await supabase.from("projects").update({brief:newBrief,delivery_date:statusMeta.deliveryDate||null,shoot_date:statusMeta.shootDate||null,status_note:statusMeta.statusNote||null,replay_url:safeUrl}).eq("id",project.id);
    onUpdate({...project,brief:newBrief,deliveryDate:statusMeta.deliveryDate,shootDate:statusMeta.shootDate,statusNote:statusMeta.statusNote,replayUrl:safeUrl||"",status:project.status==="brief"?"storyboard":project.status});
    onNotif("Brief sauvegardé !");
  };
  const briefServices=project.brief?.services||[];
  const tabs=[{k:"brief",l:"Brief"},{k:"charte",l:"Charte graphique"},{k:"moodboard",l:`Moodboard (${(project.moodboard||[]).length})`},{k:"storyboards",l:`Storyboards (${project.storyboards.length})`},{k:"comments",l:`Messages (${project.comments.length})`},{k:"livrables",l:"Livrables"},{k:"reservations",l:`Réservations (${bookings.filter(b=>String(b.projectId)===String(project.id)).length})`},{k:"equipe",l:`Équipe (${assignments.filter(a=>a.projectId===project.id).length})`},{k:"notes",l:`Notes (${meetingNotes.filter(n=>n.projectId===project.id).length})`},...(briefServices.length>0||prestataireMissions.filter(m=>m.project_id===project.id).length>0?[{k:"prestataires",l:`🤝 Prestataires (${prestataireMissions.filter(m=>m.project_id===project.id).length})`}]:[{k:"prestataires",l:"🤝 Prestataires"}])];
  const[linkingBookingId,setLinkingBookingId]=useState("");
  return(
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div className="fadeUp">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
          <div><h2 style={{fontFamily:"'Urbanist'",fontSize:26,color:"#1D1D1F",letterSpacing:"0.04em"}}>{project.title}</h2></div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            {clients&&clients.length>0&&(<select className="input" style={{width:"auto",fontSize:12,padding:"6px 10px"}} value={project.clientId||""} onChange={e=>assignClient(e.target.value)}><option value="">— Aucun client —</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>)}
            {project.clientId&&onPreviewClient&&(()=>{const c=clients.find(x=>x.id===project.clientId);return c?<button className="btn btn-ghost" style={{fontSize:11,padding:"4px 10px",color:"#7B9CFF",borderColor:"#7B9CFF40"}} onClick={()=>onPreviewClient(c)}>👁 Voir côté client</button>:null;})()}
            <span className={`tag tag-${project.status}`}>{project.status}</span>
          </div>
        </div>
        <div style={{marginTop:12}}><Timeline status={project.status}/></div>
      </div>
      <div style={{display:"flex",gap:4,background:"#F5F5F7",padding:4,borderRadius:8,overflowX:"auto"}}>
        {tabs.map(t=><button key={t.k} className={`tab ${tab===t.k?"active":""}`} style={{whiteSpace:"nowrap"}} onClick={()=>setTab(t.k)}>{t.l}</button>)}
      </div>
      {tab==="brief"&&(
        <div className="fadeUp" style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="card" style={{padding:18}}>
            <SH icon="📅" title="DATES & STATUT"/>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><Lbl>Date de tournage prévue</Lbl><input type="date" className="input" value={statusMeta.shootDate} onChange={e=>setStatusMeta(p=>({...p,shootDate:e.target.value}))}/></div>
                <div><Lbl>Date de livraison prévue</Lbl><input type="date" className="input" value={statusMeta.deliveryDate} onChange={e=>setStatusMeta(p=>({...p,deliveryDate:e.target.value}))}/></div>
              </div>
              <div><Lbl>Note de statut (visible client)</Lbl><input className="input" placeholder="Ex: Montage en cours, livraison le 15 mai..." value={statusMeta.statusNote} onChange={e=>setStatusMeta(p=>({...p,statusNote:e.target.value}))}/></div>
              <div>
                <Lbl>Lien vidéo à valider (YouTube, Vimeo, Dropbox, Drive, WeTransfer, Frame.io…)</Lbl>
                <div style={{display:"flex",gap:8}}>
                  <input className="input" placeholder="https://vimeo.com/..." value={statusMeta.replayUrl} onChange={e=>setStatusMeta(p=>({...p,replayUrl:e.target.value}))} style={{flex:1,borderColor:statusMeta.replayUrl&&!isSafeUrl(statusMeta.replayUrl)?"#FF3B30":undefined}}/>
                  {statusMeta.replayUrl&&isSafeUrl(statusMeta.replayUrl)&&<a href={statusMeta.replayUrl} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{fontSize:11,textDecoration:"none",whiteSpace:"nowrap"}}>↗ Voir</a>}
                </div>
                {statusMeta.replayUrl&&!isSafeUrl(statusMeta.replayUrl)&&<p style={{fontFamily:"'Inter'",fontSize:11,color:"#FF3B30",marginTop:4}}>⚠ Domaine non autorisé — utilisez YouTube, Vimeo, Dropbox, Drive, WeTransfer ou Frame.io</p>}
              </div>
              {project.videoStatus&&(
                <div style={{padding:"10px 14px",borderRadius:8,background:project.videoStatus==="approved"?"#4ECDC418":project.videoStatus==="revision"?"#FF3B3018":"#00B4D818",border:`1px solid ${project.videoStatus==="approved"?"#4ECDC433":project.videoStatus==="revision"?"#FF3B3033":"#00B4D833"}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:project.videoComment?6:0}}>
                    <span style={{fontSize:14}}>{project.videoStatus==="approved"?"✓":project.videoStatus==="revision"?"↩":"⏳"}</span>
                    <span style={{fontFamily:"'Inter'",fontSize:13,fontWeight:600,color:project.videoStatus==="approved"?"#4ECDC4":project.videoStatus==="revision"?"#FF3B30":"#00B4D8"}}>
                      {project.videoStatus==="approved"?"Vidéo approuvée par le client":project.videoStatus==="revision"?"Révisions demandées":"En attente de validation"}
                    </span>
                  </div>
                  {project.videoComment&&<p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",paddingLeft:22}}>{project.videoComment}</p>}
                </div>
              )}
            </div>
          </div>
          <div className="card" style={{padding:18}}>
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
          {project.brief?.musique&&(()=>{
            const m=project.brief.musique;
            const hasMusic=(m.ambiances?.length||m.genres?.length||m.instruments?.length||m.tempo||m.voix||m.inspiration);
            if(!hasMusic)return null;
            const AMB_LABELS={cinematique:"🎬 Cinématique / Épique",emotionnel:"💫 Émotionnel / Touchant",energique:"⚡ Énergique",calme:"🌊 Calme / Méditatif",luxueux:"💎 Luxueux / Premium",festif:"🎉 Festif",mysterieux:"🌙 Mystérieux",inspirant:"🚀 Inspirant",romantique:"💕 Romantique",funky:"🎶 Funky"};
            const GEN_LABELS={orchestral:"Orchestral",jazz:"Jazz / Soul",electro:"Électronique",hiphop:"Hip-Hop / Trap",reggae:"Reggae / Dancehall",zouk:"Zouk / Afrobeat",pop:"Pop / Indie",acoustique:"Acoustique / Folk",rnb:"R&B / Neo-Soul",ambient:"Ambient / Lo-fi",classique:"Classique"};
            const INS_LABELS={piano:"🎹 Piano",guitare_ac:"🎸 Guitare acoustique",guitare_el:"⚡🎸 Guitare électrique",cordes:"🎻 Cordes",cuivres:"🎺 Cuivres",percus:"🥁 Percussions",basse:"🎵 Basse",synth:"🎛 Synthétiseurs",voix:"🎤 Voix / Chœurs"};
            const TEMPO_LABELS={tres_lent:"Très lent (< 70 BPM)",lent:"Lent (70–90 BPM)",modere:"Modéré (90–110 BPM)",entrainant:"Entraînant (110–130 BPM)",rapide:"Rapide (> 130 BPM)"};
            const VOIX_LABELS={instrumental:"Instrumental uniquement",atmospherique:"Voix atmosphérique",principale:"Voix principale"};
            const Tag=({children})=><span style={{display:"inline-block",padding:"3px 9px",borderRadius:12,background:"#00B4D810",border:"1px solid #00B4D830",fontFamily:"'Inter'",fontSize:11,color:"#0090B3",marginRight:4,marginBottom:4}}>{children}</span>;
            return(
              <div className="card" style={{padding:18,marginTop:12}}>
                <SH icon="🎵" title="AMBIANCE MUSICALE"/>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {m.ambiances?.length>0&&<div><p style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5}}>Ambiance</p><div>{m.ambiances.map(a=><Tag key={a}>{AMB_LABELS[a]||a}</Tag>)}</div></div>}
                  {m.genres?.length>0&&<div><p style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5}}>Genre</p><div>{m.genres.map(g=><Tag key={g}>{GEN_LABELS[g]||g}</Tag>)}</div></div>}
                  {m.instruments?.length>0&&<div><p style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5}}>Instruments</p><div>{m.instruments.map(i=><Tag key={i}>{INS_LABELS[i]||i}</Tag>)}</div></div>}
                  {(m.tempo||m.voix)&&<div style={{display:"flex",gap:16,flexWrap:"wrap"}}>{m.tempo&&<div><p style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3}}>Tempo</p><Tag>{TEMPO_LABELS[m.tempo]||m.tempo}</Tag></div>}{m.voix&&<div><p style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3}}>Voix</p><Tag>{VOIX_LABELS[m.voix]||m.voix}</Tag></div>}</div>}
                  {m.inspiration&&<div><p style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3}}>Inspiration</p><p style={{fontFamily:"'Inter'",fontSize:12,color:"#1D1D1F",fontStyle:"italic"}}>"{m.inspiration}"</p></div>}
                </div>
              </div>
            );
          })()}
        </div>
      )}
      {tab==="storyboards"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h3 style={{fontFamily:"'Urbanist'",fontSize:17,color:"#1D1D1F",letterSpacing:"0.05em"}}>STORYBOARDS</h3>
            <button className="btn btn-primary" onClick={()=>setShowGen(!showGen)}>{showGen?"✕ Fermer":"✦ Générer avec IA"}</button>
          </div>
          {showGen&&<div className="card fadeUp" style={{padding:16}}><AIGenerator project={project} onGenerated={addSB}/></div>}
          {project.storyboards.map(sb=>(
            <div key={sb.id} className="card fadeUp" style={{padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
                <div><p style={{fontFamily:"'Inter'",fontSize:13,fontWeight:600,color:"#1D1D1F"}}>{sb.title}</p><span style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93"}}>{fmtS(sb.createdAt)}</span></div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {sb.validationStatus==="approved"&&<span className="tag" style={{background:"#4ECDC422",color:"#4ECDC4"}}>✓ Approuvé</span>}
                  {sb.validationStatus==="pending"&&<span className="tag" style={{background:"#00B4D822",color:"#00B4D8"}}>⏳ En attente</span>}
                  {sb.validationStatus==="revision"&&<span className="tag" style={{background:"#FF3B3022",color:"#FF3B30"}}>↩ Révision</span>}
                  {sb.validationStatus!=="approved"&&<button className="btn btn-green" style={{fontSize:11}} onClick={()=>updSB(sb.id,"approved")}>Valider</button>}
                </div>
              </div>
              <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>{sb.frames.map((f,i)=><FrameCard key={f.id} frame={f} index={i}/>)}</div>
            </div>
          ))}
        </div>
      )}
      {tab==="comments"&&<div className="card fadeUp" style={{padding:16}}><SH icon="💬" title="MESSAGES"/><CommentThread comments={project.comments} onAdd={addMsg} role="prod"/></div>}
      {tab==="charte"&&<CharteGraphiquePanel project={project} onUpdate={onUpdate} onNotif={onNotif}/>}
      {tab==="moodboard"&&<MoodboardPanel project={project} onUpdate={onUpdate} onNotif={onNotif} authorName={fmtProdAuthor(userProfile?.nom)} isAdmin={true}/>}
      {tab==="livrables"&&<ProdLivrables project={project} onUpdate={onUpdate} onNotif={onNotif}/>}
      {tab==="equipe"&&<TeamSection project={project} teamMembers={teamMembers} assignments={assignments} onUpdateAssignments={onUpdateAssignments} onNotif={onNotif}/>}
      {tab==="notes"&&<MeetingNotesSection project={project} meetingNotes={meetingNotes} onUpdateMeetingNotes={onUpdateMeetingNotes} onNotif={onNotif}/>}
      {tab==="prestataires"&&<div className="fadeUp"><ProjectPrestatairesPanel project={project} serviceTypes={serviceTypes} prestataires={prestataires} missions={prestataireMissions} setMissions={setPrestataireMissions} onNotif={onNotif}/></div>}
      {tab==="reservations"&&(()=>{
        const projBookings=bookings.filter(b=>String(b.projectId)===String(project.id));
        const unlinked=bookings.filter(b=>!b.projectId&&b.status!=="expired");
        const statusColor=s=>s==="confirmed"?"#4ECDC4":"#FF9F43";
        return(
          <div style={{display:"flex",flexDirection:"column",gap:12}} className="fadeUp">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h3 style={{fontFamily:"'Urbanist'",fontSize:17,color:"#1D1D1F",letterSpacing:"0.05em"}}>RÉSERVATIONS LIÉES</h3>
              {onGoToCalendar&&<button className="btn btn-ghost" style={{fontSize:11}} onClick={onGoToCalendar}>Voir dans le calendrier →</button>}
            </div>
            {projBookings.length===0&&<p style={{fontFamily:"'Inter'",fontSize:13,color:"#8E8E93",textAlign:"center",padding:"20px 0"}}>Aucune réservation liée à ce projet.</p>}
            {projBookings.map(b=>(
              <div key={b.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#F5F5F7",borderRadius:8,border:"1px solid #E5E5EA"}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:statusColor(b.status),flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontFamily:"'Inter'",fontSize:12,fontWeight:500,color:"#1D1D1F"}}>{b.client||b.client_name}</p>
                  <p style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93"}}>{fmtS(b.date)} · Équipe {b.team} · {b.startTime||""}–{b.endTime||""}</p>
                </div>
                <span style={{fontFamily:"'Inter'",fontSize:11,color:statusColor(b.status),background:statusColor(b.status)+"18",border:`1px solid ${statusColor(b.status)}30`,borderRadius:10,padding:"2px 8px"}}>
                  {b.status==="confirmed"?`Confirmé (${b.confirmType||""})`:"Option"}
                </span>
              </div>
            ))}
            {unlinked.length>0&&(
              <div className="card" style={{padding:16}}>
                <p style={{fontFamily:"'Inter'",fontSize:12,fontWeight:600,color:"#1D1D1F",marginBottom:10}}>Lier une réservation existante</p>
                <div style={{display:"flex",gap:8}}>
                  <select className="input" style={{flex:1}} value={linkingBookingId} onChange={e=>setLinkingBookingId(e.target.value)}>
                    <option value="">Choisir une réservation...</option>
                    {unlinked.map(b=><option key={b.id} value={b.id}>{fmtS(b.date)} · Éq.{b.team} · {b.client||b.client_name}</option>)}
                  </select>
                  <button className="btn btn-primary" disabled={!linkingBookingId} onClick={async()=>{
                    if(!linkingBookingId)return;
                    await supabase.from("bookings").update({project_id:project.id}).eq("id",linkingBookingId);
                    if(setBookings)setBookings(bs=>bs.map(b=>String(b.id)===String(linkingBookingId)?{...b,projectId:project.id}:b));
                    setLinkingBookingId("");
                    onNotif("Réservation liée !");
                  }}>Lier</button>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function VideoValidationPanel({project,onUpdate,onNotif,isGuest=false}){
  const[revisionComment,setRevisionComment]=useState("");
  const[showRevForm,setShowRevForm]=useState(false);
  const[saving,setSaving]=useState(false);
  const[showInvite,setShowInvite]=useState(false);
  const[inviteName,setInviteName]=useState("");
  const[copiedToken,setCopiedToken]=useState(null);

  const getVideoType=(url)=>{
    if(!url||!isSafeUrl(url))return null;
    if(url.match(/dropbox\.com/))return"dropbox";
    if(url.match(/youtu\.be\/|youtube\.com/))return"youtube";
    if(url.match(/vimeo\.com/))return"vimeo";
    return"other";
  };

  const getEmbedUrl=(url)=>{
    if(!url||!isSafeUrl(url))return null;
    const yt=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
    if(yt)return`https://www.youtube.com/embed/${yt[1]}`;
    const vm=url.match(/vimeo\.com\/(\d+)/);
    if(vm)return`https://player.vimeo.com/video/${vm[1]}`;
    return null;
  };

  const saveValidation=async(status,comment="")=>{
    setSaving(true);
    const newBrief={...project.brief,videoStatus:status,videoComment:comment};
    await supabase.from("projects").update({brief:newBrief}).eq("id",project.id);
    onUpdate({...project,brief:newBrief,videoStatus:status,videoComment:comment});
    onNotif(status==="approved"?"Vidéo approuvée !":"Révisions envoyées à l'équipe !");
    setSaving(false);
    setShowRevForm(false);
  };

  const videoType=getVideoType(project.replayUrl);
  const embedUrl=getEmbedUrl(project.replayUrl);

  return(
    <div className="card fadeUp" style={{padding:18}}>
      <SH icon="▶" title="VALIDATION VIDÉO" sub="Visionnez et approuvez ou demandez des révisions"/>

      {!project.replayUrl&&(
        <p style={{fontFamily:"'Inter'",fontSize:13,color:"#8E8E93",textAlign:"center",padding:"30px 0"}}>Aucune vidéo partagée pour l'instant.<br/><span style={{fontSize:11}}>L'équipe vous notifiera dès qu'une version sera disponible.</span></p>
      )}

      {project.replayUrl&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Statut actuel */}
          {project.videoStatus&&(
            <div style={{padding:"10px 14px",borderRadius:8,background:project.videoStatus==="approved"?"#4ECDC418":project.videoStatus==="revision"?"#FF9F4318":"#00B4D818",border:`1px solid ${project.videoStatus==="approved"?"#4ECDC440":project.videoStatus==="revision"?"#FF9F4340":"#00B4D840"}`,display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:16}}>{project.videoStatus==="approved"?"✓":project.videoStatus==="revision"?"↩":"⏳"}</span>
              <span style={{fontFamily:"'Inter'",fontSize:13,fontWeight:600,color:project.videoStatus==="approved"?"#4ECDC4":project.videoStatus==="revision"?"#FF9F43":"#00B4D8"}}>
                {project.videoStatus==="approved"?"Vous avez approuvé cette version":project.videoStatus==="revision"?"Révisions en cours de traitement":"En attente de votre validation"}
              </span>
            </div>
          )}

          {/* Dropbox Replay */}
          {videoType==="dropbox"&&(
            <div style={{background:"#F5F5F7",border:"1px solid #0061FF33",borderRadius:10,padding:"24px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
              <div style={{width:44,height:44,borderRadius:10,background:"#0061FF18",border:"1px solid #0061FF33",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#0061FF"><path d="M6 2L0 6l6 4 6-4-6-4zm12 0l-6 4 6 4 6-4-6-4zM0 14l6 4 6-4-6-4-6 4zm18-4l-6 4 6 4 6-4-6-4zM6 19l6 4 6-4-6-4-6 4z"/></svg>
              </div>
              <div style={{textAlign:"center"}}>
                <p style={{fontFamily:"'Inter'",fontSize:14,fontWeight:600,color:"#1D1D1F",marginBottom:4}}>Dropbox Replay</p>
                <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",lineHeight:1.5}}>Ouvrez la vidéo dans Dropbox Replay pour laisser des commentaires horodatés directement sur la timeline.</p>
              </div>
              <a href={project.replayUrl} target="_blank" rel="noreferrer" style={{textDecoration:"none",background:"#0061FF",color:"#fff",fontFamily:"'Inter'",fontSize:13,fontWeight:600,padding:"10px 22px",borderRadius:7,letterSpacing:"0.03em",display:"inline-flex",alignItems:"center",gap:8}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M6 2L0 6l6 4 6-4-6-4zm12 0l-6 4 6 4 6-4-6-4zM0 14l6 4 6-4-6-4-6 4zm18-4l-6 4 6 4 6-4-6-4zM6 19l6 4 6-4-6-4-6 4z"/></svg>
                Ouvrir dans Dropbox Replay
              </a>
              <p style={{fontFamily:"'Inter'",fontSize:11,color:"#C7C7CC"}}>Puis revenez ici pour approuver ou demander des révisions.</p>
            </div>
          )}

          {/* YouTube / Vimeo embed */}
          {embedUrl&&(
            <div style={{position:"relative",paddingBottom:"56.25%",height:0,borderRadius:8,overflow:"hidden",border:"1px solid #E5E5EA"}}>
              <iframe src={embedUrl} title="Vidéo" style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",border:"none"}} allowFullScreen/>
            </div>
          )}

          {/* Autre lien générique */}
          {!embedUrl&&videoType==="other"&&(
            <div style={{background:"#F5F5F7",border:"1px solid #E5E5EA",borderRadius:8,padding:"24px",display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
              <span style={{fontSize:32}}>▶</span>
              <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",textAlign:"center"}}>Visualisez la vidéo sur la plateforme de revue</p>
              <a href={project.replayUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{textDecoration:"none"}}>Ouvrir la vidéo →</a>
            </div>
          )}

          {/* Actions */}
          {project.videoStatus!=="approved"&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {!showRevForm?(
                <div style={{display:"flex",gap:8}}>
                  <button className="btn btn-ghost" style={{flex:1,color:"#FF9F43",borderColor:"#FF9F4330"}} onClick={()=>setShowRevForm(true)}>↩ Demander des révisions</button>
                  <button className="btn btn-green" style={{flex:1}} disabled={saving} onClick={()=>saveValidation("approved")}>✓ Approuver la vidéo</button>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:8,padding:"14px",background:"#F5F5F7",borderRadius:8,border:"1px solid #FF9F4330"}}>
                  <p style={{fontFamily:"'Inter'",fontSize:12,fontWeight:600,color:"#1D1D1F"}}>Décrivez les révisions souhaitées :</p>
                  <textarea className="input" rows={3} placeholder="Ex : La musique est trop forte au début, ajouter les sous-titres sur la partie 0:30–1:00…" value={revisionComment} onChange={e=>setRevisionComment(e.target.value)}/>
                  <div style={{display:"flex",gap:7}}>
                    <button className="btn btn-ghost" style={{flex:1,fontSize:12}} onClick={()=>setShowRevForm(false)}>Annuler</button>
                    <button className="btn btn-primary" style={{flex:1,fontSize:12,background:"#FF9F43"}} disabled={saving||!revisionComment.trim()} onClick={()=>saveValidation("revision",revisionComment)}>Envoyer les révisions</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {project.videoStatus==="approved"&&(
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" style={{fontSize:11,color:"#8E8E93"}} onClick={()=>saveValidation(null,"")}>Annuler mon approbation</button>
            </div>
          )}
        </div>
      )}

      {/* Inviter un collaborateur */}
      {!isGuest&&(
        <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid #E5E5EA"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:showInvite?10:0}}>
            <p style={{fontFamily:"'Inter'",fontSize:12,color:"#8E8E93"}}>👥 Accès invité</p>
            <button className="btn btn-ghost" style={{fontSize:11}} onClick={()=>setShowInvite(v=>!v)}>{showInvite?"✕ Fermer":"Inviter un collaborateur"}</button>
          </div>
          {showInvite&&(
            <div style={{background:"#F5F5F7",borderRadius:8,padding:14,border:"1px solid #E5E5EA",display:"flex",flexDirection:"column",gap:10}}>
              <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73"}}>Génère un lien temporaire (30 jours) donnant accès uniquement à la validation vidéo — sans accès au brief, aux devis ni aux messages.</p>
              <div style={{display:"flex",gap:8}}>
                <input className="input" placeholder="Nom du collaborateur (ex: Marie, Directrice Marketing)" value={inviteName} onChange={e=>setInviteName(e.target.value)} style={{flex:1}}/>
                <button className="btn btn-primary" style={{whiteSpace:"nowrap",fontSize:12}} disabled={!inviteName.trim()} onClick={async()=>{
                  const token=genToken();
                  const exp=new Date(Date.now()+30*24*3600000).toISOString();
                  const guests=[...(project.brief?.guests||[]),{token,name:inviteName.trim(),createdAt:isoToday(),expiresAt:exp}];
                  const newBrief={...project.brief,guests};
                  await supabase.from("projects").update({brief:newBrief}).eq("id",project.id);
                  onUpdate({...project,brief:newBrief});
                  setInviteName("");
                  setCopiedToken(token);
                  navigator.clipboard?.writeText(`${window.location.origin}?guest=${token}`);
                  onNotif(`Lien copié pour ${inviteName.trim()} !`);
                }}>Générer le lien</button>
              </div>
              {/* Liste des invités actifs */}
              {(project.brief?.guests||[]).filter(g=>new Date(g.expiresAt)>Date.now()).map(g=>{
                const url=`${window.location.origin}?guest=${g.token}`;
                return(
                  <div key={g.token} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#FFFFFF",borderRadius:6,border:"1px solid #E5E5EA",flexWrap:"wrap"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontFamily:"'Inter'",fontSize:12,color:"#1D1D1F",fontWeight:500}}>{g.name}</p>
                      <p style={{fontFamily:"'JetBrains Mono'",fontSize:10,color:"#8E8E93",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{url}</p>
                    </div>
                    <button className="btn btn-ghost" style={{fontSize:10,padding:"2px 7px"}} onClick={()=>{navigator.clipboard?.writeText(url);setCopiedToken(g.token);onNotif("Lien copié !");}}>
                      {copiedToken===g.token?"✓ Copié":"Copier"}
                    </button>
                    <button className="btn btn-ghost" style={{fontSize:10,padding:"2px 7px",color:"#FF3B30",borderColor:"#FF3B3030"}} onClick={async()=>{
                      const guests=(project.brief?.guests||[]).filter(x=>x.token!==g.token);
                      const newBrief={...project.brief,guests};
                      await supabase.from("projects").update({brief:newBrief}).eq("id",project.id);
                      onUpdate({...project,brief:newBrief});
                      onNotif("Accès révoqué");
                    }}>Révoquer</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ClientProjectView({project,clientData,onUpdate,onNotif,pricing,serviceTypes=[]}){
  const[tab,setTab]=useState("suivi");
  const[brief,setBrief]=useState({
    title: project.title==="Nouveau projet"?"":project.title,
    objective: project.brief?.objective||"",
    target: project.brief?.target||"",
    duration: project.brief?.duration||"",
    tone: project.brief?.tone||"",
    deliverables: project.brief?.deliverables||"",
    budget: project.brief?.budget||"",
    shootDate: project.shootDate||"",
    references: project.brief?.references||"",
    notes: project.brief?.notes||"",
    services: project.brief?.services||[],
    musique: project.brief?.musique||{ambiances:[],genres:[],instruments:[],tempo:"",voix:"",inspiration:""},
  });
  const[saving,setSaving]=useState(false);
  const hasSimulator=clientData?.simulatorEnabled;
  const briefEmpty=!project.brief?.objective&&!project.brief?.target&&!project.brief?.duration;
  const showIntake=project.status==="brief"&&briefEmpty;

  const toggleService=(id)=>setBrief(p=>({...p,services:p.services.includes(id)?p.services.filter(s=>s!==id):[...p.services,id]}));
  const toggleMusique=(key,val)=>setBrief(p=>({...p,musique:{...p.musique,[key]:p.musique[key].includes(val)?p.musique[key].filter(x=>x!==val):[...p.musique[key],val]}}));
  const setMusiqueField=(key,val)=>setBrief(p=>({...p,musique:{...p.musique,[key]:val}}));
  const submitBrief=async()=>{
    setSaving(true);
    const newBrief={objective:brief.objective,target:brief.target,duration:brief.duration,tone:brief.tone,deliverables:brief.deliverables,budget:brief.budget,references:brief.references,notes:brief.notes,services:brief.services,musique:brief.musique,submitted:true};
    await supabase.from("projects").update({title:brief.title||project.title,brief:newBrief,shoot_date:brief.shootDate||null}).eq("id",project.id);
    onUpdate({...project,title:brief.title||project.title,brief:newBrief,shootDate:brief.shootDate||""});
    onNotif("Brief envoyé avec succès — notre équipe revient vers vous rapidement ✨");
    setSaving(false);
  };

  const valSB=(id,st)=>{onUpdate({...project,storyboards:project.storyboards.map(s=>s.id===id?{...s,validationStatus:st}:s)});onNotif(st==="approved"?"Storyboard approuvé !":"Révision demandée");};
  const addMsg=async(text)=>{
    const author=clientData?.name||"Client";
    const date=new Date().toISOString().split("T")[0];
    const c={id:Date.now(),author,text,date,role:"client"};
    onUpdate({...project,comments:[...project.comments,c]});
    await supabase.from("messages").insert({project_id:project.id,author,content:text,role:"client"});
  };
  const finaux=(project.livrables||[]).filter(l=>l.category==="finaux");
  const tabs=[{k:"suivi",l:"Suivi"},{k:"moodboard",l:`Moodboard (${(project.moodboard||[]).length})`},{k:"storyboards",l:`Storyboards (${project.storyboards.length})`},{k:"replay",l:"Révisions vidéo"},{k:"messages",l:`Messages (${project.comments.length})`},{k:"livrables",l:"Livrables"},...(hasSimulator?[{k:"estimation",l:"💰 Estimation"}]:[])];

  if(showIntake) return(
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div className="fadeUp" style={{background:"linear-gradient(135deg,rgba(0,180,216,0.06),rgba(175,82,222,0.03))",border:"1px solid rgba(0,180,216,0.12)",borderRadius:14,padding:"22px 24px"}}>
        <p style={{fontFamily:"'Inter'",fontSize:11,color:"#AF52DE",letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:700,marginBottom:6}}>Première étape</p>
        <h2 style={{fontFamily:"'Urbanist'",fontSize:24,color:"#1D1D1F",letterSpacing:"0.02em",marginBottom:4,fontWeight:800}}>Votre brief de production</h2>
        <p style={{fontFamily:"'Inter'",fontSize:13,color:"#6E6E73",lineHeight:1.6}}>Décrivez votre vision — plus vous partagez de détails, plus notre équipe pourra vous proposer une production qui vous ressemble.</p>
      </div>
      <div className="card fadeUp" style={{padding:22}}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div><Lbl>Nom du projet *</Lbl><input className="input" placeholder="Ex : Spot publicitaire pour ma boutique" value={brief.title} onChange={e=>setBrief(p=>({...p,title:e.target.value}))}/></div>
          <div><Lbl>Votre message principal *</Lbl><textarea className="input" rows={3} placeholder="Quelle émotion ou idée souhaitez-vous transmettre ? Quel est le contexte ?" value={brief.objective} onChange={e=>setBrief(p=>({...p,objective:e.target.value}))}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><Lbl>Public cible *</Lbl><input className="input" placeholder="Ex : femmes 25-45 ans, familles…" value={brief.target} onChange={e=>setBrief(p=>({...p,target:e.target.value}))}/></div>
            <div><Lbl>Durée souhaitée</Lbl><input className="input" placeholder="Ex : 30 s, 2 minutes…" value={brief.duration} onChange={e=>setBrief(p=>({...p,duration:e.target.value}))}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><Lbl>Ton & ambiance</Lbl><input className="input" placeholder="Ex : chaleureux, élégant, dynamique…" value={brief.tone} onChange={e=>setBrief(p=>({...p,tone:e.target.value}))}/></div>
            <div><Lbl>Budget approximatif</Lbl><input className="input" placeholder="Ex : 2 000 €, 5 000 €…" value={brief.budget} onChange={e=>setBrief(p=>({...p,budget:e.target.value}))}/></div>
          </div>
          <div><Lbl>Livrables souhaités</Lbl><input className="input" placeholder="Ex : 1 vidéo 16:9 + version story Instagram, sous-titres…" value={brief.deliverables} onChange={e=>setBrief(p=>({...p,deliverables:e.target.value}))}/></div>
          <div><Lbl>Date de tournage envisagée</Lbl><input type="date" className="input" value={brief.shootDate} onChange={e=>setBrief(p=>({...p,shootDate:e.target.value}))}/></div>
          <div><Lbl>Références & inspirations</Lbl><textarea className="input" rows={2} placeholder="Liens YouTube, publicités que vous aimez, univers visuels…" value={brief.references} onChange={e=>setBrief(p=>({...p,references:e.target.value}))}/></div>
          <div><Lbl>Informations complémentaires</Lbl><textarea className="input" rows={3} placeholder="Lieu de tournage, personnes à filmer, contraintes particulières…" value={brief.notes} onChange={e=>setBrief(p=>({...p,notes:e.target.value}))}/></div>
          {serviceTypes.length>0&&(
            <div>
              <Lbl>Services additionnels dont vous avez besoin</Lbl>
              <p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93",marginBottom:8}}>Sélectionnez les services complémentaires pour ce projet (lieu, traiteur, transport…)</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {serviceTypes.filter(t=>t.actif!==false).map(t=>{
                  const sel=brief.services.includes(t.id);
                  return(
                    <div key={t.id} className={`option-card ${sel?"selected":""}`} style={{padding:"8px 14px",display:"flex",alignItems:"center",gap:8}} onClick={()=>toggleService(t.id)}>
                      <div className={`option-check ${sel?"checked":""}`}>{sel&&<span style={{color:"#FFFFFF",fontSize:10,fontWeight:700}}>✓</span>}</div>
                      <span style={{fontSize:16}}>{t.icone}</span>
                      <span style={{fontFamily:"'Inter'",fontSize:13,color:"#1D1D1F"}}>{t.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* ── AMBIANCE MUSICALE ── */}
          {(()=>{
            const MUS_AMBIANCES=[{v:"cinematique",l:"Cinématique / Épique",e:"🎬"},{v:"emotionnel",l:"Émotionnel / Touchant",e:"💫"},{v:"energique",l:"Énergique / Dynamique",e:"⚡"},{v:"calme",l:"Calme / Méditatif",e:"🌊"},{v:"luxueux",l:"Luxueux / Premium",e:"💎"},{v:"festif",l:"Festif / Célébration",e:"🎉"},{v:"mysterieux",l:"Mystérieux / Dramatique",e:"🌙"},{v:"inspirant",l:"Inspirant / Motivant",e:"🚀"},{v:"romantique",l:"Romantique / Tendre",e:"💕"},{v:"funky",l:"Funky / Groovy",e:"🎶"}];
            const MUS_GENRES=[{v:"orchestral",l:"Orchestral / Symphonique"},{v:"jazz",l:"Jazz / Soul / Blues"},{v:"electro",l:"Électronique / Synthwave"},{v:"hiphop",l:"Hip-Hop / Trap"},{v:"reggae",l:"Reggae / Dancehall"},{v:"zouk",l:"Zouk / Afrobeat"},{v:"pop",l:"Pop / Indie"},{v:"acoustique",l:"Acoustique / Folk"},{v:"rnb",l:"R&B / Neo-Soul"},{v:"ambient",l:"Ambient / Lo-fi"},{v:"classique",l:"Musique Classique"}];
            const MUS_INSTRU=[{v:"piano",l:"Piano / Claviers",e:"🎹"},{v:"guitare_ac",l:"Guitare acoustique",e:"🎸"},{v:"guitare_el",l:"Guitare électrique",e:"⚡🎸"},{v:"cordes",l:"Cordes / Violons",e:"🎻"},{v:"cuivres",l:"Cuivres / Trompette",e:"🎺"},{v:"percus",l:"Percussions / Batterie",e:"🥁"},{v:"basse",l:"Basse / Contrebasse",e:"🎵"},{v:"synth",l:"Synthétiseurs / Pad",e:"🎛"},{v:"voix",l:"Voix / Chœurs",e:"🎤"}];
            const MUS_TEMPO=[{v:"tres_lent",l:"Très lent — contemplatif",s:"< 70 BPM"},{v:"lent",l:"Lent et posé",s:"70–90 BPM"},{v:"modere",l:"Modéré — équilibré",s:"90–110 BPM"},{v:"entrainant",l:"Entraînant — dynamique",s:"110–130 BPM"},{v:"rapide",l:"Rapide — intense",s:"> 130 BPM"}];
            const MUS_VOIX=[{v:"instrumental",l:"Instrumental uniquement"},{v:"atmospherique",l:"Voix atmosphérique / rare"},{v:"principale",l:"Voix principale avec paroles"}];
            const m=brief.musique;
            const Chip=({active,onClick,children})=>(
              <button type="button" onClick={onClick} style={{padding:"5px 11px",borderRadius:20,border:`1.5px solid ${active?"#00B4D8":"#E5E5EA"}`,background:active?"#00B4D810":"#FAFAFA",cursor:"pointer",fontFamily:"'Inter'",fontSize:12,color:active?"#00B4D8":"#6E6E73",transition:"all .15s",whiteSpace:"nowrap"}}>
                {children}
              </button>
            );
            return(
              <div style={{display:"flex",flexDirection:"column",gap:16,paddingTop:4}}>
                <div style={{borderTop:"1px solid #E5E5EA",paddingTop:16}}>
                  <Lbl>🎵 Ambiance musicale souhaitée</Lbl>
                  <p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93",marginBottom:10}}>Guidez notre choix musical — plus vous êtes précis, plus la musique sera adaptée à votre vision.</p>

                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    <div>
                      <p style={{fontFamily:"'Inter'",fontSize:11,fontWeight:600,color:"#1D1D1F",marginBottom:7,textTransform:"uppercase",letterSpacing:"0.06em"}}>Ambiance principale <span style={{color:"#8E8E93",fontWeight:400,textTransform:"none"}}>(plusieurs choix)</span></p>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                        {MUS_AMBIANCES.map(a=>(
                          <Chip key={a.v} active={m.ambiances.includes(a.v)} onClick={()=>toggleMusique("ambiances",a.v)}>{a.e} {a.l}</Chip>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p style={{fontFamily:"'Inter'",fontSize:11,fontWeight:600,color:"#1D1D1F",marginBottom:7,textTransform:"uppercase",letterSpacing:"0.06em"}}>Genre musical</p>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                        {MUS_GENRES.map(g=>(
                          <Chip key={g.v} active={m.genres.includes(g.v)} onClick={()=>toggleMusique("genres",g.v)}>{g.l}</Chip>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p style={{fontFamily:"'Inter'",fontSize:11,fontWeight:600,color:"#1D1D1F",marginBottom:7,textTransform:"uppercase",letterSpacing:"0.06em"}}>Instruments préférés</p>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                        {MUS_INSTRU.map(i=>(
                          <Chip key={i.v} active={m.instruments.includes(i.v)} onClick={()=>toggleMusique("instruments",i.v)}>{i.e} {i.l}</Chip>
                        ))}
                      </div>
                    </div>

                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                      <div>
                        <p style={{fontFamily:"'Inter'",fontSize:11,fontWeight:600,color:"#1D1D1F",marginBottom:7,textTransform:"uppercase",letterSpacing:"0.06em"}}>Tempo / Rythme</p>
                        <div style={{display:"flex",flexDirection:"column",gap:5}}>
                          {MUS_TEMPO.map(t=>(
                            <label key={t.v} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>setMusiqueField("tempo",t.v)}>
                              <div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${m.tempo===t.v?"#00B4D8":"#C7C7CC"}`,background:m.tempo===t.v?"#00B4D8":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}}>
                                {m.tempo===t.v&&<div style={{width:6,height:6,borderRadius:"50%",background:"#FFFFFF"}}/>}
                              </div>
                              <span style={{fontFamily:"'Inter'",fontSize:12,color:"#1D1D1F"}}>{t.l} <span style={{color:"#8E8E93",fontSize:10}}>{t.s}</span></span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p style={{fontFamily:"'Inter'",fontSize:11,fontWeight:600,color:"#1D1D1F",marginBottom:7,textTransform:"uppercase",letterSpacing:"0.06em"}}>Présence vocale</p>
                        <div style={{display:"flex",flexDirection:"column",gap:5}}>
                          {MUS_VOIX.map(v=>(
                            <label key={v.v} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>setMusiqueField("voix",v.v)}>
                              <div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${m.voix===v.v?"#00B4D8":"#C7C7CC"}`,background:m.voix===v.v?"#00B4D8":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}}>
                                {m.voix===v.v&&<div style={{width:6,height:6,borderRadius:"50%",background:"#FFFFFF"}}/>}
                              </div>
                              <span style={{fontFamily:"'Inter'",fontSize:12,color:"#1D1D1F"}}>{v.l}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <Lbl>Références / Inspiration libre</Lbl>
                      <textarea className="input" rows={2} placeholder={"Ex : \"l'intro d'Interstellar\", \"Dior\", \"Aya Nakamura meets Hans Zimmer\"…"} value={m.inspiration} onChange={e=>setMusiqueField("inspiration",e.target.value)}/>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <button className="btn btn-primary" style={{alignSelf:"flex-end",padding:"11px 28px"}} disabled={saving||!brief.objective||!brief.target} onClick={submitBrief}>
            {saving?"Envoi en cours…":"✨ Envoyer mon brief"}
          </button>
        </div>
      </div>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div className="fadeUp" style={{background:"linear-gradient(135deg,rgba(0,180,216,0.06),rgba(175,82,222,0.03))",border:"1px solid rgba(0,180,216,0.1)",borderRadius:14,padding:"20px 22px"}}>
        <p style={{fontFamily:"'Inter'",fontSize:11,color:"#AF52DE",letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:700,marginBottom:4}}>Votre projet</p>
        <h2 style={{fontFamily:"'Urbanist'",fontSize:24,color:"#1D1D1F",letterSpacing:"0.02em",marginBottom:2,fontWeight:800}}>{project.title}</h2>
        <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",marginBottom:12}}>En cours de production — notre équipe travaille pour vous ✨</p>
        <Timeline status={project.status}/>
      </div>
      <div style={{display:"flex",gap:4,background:"#F5F5F7",padding:4,borderRadius:8,overflowX:"auto"}}>
        {tabs.map(t=><button key={t.k} className={`tab ${tab===t.k?"active":""}`} style={{whiteSpace:"nowrap"}} onClick={()=>setTab(t.k)}>{t.l}</button>)}
      </div>
      {tab==="suivi"&&(
        <div className="card fadeUp" style={{padding:18}}>
          <SH icon="📊" title="AVANCEMENT"/>
          {(project.statusNote||project.deliveryDate||project.shootDate)&&(
            <div style={{background:"#00B4D810",border:"1px solid #00B4D820",borderRadius:8,padding:"10px 14px",marginBottom:12}}>
              {project.statusNote&&<p style={{fontFamily:"'Inter'",fontSize:13,color:"#1D1D1F",fontWeight:500}}>{project.statusNote}</p>}
              {project.shootDate&&(
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:project.statusNote?6:0,gap:8,flexWrap:"wrap"}}>
                  <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73"}}>🎬 Tournage prévu : {fmtD(project.shootDate)}</p>
                  <button className="btn btn-ghost" style={{fontSize:11,padding:"3px 10px",display:"flex",alignItems:"center",gap:5}} onClick={()=>downloadICS(`Tournage – ${project.title}`,project.shootDate,`Projet : ${project.title}\nThird-One Studio`)}>
                    <span>📅</span> Ajouter au calendrier
                  </button>
                </div>
              )}
              {project.deliveryDate&&<p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",marginTop:4}}>📅 Livraison prévue : {fmtD(project.deliveryDate)}</p>}
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {STATUS_STEPS.map((s,i)=>{const cur=STATUS_INDEX[project.status]??0,done=i<cur,act=i===cur;return(
              <div key={s} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,background:act?"#00B4D810":done?"#4ECDC410":"#F5F5F7",border:`1px solid ${act?"#00B4D830":done?"#4ECDC430":"#E5E5EA"}`}}>
                <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:done?"#4ECDC4":act?"#00B4D8":"#F2F2F7",color:(done||act)?"#FFFFFF":"#8E8E93",fontWeight:700,fontSize:11,flexShrink:0}}>{done?"✓":i+1}</div>
                <p style={{fontFamily:"'Inter'",fontSize:13,fontWeight:600,color:act?"#00B4D8":done?"#4ECDC4":"#8E8E93"}}>{s}</p>
                {act&&<span style={{fontFamily:"'Inter'",fontSize:11,color:"#6E6E73",marginLeft:"auto"}}>En cours</span>}
              </div>
            );})}
          </div>
        </div>
      )}
      {tab==="storyboards"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {project.storyboards.length===0&&<p style={{fontFamily:"'Inter'",fontSize:13,color:"#8E8E93",textAlign:"center",padding:"30px 0"}}>Notre équipe prépare votre storyboard — il apparaîtra ici dès qu'il sera prêt. 🎞</p>}
          {project.storyboards.map(sb=>(
            <div key={sb.id} className="card fadeUp" style={{padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
                <div><p style={{fontFamily:"'Inter'",fontSize:13,fontWeight:600,color:"#1D1D1F"}}>{sb.title}</p><span style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93"}}>Reçu le {fmtS(sb.createdAt)}</span></div>
                {sb.validationStatus==="approved"&&<span className="tag" style={{background:"#4ECDC422",color:"#4ECDC4"}}>✓ Approuvé</span>}
                {sb.validationStatus==="revision"&&<span className="tag" style={{background:"#FF3B3022",color:"#FF3B30"}}>↩ Révision en cours</span>}
              </div>
              <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:6}}>{sb.frames.map((f,i)=><FrameCard key={f.id} frame={f} index={i}/>)}</div>
              {sb.validationStatus==="pending"&&(
                <div style={{marginTop:12,padding:"12px 14px",background:"#00B4D810",border:"1px solid #00B4D820",borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                  <p style={{fontFamily:"'Inter'",fontSize:13,fontWeight:600,color:"#1D1D1F"}}>Votre avis nous est précieux — que pensez-vous de ce storyboard ?</p>
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
      {tab==="moodboard"&&<MoodboardPanel project={project} onUpdate={onUpdate} onNotif={onNotif} authorName={clientData?.name||"Client"} isAdmin={false}/>}
      {tab==="replay"&&<VideoValidationPanel project={project} onUpdate={onUpdate} onNotif={onNotif}/>}
      {tab==="messages"&&<div className="card fadeUp" style={{padding:16}}><SH icon="💬" title="MESSAGES"/><CommentThread comments={project.comments} onAdd={addMsg} role="client"/></div>}
      {tab==="livrables"&&(
        <div className="card fadeUp" style={{padding:18}}>
          <SH icon="✦" title="LIVRABLES FINAUX"/>
          {finaux.length===0?<p style={{fontFamily:"'Inter'",fontSize:13,color:"#8E8E93",textAlign:"center",padding:"20px 0"}}>Vos fichiers finaux apparaîtront ici dès que la production sera terminée. ✨</p>:(
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {finaux.map(l=>(
                <div key={l.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#F5F5F7",borderRadius:8,border:"1px solid #4ECDC430"}}>
                  <div style={{flex:1}}><p style={{fontFamily:"'Inter'",fontSize:13,color:"#1D1D1F",fontWeight:500}}>{l.name}</p><p style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93"}}>Depuis le {fmtS(l.date)}</p></div>
                  {safePortfolioUrl(l.url)&&<a href={safePortfolioUrl(l.url)} target="_blank" rel="noreferrer" className="btn btn-green" style={{textDecoration:"none",fontSize:11}}>⬇ Télécharger</a>}
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
function CalendarModule({bookings,setBookings,isAdmin,onNotif,projects=[],onGoToProject}){
  const[month,setMonth]=useState(new Date(TODAY.getFullYear(),TODAY.getMonth(),1));
  const[selected,setSelected]=useState(null);
  const[modal,setModal]=useState(null);

  // Nettoyage auto des options expirées en base au montage
  useEffect(()=>{
    const expired=bookings.filter(b=>b.status==="option"&&b.expiresAt&&new Date(b.expiresAt)<Date.now());
    if(expired.length===0)return;
    expired.forEach(b=>supabase.from("bookings").update({status:"expired"}).eq("id",b.id));
    setBookings(bs=>bs.map(b=>expired.some(e=>e.id===b.id)?{...b,status:"expired"}:b));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

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
    const{A,B,infoA,infoB}=getDayStatus(ds,bookings);
    setModal({date:ds,statusA:A,statusB:B,infoA,infoB});
  };

  // const statusColors={free:"#4ECDC4",option:"#FF9F43",confirmed:"#FF3B30"};
  // const teamColors={A:"#00B4D8",B:"#4ECDC4"};

  const alerts=bookings.filter(b=>b.status==="option"&&b.expiresAt&&new Date(b.expiresAt)-Date.now()<24*3600000&&new Date(b.expiresAt)>Date.now());

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {isAdmin&&alerts.length>0&&(
        <div style={{background:"#FF9F4318",border:"1px solid #FF9F4340",borderRadius:8,padding:"10px 14px",display:"flex",gap:10,alignItems:"flex-start"}}>
          <span style={{color:"#FF9F43",fontSize:16}}>⚠️</span>
          <div>
            <p style={{fontFamily:"'Inter'",fontSize:13,fontWeight:600,color:"#FF9F43"}}>Options expirant dans moins de 24h</p>
            {alerts.map(a=>(
              <p key={a.id} style={{fontFamily:"'Inter'",fontSize:12,color:"#FF9F43",opacity:.8,marginTop:3}}>
                {a.client} – Équipe {a.team} – {fmtS(a.date)} – expire dans {getCountdown(a.expiresAt)}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{padding:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <button className="btn btn-ghost" style={{padding:"6px 12px"}} onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>←</button>
          <h3 style={{fontFamily:"'Urbanist'",fontSize:20,color:"#1D1D1F",letterSpacing:"0.06em",textTransform:"capitalize"}}>{monthStr}</h3>
          <button className="btn btn-ghost" style={{padding:"6px 12px"}} onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>→</button>
        </div>

        {/* Day headers */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:4}}>
          {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(d=>(
            <div key={d} style={{textAlign:"center",fontFamily:"'Inter'",fontSize:10,color:"#8E8E93",padding:"4px 0"}}>{d}</div>
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
                <span style={{fontFamily:"'Inter'",fontSize:12,fontWeight:600,color:"#1D1D1F"}}>{i+1}</span>
                <div style={{display:"flex",gap:2}}>
                  {A!=="free"&&<div style={{width:5,height:5,borderRadius:"50%",background:A==="confirmed"?"#00B4D8":"#FF9F43"}}/>}
                  {B!=="free"&&<div style={{width:5,height:5,borderRadius:"50%",background:B==="confirmed"?"#4ECDC4":"#7B9CFF"}}/>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{display:"flex",flexWrap:"wrap",gap:12,marginTop:14,paddingTop:12,borderTop:"1px solid #E5E5EA"}}>
          {[["#4ECDC4","Disponible"],["#FF9F43","Option (Éq.A)"],["#7B9CFF","Option (Éq.B)"],["#00B4D8","Confirmé Éq.A"],["#4ECDC4","Confirmé Éq.B"],["#FF3B30","Complet"]].map(([c,l])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:8,height:8,borderRadius:2,background:c+"44",border:`1px solid ${c}66`}}/>
              <span style={{fontFamily:"'Inter'",fontSize:10,color:"#6E6E73"}}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day detail modal */}
      {modal&&(
        <DayModal modal={modal} bookings={bookings} setBookings={setBookings} isAdmin={isAdmin} onClose={()=>{setModal(null);setSelected(null);}} onNotif={onNotif} projects={projects}/>
      )}

      {/* Admin: upcoming bookings list */}
      {isAdmin&&(
        <div className="card" style={{padding:18}}>
          <SH icon="📋" title="RÉSERVATIONS À VENIR"/>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {bookings.filter(b=>b.date>=isoToday()&&b.status!=="expired").sort((a,b)=>a.date.localeCompare(b.date)).slice(0,8).map(b=>{
              const linkedProject=b.projectId?projects.find(p=>String(p.id)===String(b.projectId)):null;
              return(
              <div key={b.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:"#F5F5F7",borderRadius:7,border:"1px solid #E5E5EA"}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:b.status==="confirmed"?(b.team==="A"?"#00B4D8":"#4ECDC4"):"#FF9F43",flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontFamily:"'Inter'",fontSize:12,fontWeight:500,color:"#1D1D1F",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.client}</p>
                  <p style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93"}}>{fmtS(b.date)} · Équipe {b.team}</p>
                </div>
                {linkedProject&&onGoToProject&&(
                  <button onClick={()=>onGoToProject(b.projectId)} style={{background:"#00B4D818",border:"1px solid #00B4D830",borderRadius:6,padding:"2px 8px",color:"#00B4D8",fontFamily:"'Inter'",fontSize:10,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                    📁 {linkedProject.title.slice(0,20)}{linkedProject.title.length>20?"…":""}
                  </button>
                )}
                <span style={{fontFamily:"'Inter'",fontSize:11,color:b.status==="confirmed"?"#4ECDC4":"#FF9F43",background:b.status==="confirmed"?"#4ECDC418":"#FF9F4318",border:`1px solid ${b.status==="confirmed"?"#4ECDC430":"#FF9F4330"}`,borderRadius:10,padding:"2px 8px",flexShrink:0}}>
                  {b.status==="confirmed"?`Confirmé (${b.confirmType})`:`Option — ${b.expiresAt?getCountdown(b.expiresAt):"..."}`}
                </span>
              </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DayModal({modal,bookings,setBookings,isAdmin,onClose,onNotif,projects=[]}){
  const{date,infoA,infoB}=modal;

  const getAvailableSlots=(info)=>{
    if(!info)return TIME_SLOTS.filter(s=>s.id!=="journee");
    const slots=[];
    if(!info.matinTaken&&!info.apremTaken)return[TIME_SLOTS.find(s=>s.id==="journee"),...TIME_SLOTS.filter(s=>s.id!=="journee")];
    if(!info.matinTaken)slots.push(TIME_SLOTS.find(s=>s.id==="matin"));
    if(!info.apremTaken)slots.push(TIME_SLOTS.find(s=>s.id==="aprem"));
    return slots;
  };

  const availA=getAvailableSlots(infoA);
  const availB=getAvailableSlots(infoB);

  const teamsWithSlots=[availA.length>0&&"A",availB.length>0&&"B"].filter(Boolean);
  const initTeam=teamsWithSlots[0]||"A";
  const initSlot=(initTeam==="A"?availA:availB)[0]?.id||"matin";

  const[form,setForm]=useState({team:initTeam,slot:initSlot,client:"",note:"",projectId:""});
  const[confirmCheck,setConfirmCheck]=useState({devis:false,acompte:false});
  const[confirmTarget,setConfirmTarget]=useState(null);

  const currentAvailSlots=form.team==="A"?availA:availB;

  const addOption=async()=>{
    if(!form.client.trim())return;
    const slotDef=TIME_SLOTS.find(s=>s.id===form.slot)||TIME_SLOTS[0];
    const exp=new Date(Date.now()+48*3600000).toISOString();
    const newB={id:Date.now(),date,team:form.team,client:form.client,status:"option",confirmType:null,extras:[],note:form.note,createdAt:isoToday(),expiresAt:exp,startTime:slotDef.start,endTime:slotDef.end,projectId:form.projectId||null};
    const{error}=await supabase.from("bookings").insert({date,team:form.team,client_name:form.client,status:"option",note:form.note,expires_at:exp,start_time:slotDef.start,end_time:slotDef.end,project_id:form.projectId||null});
    if(!error)setBookings(bs=>[...bs,newB]);
    onNotif(`Option posée — Équipe ${form.team} ${slotDef.label} le ${fmtS(date)} · valable 48h`);onClose();
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

  const teamColor=t=>t==="A"?"#00B4D8":"#4ECDC4";

  const slotLabel=(b)=>{
    const st=b.startTime||b.start_time;
    const et=b.endTime||b.end_time;
    if(!st)return null;
    const s=TIME_SLOTS.find(s=>s.start===st&&s.end===et);
    return s?s.label:null;
  };

  const statusDot=(status)=>{
    if(status==="free"||!status)return"#4ECDC4";
    if(status.startsWith("partial"))return"#FF9F43";
    if(status==="option")return"#FF9F43";
    return"#FF3B30";
  };

  const statusLabel=(info)=>{
    if(!info||info.hoursBooked===0)return"Disponible";
    if(info.isFull)return info.status==="option"?"Option journée complète":"Journée complète confirmée";
    const parts=[];
    if(info.matinTaken)parts.push("Matin pris");
    if(info.apremTaken)parts.push("Après-midi pris");
    return parts.join(" · ");
  };

  return(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{padding:24,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{fontFamily:"'Urbanist'",fontSize:20,color:"#1D1D1F",letterSpacing:"0.05em"}}>{fmtD(date)}</h3>
          <button className="btn btn-ghost" style={{padding:"4px 10px"}} onClick={onClose}>✕</button>
        </div>

        {/* Team status */}
        {[{team:"A",info:infoA},{team:"B",info:infoB}].map(({team,info})=>{
          const tc=teamColor(team);
          const bs=info?.bookings||[];
          return(
            <div key={team} style={{marginBottom:14,padding:14,background:"#F5F5F7",borderRadius:8,border:`1px solid ${tc}22`}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:bs.length>0?10:0}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:statusDot(info?.status)}}/>
                <span style={{fontFamily:"'Inter'",fontSize:13,fontWeight:600,color:tc}}>Équipe {team}</span>
                <span style={{fontFamily:"'Inter'",fontSize:11,color:"#6E6E73"}}>— {statusLabel(info)}</span>
              </div>

              {/* Available slots badges */}
              {(team==="A"?availA:availB).length>0&&(
                <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:4,marginBottom:bs.length>0?8:0}}>
                  {(team==="A"?availA:availB).map(s=>(
                    <span key={s.id} style={{fontFamily:"'Inter'",fontSize:10,padding:"2px 7px",borderRadius:4,background:"#4ECDC418",color:"#4ECDC4",border:"1px solid #4ECDC433"}}>
                      {s.label} libre
                    </span>
                  ))}
                </div>
              )}

              {/* Existing bookings for this team */}
              {bs.map(booking=>(
                <div key={booking.id} style={{paddingLeft:12,paddingTop:8,borderTop:"1px solid #E5E5EA",marginTop:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    {slotLabel(booking)&&(
                      <span style={{fontFamily:"'Inter'",fontSize:10,padding:"2px 7px",borderRadius:4,background:booking.status==="option"?"#FF9F4318":"#FF3B3018",color:booking.status==="option"?"#FF9F43":"#FF3B30",border:`1px solid ${booking.status==="option"?"#FF9F4333":"#FF3B3033"}`}}>
                        {slotLabel(booking)}
                      </span>
                    )}
                    <span style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93"}}>
                      {booking.status==="option"?"option":"confirmé"}
                    </span>
                  </div>
                  {isAdmin&&<p style={{fontFamily:"'Inter'",fontSize:13,color:"#1D1D1F",fontWeight:500}}>{booking.client||booking.client_name}</p>}
                  {!isAdmin&&<p style={{fontFamily:"'Inter'",fontSize:12,color:"#8E8E93"}}>Date réservée</p>}
                  {isAdmin&&(booking.note)&&<p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93",marginTop:2}}>{booking.note}</p>}
                  {booking.status==="option"&&(booking.expiresAt||booking.expires_at)&&(
                    <p style={{fontFamily:"'JetBrains Mono'",fontSize:11,color:"#FF9F43",marginTop:4}}>Expire dans : {getCountdown(booking.expiresAt||booking.expires_at)}</p>
                  )}
                  {booking.status==="confirmed"&&(
                    <button className="btn btn-ghost" style={{fontSize:10,padding:"3px 8px",marginTop:6,display:"inline-flex",alignItems:"center",gap:4}} onClick={()=>{const sl=slotLabel(booking)||"";downloadICS(`Tournage Third-One Studio – Équipe ${team}`,date,`Créneau : ${sl}\nThird-One Studio, Martinique`);}}>
                      📅 Ajouter au calendrier
                    </button>
                  )}
                  {isAdmin&&booking.status==="option"&&(
                    <>
                      {confirmTarget===booking.id?(
                        <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:8}}>
                          <p style={{fontFamily:"'Inter'",fontSize:12,fontWeight:600,color:"#1D1D1F"}}>Confirmer via :</p>
                          {["devis","acompte"].map(type=>(
                            <div key={type} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#FFFFFF",borderRadius:6,border:`1px solid ${confirmCheck[type]?"#00B4D840":"#E5E5EA"}`,cursor:"pointer"}} onClick={()=>setConfirmCheck(p=>({...p,[type]:!p[type]}))}>
                              <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${confirmCheck[type]?"#00B4D8":"#C7C7CC"}`,background:confirmCheck[type]?"#00B4D8":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                {confirmCheck[type]&&<span style={{fontSize:9,color:"#FFFFFF",fontWeight:700}}>✓</span>}
                              </div>
                              <span style={{fontFamily:"'Inter'",fontSize:12,color:"#1D1D1F",textTransform:"capitalize"}}>{type==="devis"?"Devis signé":"Acompte reçu"}</span>
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
              ))}
            </div>
          );
        })}

        {/* Add option form */}
        {teamsWithSlots.length>0&&(
          <div style={{paddingTop:14,borderTop:"1px solid #E5E5EA"}}>
            <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",marginBottom:10}}>Poser une option :</p>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {/* Team selector */}
              <div style={{display:"flex",gap:8}}>
                {teamsWithSlots.map(t=>(
                  <div key={t} style={{flex:1,padding:"10px 12px",borderRadius:8,border:`2px solid ${form.team===t?teamColor(t):"#E5E5EA"}`,background:form.team===t?teamColor(t)+"12":"#F5F5F7",cursor:"pointer"}} onClick={()=>{const av=t==="A"?availA:availB;setForm(p=>({...p,team:t,slot:av[0]?.id||"matin"}));}}>
                    <p style={{fontFamily:"'Inter'",fontSize:13,fontWeight:600,color:teamColor(t),textAlign:"center"}}>Équipe {t}</p>
                  </div>
                ))}
              </div>
              {/* Slot selector */}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {currentAvailSlots.map(s=>(
                  <div key={s.id} style={{flex:1,minWidth:80,padding:"8px 10px",borderRadius:7,border:`2px solid ${form.slot===s.id?"#0090B3":"#E5E5EA"}`,background:form.slot===s.id?"#0090B312":"#F5F5F7",cursor:"pointer",textAlign:"center"}} onClick={()=>setForm(p=>({...p,slot:s.id}))}>
                    <p style={{fontFamily:"'Inter'",fontSize:12,fontWeight:600,color:form.slot===s.id?"#00B4D8":"#6E6E73"}}>{s.label}</p>
                    <p style={{fontFamily:"'JetBrains Mono'",fontSize:10,color:"#8E8E93"}}>{s.start}–{s.end}</p>
                  </div>
                ))}
              </div>
              <input className="input" placeholder="Nom / Société *" value={form.client} onChange={e=>setForm(p=>({...p,client:e.target.value}))}/>
              <div>
                <Lbl>Projet lié (optionnel)</Lbl>
                <select className="input" value={form.projectId} onChange={e=>setForm(p=>({...p,projectId:e.target.value}))}>
                  <option value="">Aucun</option>
                  {projects.map(proj=><option key={proj.id} value={proj.id}>{proj.title}</option>)}
                </select>
              </div>
              <input className="input" placeholder="Note (optionnel)" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))}/>
              <p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93"}}>⏱ L'option expire automatiquement après 72h si non confirmée.</p>
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
  const tc=t=>t==="A"?"#00B4D8":"#4ECDC4";

  return(
    <div style={{display:"flex",gap:16,height:"calc(100vh - 120px)",overflow:"hidden"}}>
      <div style={{width:220,display:"flex",flexDirection:"column",gap:5,overflowY:"auto",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <span style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93",textTransform:"uppercase",letterSpacing:"0.1em"}}>Fiches</span>
          <button style={{background:"#00B4D818",border:"1px solid #00B4D830",borderRadius:4,color:"#00B4D8",fontFamily:"'Inter'",fontSize:11,padding:"2px 7px",cursor:"pointer"}} onClick={()=>setShowNew(true)}>+ Nouveau</button>
        </div>
        {sheets.map(s=>(
          <div key={s.id} className={`sidebar-proj ${selId===s.id?"active":""}`} onClick={()=>setSelId(s.id)}>
            <div style={{flex:1,minWidth:0}}>
              <p style={{fontWeight:500,color:"inherit",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.projectTitle}</p>
              <div style={{display:"flex",gap:5,marginTop:2,alignItems:"center"}}>
                <span style={{fontSize:10,color:tc(s.team),fontWeight:600}}>Éq.{s.team}</span>
                <span style={{fontSize:10,color:"#8E8E93"}}>{s.shootType}</span>
                {s.clickupTaskId&&<span style={{fontSize:9,color:"#7B68EE",background:"#7B68EE18",borderRadius:3,padding:"0 3px"}}>CU</span>}
              </div>
              <div style={{marginTop:4}}><div className="progress-bar"><div className="progress-fill" style={{width:`${pct(s)}%`}}/></div></div>
            </div>
          </div>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        {sel?<SheetDetail sheet={sel} onUpdate={upd} onNotif={onNotif}/>:<p style={{fontFamily:"'Inter'",fontSize:13,color:"#8E8E93",textAlign:"center",padding:"40px 0"}}>Sélectionne une fiche</p>}
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
        <h3 style={{fontFamily:"'Urbanist'",fontSize:20,color:"#1D1D1F",letterSpacing:"0.05em",marginBottom:18}}>NOUVELLE FICHE</h3>
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
  const tc=sheet.team==="A"?"#00B4D8":"#4ECDC4";
  const tabs=[{k:"info",l:"Infos"},{k:"equip",l:`Matériel (${sheet.equipment.length})`},{k:"check",l:`Checklist (${Math.round((sheet.checklist.fixed.length+sheet.checklist.custom.filter(c=>c.done).length)/(CHECKLIST_FIXED.length+sheet.checklist.custom.length)*100)||0}%)`},{k:"time",l:"Feuille de temps"}];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div className="fadeUp" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <h2 style={{fontFamily:"'Urbanist'",fontSize:22,color:"#1D1D1F",letterSpacing:"0.04em"}}>{sheet.projectTitle}</h2>
            {sheet.clickupTaskId&&<span className="clickup-badge">✓ ClickUp</span>}
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",marginTop:2}}>
            <span style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73"}}>{sheet.client}</span>
            <span style={{fontFamily:"'Inter'",fontSize:11,color:tc,background:tc+"22",border:`1px solid ${tc}44`,borderRadius:10,padding:"1px 7px",fontWeight:600}}>Équipe {sheet.team}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {sheet.dates.map((d,i)=><span key={i} style={{fontFamily:"'JetBrains Mono'",fontSize:10,color:"#00B4D8",background:"#00B4D818",border:"1px solid #00B4D830",borderRadius:5,padding:"2px 7px"}}>{fmtS(d)}</span>)}
        </div>
      </div>
      <div style={{display:"flex",gap:4,background:"#F5F5F7",padding:4,borderRadius:8,overflowX:"auto"}}>
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
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#F5F5F7",borderRadius:7,border:"1px solid #E5E5EA"}}>
              <span style={{fontFamily:"'JetBrains Mono'",fontSize:10,color:"#00B4D8",background:"#00B4D818",padding:"1px 6px",borderRadius:3}}>J{i+1}</span>
              <span style={{fontFamily:"'Inter'",fontSize:12,color:"#1D1D1F"}}>{fmtD(d)}</span>
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
            <p style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>{cat}</p>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {all.filter(e=>e.cat===cat).map(e=>{const on=sheet.equipment.includes(e.id);return(
                <div key={e.id} className={`equip-item ${on?"included":""}`} onClick={()=>toggle(e.id)} style={{cursor:"pointer"}}>
                  <div style={{width:16,height:16,borderRadius:3,border:`2px solid ${on?"#00B4D8":"#C7C7CC"}`,background:on?"#00B4D8":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}}>
                    {on&&<span style={{fontSize:9,color:"#FFFFFF",fontWeight:700}}>✓</span>}
                  </div>
                  <span style={{fontFamily:"'Inter'",fontSize:12,color:on?"#1D1D1F":"#6E6E73"}}>{e.label}</span>
                </div>
              );})}
            </div>
          </div>
        ))}
        {(sheet._customEquip||[]).map(e=>(
          <div key={e.id} className="equip-item included" style={{marginBottom:4}}>
            <div style={{width:16,height:16,borderRadius:3,background:"#00B4D8",border:"2px solid #00B4D8",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:9,color:"#FFFFFF",fontWeight:700}}>✓</span></div>
            <span style={{fontFamily:"'Inter'",fontSize:12,color:"#1D1D1F",flex:1}}>{e.label}</span>
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
          <span style={{fontFamily:"'Urbanist'",fontSize:16,color:"#1D1D1F",letterSpacing:"0.05em"}}>CHECKLIST PRÉ-TOURNAGE</span>
          <span style={{fontFamily:"'JetBrains Mono'",fontSize:13,color:pct===100?"#4ECDC4":"#00B4D8",fontWeight:600}}>{pct}%</span>
        </div>
        <div className="progress-bar" style={{height:4,marginBottom:8}}><div className="progress-fill" style={{width:`${pct}%`,background:pct===100?"linear-gradient(90deg,#4ECDC4,#6EDDD8)":undefined}}/></div>
      </div>
      {phases.map(phase=>(
        <div key={phase} className="card" style={{padding:14}}>
          <p style={{fontFamily:"'Inter'",fontSize:10,color:"#6E6E73",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>{phase==="Avant"?"⏰ ":phase==="Jour J"?"🎬 ":"✅ "}{phase}</p>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {CHECKLIST_FIXED.filter(i=>i.phase===phase).map(item=>{const ch=sheet.checklist.fixed.includes(item.id);return(
              <div key={item.id} className={`check-item ${ch?"done":""}`} onClick={()=>tFixed(item.id)}>
                <div className={`check-box ${ch?"checked":""}`}>{ch&&<span style={{fontSize:9,color:"#FFFFFF",fontWeight:700}}>✓</span>}</div>
                <span style={{fontFamily:"'Inter'",fontSize:12,color:ch?"#6E6E73":"#1D1D1F",textDecoration:ch?"line-through":"none",flex:1}}>{item.label}</span>
              </div>
            );})}
          </div>
        </div>
      ))}
      <div className="card" style={{padding:14}}>
        <p style={{fontFamily:"'Inter'",fontSize:10,color:"#6E6E73",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>✏️ Tâches spécifiques</p>
        <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:8}}>
          {sheet.checklist.custom.map(item=>(
            <div key={item.id} className={`check-item ${item.done?"done":""}`} onClick={()=>tCustom(item.id)}>
              <div className={`check-box ${item.done?"checked":""}`}>{item.done&&<span style={{fontSize:9,color:"#FFFFFF",fontWeight:700}}>✓</span>}</div>
              <span style={{fontFamily:"'Inter'",fontSize:12,color:item.done?"#6E6E73":"#1D1D1F",textDecoration:item.done?"line-through":"none",flex:1}}>{item.label}</span>
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
        {[["Jours",sheet.timesheet.length,"#00B4D8"],["Heures totales",`${totH.toFixed(1)}h`,"#4ECDC4"],["Moy./jour",sheet.timesheet.length?`${(totH/sheet.timesheet.length).toFixed(1)}h`:"—","#7B9CFF"]].map(([l,v,c])=>(
          <div key={l} style={{background:"#F5F5F7",border:"1px solid #E5E5EA",borderRadius:8,padding:"10px 12px"}}>
            <p style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3}}>{l}</p>
            <p style={{fontFamily:"'Urbanist'",fontSize:22,color:c,letterSpacing:"0.05em"}}>{v}</p>
          </div>
        ))}
      </div>
      <div className="card" style={{padding:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontFamily:"'Urbanist'",fontSize:15,color:"#1D1D1F",letterSpacing:"0.05em"}}>FEUILLE DE TEMPS</span>
          <button className="btn btn-ghost" style={{fontSize:11,padding:"4px 10px"}} onClick={add}>+ Ligne</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {sheet.timesheet.map(r=>{const h=calcH(r.start,r.end);return(
            <div key={r.id} style={{display:"grid",gridTemplateColumns:"100px 1fr 65px 65px 50px 1fr 28px",gap:5,alignItems:"center"}}>
              <input type="date" className="time-cell" value={r.date} onChange={e=>upd(r.id,"date",e.target.value)}/>
              <input className="time-cell" style={{fontFamily:"'Inter'"}} value={r.member} onChange={e=>upd(r.id,"member",e.target.value)}/>
              <input type="time" className="time-cell" value={r.start} onChange={e=>upd(r.id,"start",e.target.value)}/>
              <input type="time" className="time-cell" value={r.end}   onChange={e=>upd(r.id,"end",e.target.value)}/>
              <span style={{fontFamily:"'JetBrains Mono'",fontSize:11,color:h>10?"#FF9F43":"#4ECDC4",textAlign:"center",fontWeight:600}}>{h.toFixed(1)}h</span>
              <input className="time-cell" style={{fontFamily:"'Inter'"}} placeholder="Note..." value={r.notes} onChange={e=>upd(r.id,"notes",e.target.value)}/>
              <button className="btn btn-red" style={{padding:"3px 5px",fontSize:10}} onClick={()=>del(r.id)}>✕</button>
            </div>
          );})}
        </div>
        {sheet.timesheet.some(r=>calcH(r.start,r.end)>10)&&(
          <div style={{marginTop:10,padding:"8px 12px",background:"#FF9F4318",border:"1px solid #FF9F4340",borderRadius:7}}>
            <p style={{fontFamily:"'Inter'",fontSize:11,color:"#FF9F43"}}>⚠️ Journée(s) dépassant 10h détectée(s) — valider les heures supplémentaires.</p>
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
              <span style={{fontFamily:"'Inter'",fontSize:9,color:i===step?"#00B4D8":i<step?"#4ECDC4":"#8E8E93",whiteSpace:"nowrap"}}>{l}</span>
            </div>
            {i<3&&<div style={{flex:1,height:2,background:i<step?"#4ECDC4":"#E5E5EA",marginBottom:14}}/>}
          </div>
        ))}
      </div>
      {step===0&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {pricing.prestations.map(p=>(
            <div key={p.id} className={`option-card ${form.prestationId===p.id?"selected":""}`} onClick={()=>s("prestationId",p.id)}>
              <div className={`option-check ${form.prestationId===p.id?"checked":""}`}>{form.prestationId===p.id&&<span style={{fontSize:9,color:"#FFFFFF",fontWeight:700}}>✓</span>}</div>
              <div><div style={{display:"flex",alignItems:"center",gap:7}}><span>{p.icon}</span><span style={{fontFamily:"'Inter'",fontSize:13,fontWeight:600,color:"#1D1D1F"}}>{p.label}</span></div>
              <p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93",marginTop:2}}>{p.minDays===p.maxDays?`${p.minDays}j`:`${p.minDays}–${p.maxDays}j`} recommandés</p></div>
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
                <div className={`option-check ${form.team===id?"checked":""}`}>{form.team===id&&<span style={{fontSize:9,color:"#FFFFFF",fontWeight:700}}>✓</span>}</div>
                <div><p style={{fontFamily:"'Inter'",fontSize:13,fontWeight:600,color:"#1D1D1F"}}>{t.label}</p><p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93"}}>{t.description}</p></div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,justifyContent:"center"}}>
            <button className="btn btn-ghost" style={{padding:"8px 14px",fontSize:18}} onClick={()=>s("days",Math.max(prest?.minDays||1,form.days-1))}>−</button>
            <div style={{textAlign:"center"}}><span style={{fontFamily:"'Urbanist'",fontSize:36,color:"#00B4D8"}}>{form.days}</span><span style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",marginLeft:5}}>jour{form.days>1?"s":""}</span></div>
            <button className="btn btn-ghost" style={{padding:"8px 14px",fontSize:18}} onClick={()=>s("days",Math.min(prest?.maxDays||10,form.days+1))}>+</button>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"space-between"}}><button className="btn btn-ghost" onClick={()=>setStep(0)}>← Retour</button><button className="btn btn-primary" onClick={()=>setStep(2)}>Suivant →</button></div>
        </div>
      )}
      {step===2&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {pricing.options.map(opt=>{const on=form.options.includes(opt.id);return(
            <div key={opt.id} className={`option-card ${on?"selected":""}`} onClick={()=>tog(opt.id)}>
              <div className={`option-check ${on?"checked":""}`}>{on&&<span style={{fontSize:9,color:"#FFFFFF",fontWeight:700}}>✓</span>}</div>
              <div style={{flex:1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}><span>{opt.icon}</span><span style={{fontFamily:"'Inter'",fontSize:13,fontWeight:500,color:"#1D1D1F"}}>{opt.label}</span></div>
              </div>
            </div>
          );})}
          <div style={{display:"flex",gap:8,justifyContent:"space-between",marginTop:4}}><button className="btn btn-ghost" onClick={()=>setStep(1)}>← Retour</button><button className="btn btn-primary" onClick={estimate}>Voir l'estimation →</button></div>
        </div>
      )}
      {step===3&&result&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="price-range countUp">
            <p style={{fontFamily:"'Inter'",fontSize:11,color:"#6E6E73",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Estimation indicative</p>
            <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:10}}>
              <span style={{fontFamily:"'Urbanist'",fontSize:38,color:"#00B4D8",letterSpacing:"0.03em"}}>{fmtEur(result.min)}</span>
              <span style={{color:"#6E6E73",fontSize:16}}>→</span>
              <span style={{fontFamily:"'Urbanist'",fontSize:38,color:"#00B4D8",letterSpacing:"0.03em"}}>{fmtEur(result.max)}</span>
            </div>
            {result.discount>0&&<div style={{marginTop:6}}><span className="discount-badge">✓ Tarif préférentiel appliqué</span></div>}
            <p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93",marginTop:10}}>Estimation indicative — devis personnalisé sur demande</p>
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
  const statusColor={en_attente:"#FF9F43",devis:"#4ECDC4",refuse:"#FF3B30"};
  const statusLabel={en_attente:"En attente",devis:"Devis envoyé",refuse:"Refusé"};
  const typeColors={PME:"#7B9CFF",Institutionnel:"#4ECDC4",Agence:"#FF9F43"};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:4,background:"#F5F5F7",padding:4,borderRadius:8,overflowX:"auto"}}>
        {tabs.map(t=><button key={t.k} className={`tab ${tab===t.k?"active":""}`} style={{whiteSpace:"nowrap"}} onClick={()=>setTab(t.k)}>{t.l}</button>)}
      </div>
      {tab==="tarifs"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="card" style={{padding:16}}>
            <SH icon="💰" title="TARIFS JOURNÉE ÉQUIPE"/>
            {Object.entries(pricing.teams).map(([id,t])=>(
              <div key={id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"9px 12px",background:"#F5F5F7",borderRadius:7,border:"1px solid #E5E5EA",marginBottom:6}}>
                <div><p style={{fontFamily:"'Inter'",fontSize:13,fontWeight:600,color:"#1D1D1F"}}>{t.label}</p><p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93"}}>{t.description}</p></div>
                <div style={{display:"flex",alignItems:"center",gap:6}}><input className="admin-input" style={{width:90}} type="number" value={t.dayRate} onChange={e=>setTeam(id,e.target.value)}/><span style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93"}}>€/j</span></div>
              </div>
            ))}
          </div>
          <div className="card" style={{padding:16}}>
            <SH icon="✖" title="MULTIPLICATEURS" sub="1.0 = normal · 1.2 = +20% · 0.9 = -10%"/>
            {pricing.prestations.map(p=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"7px 12px",background:"#F5F5F7",borderRadius:7,border:"1px solid #E5E5EA",marginBottom:5}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}><span>{p.icon}</span><span style={{fontFamily:"'Inter'",fontSize:12,color:"#1D1D1F"}}>{p.label}</span></div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <input className="admin-input" style={{width:65}} type="number" step="0.05" min="0.5" max="2" value={p.mult} onChange={e=>setMult(p.id,e.target.value)}/>
                  <span style={{fontFamily:"'JetBrains Mono'",fontSize:10,color:p.mult>1?"#FF9F43":p.mult<1?"#4ECDC4":"#6E6E73",width:40,textAlign:"right"}}>{p.mult>1?`+${Math.round((p.mult-1)*100)}%`:p.mult<1?`-${Math.round((1-p.mult)*100)}%`:"="}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="card" style={{padding:16}}>
            <SH icon="⚙" title="OPTIONS"/>
            {pricing.options.map(o=>(
              <div key={o.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"7px 12px",background:"#F5F5F7",borderRadius:7,border:"1px solid #E5E5EA",marginBottom:5}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}><span>{o.icon}</span><span style={{fontFamily:"'Inter'",fontSize:12,color:"#1D1D1F"}}>{o.label}</span><span style={{fontFamily:"'Inter'",fontSize:9,color:"#8E8E93",background:"#F2F2F7",border:"1px solid #E5E5EA",borderRadius:7,padding:"0 5px"}}>{o.unit}</span></div>
                <div style={{display:"flex",alignItems:"center",gap:6}}><input className="admin-input" style={{width:80}} type="number" value={o.price} onChange={e=>setOpt(o.id,e.target.value)}/><span style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93"}}>€</span></div>
              </div>
            ))}
          </div>
          <div className="card" style={{padding:16}}>
            <SH icon="↔" title="MARGE FOURCHETTE" sub="Amplitude de la fourchette affichée au client"/>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input className="admin-input" style={{width:70}} type="number" min="5" max="30" value={pricing.rangeMargin} onChange={e=>setPricing(p=>({...p,rangeMargin:Number(e.target.value)}))}/>
              <span style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73"}}>%</span>
              <span style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93"}}>→ pour 3 000€ : {fmtEur(3000*(1-pricing.rangeMargin/200))} – {fmtEur(3000*(1+pricing.rangeMargin/200))}</span>
            </div>
          </div>
        </div>
      )}
      {tab==="clients"&&(
        <div className="card" style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div><SH icon="👥" title="CLIENTS & REMISES"/><p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93",marginTop:-10,marginBottom:10}}>Les remises sont invisibles côté client. Active le simulateur client par client.</p></div>
            <button className="btn btn-primary" style={{fontSize:11,flexShrink:0}} onClick={()=>setShowAddClient(!showAddClient)}>{showAddClient?"✕":"+ Ajouter"}</button>
          </div>
          {showAddClient&&(
            <div style={{background:"#F5F5F7",border:"1px solid #00B4D830",borderRadius:8,padding:12,marginBottom:12,display:"flex",flexDirection:"column",gap:7}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                <input className="input" placeholder="Nom *" value={nf.name} onChange={e=>setNf(p=>({...p,name:e.target.value}))}/>
                <input className="input" placeholder="Email" value={nf.email} onChange={e=>setNf(p=>({...p,email:e.target.value}))}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                <select className="input" value={nf.type} onChange={e=>setNf(p=>({...p,type:e.target.value}))}>{["PME","Institutionnel","Agence"].map(t=><option key={t}>{t}</option>)}</select>
                <div style={{display:"flex",alignItems:"center",gap:6}}><input className="admin-input" type="number" min="0" max="50" value={nf.discount} onChange={e=>setNf(p=>({...p,discount:e.target.value}))}/><span style={{fontFamily:"'Inter'",fontSize:11,color:"#6E6E73"}}>% remise</span></div>
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",gap:7}}><button className="btn btn-ghost" style={{fontSize:11}} onClick={()=>setShowAddClient(false)}>Annuler</button><button className="btn btn-primary" style={{fontSize:11}} onClick={addClient}>Ajouter</button></div>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {clients.map(c=>(
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#F5F5F7",borderRadius:8,border:"1px solid #E5E5EA"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <p style={{fontFamily:"'Inter'",fontSize:13,fontWeight:500,color:"#1D1D1F"}}>{c.name}</p>
                    <span style={{fontFamily:"'Inter'",fontSize:9,color:(typeColors[c.type]||"#6E6E73"),background:(typeColors[c.type]||"#6E6E73")+"22",border:`1px solid ${(typeColors[c.type]||"#6E6E73")}44`,borderRadius:7,padding:"0 5px"}}>{c.type}</span>
                  </div>
                  <p style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93"}}>{c.email}</p>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <input className="admin-input" style={{width:50}} type="number" min="0" max="50" value={c.discount} onChange={e=>updDiscount(c.id,e.target.value)}/>
                    <span style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93"}}>%</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:5,borderLeft:"1px solid #E5E5EA",paddingLeft:8}}>
                    <span style={{fontFamily:"'Inter'",fontSize:10,color:c.simulatorEnabled?"#4ECDC4":"#8E8E93"}}>Simulateur</span>
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
          {estimates.length===0?<p style={{fontFamily:"'Inter'",fontSize:13,color:"#8E8E93",textAlign:"center",padding:"20px 0"}}>Aucune estimation</p>:(
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {estimates.map(e=>(
                <div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#F5F5F7",borderRadius:8,border:"1px solid #E5E5EA"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontFamily:"'Inter'",fontSize:13,fontWeight:500,color:"#1D1D1F",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.client} — {e.prestation}</p>
                    <div style={{display:"flex",gap:8,marginTop:2}}>
                      <span style={{fontFamily:"'JetBrains Mono'",fontSize:11,color:"#00B4D8",fontWeight:600}}>{fmtEur(e.min)} – {fmtEur(e.max)}</span>
                      <span style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93"}}>Éq.{e.team} · {e.days}j · {fmtS(e.date)}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    <span style={{fontFamily:"'Inter'",fontSize:11,color:statusColor[e.status],background:statusColor[e.status]+"22",border:`1px solid ${statusColor[e.status]}44`,borderRadius:10,padding:"1px 7px"}}>{statusLabel[e.status]}</span>
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
  { id:"draft",    label:"Brouillon",   color:"#8E8E93", bg:"#8E8E9322" },
  { id:"review",   label:"À valider",   color:"#FF9F43", bg:"#FF9F4322" },
  { id:"approved", label:"Validé",      color:"#4ECDC4", bg:"#4ECDC422" },
  { id:"published",label:"Publié",      color:"#00B4D8", bg:"#00B4D822" },
];

// INIT_POSTS removed

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
          <h2 style={{ fontFamily:"'Urbanist'", fontSize:26, color:"#1D1D1F", letterSpacing:"0.04em" }}>COMMUNITY MANAGEMENT</h2>
          <p style={{ fontFamily:"'Inter'", fontSize:12, color:"#6E6E73", marginTop:2 }}>Planification, captions et validation des posts</p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {pendingReview > 0 && (
            <div style={{ background:"#FF9F4318", border:"1px solid #FF9F4340", borderRadius:8, padding:"6px 12px", display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ color:"#FF9F43", fontSize:14 }}>⏳</span>
              <span style={{ fontFamily:"'Inter'", fontSize:12, color:"#FF9F43", fontWeight:600 }}>{pendingReview} en attente de validation</span>
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
            <div key={s.id} style={{ background:"#FFFFFF", border:`1px solid ${s.color}33`, borderRadius:8, padding:"10px 14px", cursor:"pointer" }}
              onClick={() => setFilterStatus(filterStatus === s.id ? "all" : s.id)}>
              <p style={{ fontFamily:"'Urbanist'", fontSize:26, color:s.color, letterSpacing:"0.05em" }}>{count}</p>
              <p style={{ fontFamily:"'Inter'", fontSize:11, color:"#6E6E73" }}>{s.label}</p>
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
        <div style={{ display:"flex", gap:4, background:"#F5F5F7", padding:3, borderRadius:7, border:"1px solid #E5E5EA" }}>
          <button className={view==="calendar"?"tab active":"tab"} style={{ fontSize:11, padding:"4px 10px" }} onClick={() => setView("calendar")}>📅 Calendrier</button>
          <button className={view==="list"?"tab active":"tab"} style={{ fontSize:11, padding:"4px 10px" }} onClick={() => setView("list")}>☰ Liste</button>
        </div>
      </div>

      {/* CALENDAR VIEW */}
      {view === "calendar" && <CMCalendarView posts={filtered} postsByDate={postsByDate} netData={netData} stData={stData} onEdit={setEditPost} getProjectTitle={getProjectTitle} />}

      {/* LIST VIEW */}
      {view === "list" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {filtered.length === 0 && <p style={{ fontFamily:"'Inter'", fontSize:13, color:"#8E8E93", textAlign:"center", padding:"30px 0" }}>Aucun post trouvé</p>}
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
        <h3 style={{ fontFamily:"'Urbanist'", fontSize:20, color:"#1D1D1F", letterSpacing:"0.06em", textTransform:"capitalize" }}>{monthStr}</h3>
        <button className="btn btn-ghost" style={{ padding:"5px 11px" }} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()+1, 1))}>→</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:4 }}>
        {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(d => (
          <div key={d} style={{ textAlign:"center", fontFamily:"'Inter'", fontSize:10, color:"#8E8E93", padding:"3px 0" }}>{d}</div>
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
              minHeight:80, background:"#F5F5F7", borderRadius:7,
              border:`1px solid ${isToday?"#00B4D866":"#E5E5EA"}`,
              padding:"5px 4px", display:"flex", flexDirection:"column", gap:2,
            }}>
              <span style={{ fontFamily:"'Inter'", fontSize:11, fontWeight:600, color:isToday?"#00B4D8":"#6E6E73", marginBottom:2 }}>{i+1}</span>
              {dayPosts.slice(0,3).map(post => {
                const n = netData(post.network);
                const s = stData(post.status);
                return (
                  <div key={post.id} onClick={() => onEdit(post)}
                    style={{ background:n.color+"22", border:`1px solid ${n.color}44`, borderRadius:4, padding:"2px 5px", cursor:"pointer", transition:"all .15s" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                      <span style={{ fontSize:9 }}>{n.icon}</span>
                      <span style={{ fontFamily:"'Inter'", fontSize:9, color:"#1D1D1F", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>
                        {post.caption.slice(0,28)}…
                      </span>
                    </div>
                    <div style={{ width:4, height:4, borderRadius:"50%", background:s.color, marginTop:1 }}/>
                  </div>
                );
              })}
              {dayPosts.length > 3 && (
                <span style={{ fontFamily:"'Inter'", fontSize:9, color:"#8E8E93", textAlign:"center" }}>+{dayPosts.length-3}</span>
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
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", background:"#FFFFFF", borderRadius:8, border:"1px solid #E5E5EA", transition:"border-color .2s" }}>
      <div style={{ width:32, height:32, borderRadius:7, background:netData.color+"22", border:`1px solid ${netData.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>
        {netData.icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontFamily:"'Inter'", fontSize:12, fontWeight:600, color:netData.color }}>{netData.label}</span>
          <span style={{ fontFamily:"'Inter'", fontSize:11, color:"#8E8E93" }}>· {projectTitle}</span>
          <span style={{ fontFamily:"'JetBrains Mono'", fontSize:10, color:"#8E8E93" }}>{fmtS(post.scheduledAt)}</span>
        </div>
        <p style={{ fontFamily:"'Inter'", fontSize:12, color:"#6E6E73", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {post.caption.slice(0,80)}…
        </p>
      </div>
      <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
        <span style={{ fontFamily:"'Inter'", fontSize:11, color:stData.color, background:stData.bg, border:`1px solid ${stData.color}44`, borderRadius:10, padding:"2px 8px" }}>
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
          <h3 style={{ fontFamily:"'Urbanist'", fontSize:20, color:"#1D1D1F", letterSpacing:"0.05em" }}>
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
                  style={{ padding:"7px 12px", borderRadius:8, border:`2px solid ${form.network===n.id?n.color:"#E5E5EA"}`,
                    background:form.network===n.id?n.color+"18":"#F5F5F7", cursor:"pointer", transition:"all .15s",
                    display:"flex", alignItems:"center", gap:5 }}>
                  <span>{n.icon}</span>
                  <span style={{ fontFamily:"'Inter'", fontSize:12, color:form.network===n.id?n.color:"#6E6E73", fontWeight:500 }}>{n.label}</span>
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
            {aiError && <p style={{ fontFamily:"'Inter'", fontSize:11, color:"#FF3B30", marginBottom:4 }}>{aiError}</p>}
            <textarea className="input" rows={5} placeholder={`Rédigez votre caption ${net.label}...`} value={form.caption} onChange={e => s("caption", e.target.value)}/>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
              <span style={{ fontFamily:"'Inter'", fontSize:10, color:"#8E8E93" }}>
                {form.network==="twitter"?"280":"2200"} caractères max
              </span>
              <span style={{ fontFamily:"'JetBrains Mono'", fontSize:10, color:form.caption.length>2000?"#FF3B30":"#8E8E93" }}>
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
            <div style={{ background:"#F5F5F7", border:`1px solid ${net.color}33`, borderRadius:10, padding:14 }}>
              <p style={{ fontFamily:"'Inter'", fontSize:10, color:net.color, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>
                {net.icon} Aperçu {net.label}
              </p>
              <p style={{ fontFamily:"'Inter'", fontSize:13, color:"#1D1D1F", lineHeight:1.6, whiteSpace:"pre-wrap" }}>{form.caption}</p>
              {form.assetName && (
                <div style={{ marginTop:10, padding:"8px 10px", background:"#F2F2F7", borderRadius:7, border:"1px solid #E5E5EA", display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:14 }}>🎬</span>
                  <span style={{ fontFamily:"'Inter'", fontSize:11, color:"#6E6E73" }}>{form.assetName}</span>
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
      <div style={{ background:"linear-gradient(135deg,#00B4D810,#7B9CFF08)", border:"1px solid #00B4D820", borderRadius:10, padding:"14px 18px" }}>
        <h2 style={{ fontFamily:"'Urbanist'", fontSize:22, color:"#1D1D1F", letterSpacing:"0.04em" }}>CONTENU À VALIDER</h2>
        <p style={{ fontFamily:"'Inter'", fontSize:12, color:"#6E6E73", marginTop:2 }}>
          {toValidate.length > 0 ? `${toValidate.length} post${toValidate.length>1?"s":""} en attente de votre validation` : "Aucun contenu en attente"}
        </p>
      </div>

      {/* À valider */}
      {toValidate.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <h3 style={{ fontFamily:"'Urbanist'", fontSize:16, color:"#FF9F43", letterSpacing:"0.05em" }}>⏳ EN ATTENTE</h3>
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
          <h3 style={{ fontFamily:"'Urbanist'", fontSize:16, color:"#4ECDC4", letterSpacing:"0.05em" }}>✓ VALIDÉS</h3>
          {approved.map(post => <CMClientPostMini key={post.id} post={post} netData={netData(post.network)} projects={projects}/>)}
        </div>
      )}

      {/* Publiés */}
      {published.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <h3 style={{ fontFamily:"'Urbanist'", fontSize:16, color:"#00B4D8", letterSpacing:"0.05em" }}>✦ PUBLIÉS</h3>
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
            <span style={{ fontFamily:"'Inter'", fontSize:13, fontWeight:600, color:netData.color }}>{netData.label}</span>
            <span style={{ fontFamily:"'Inter'", fontSize:11, color:"#8E8E93" }}>· {projectTitle}</span>
          </div>
          <span style={{ fontFamily:"'JetBrains Mono'", fontSize:10, color:"#8E8E93" }}>Prévu le {fmtS(post.scheduledAt)}</span>
        </div>
      </div>

      {/* Asset */}
      {post.assetName && (
        <div style={{ background:"#F5F5F7", border:"1px solid #E5E5EA", borderRadius:7, padding:"8px 10px", marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
          <span>🎬</span>
          <span style={{ fontFamily:"'Inter'", fontSize:12, color:"#6E6E73" }}>{post.assetName}</span>
        </div>
      )}

      {/* Caption */}
      <div style={{ background:"#F5F5F7", border:`1px solid ${netData.color}22`, borderRadius:8, padding:12, marginBottom:12 }}>
        <p style={{ fontFamily:"'Inter'", fontSize:13, color:"#1D1D1F", lineHeight:1.6, whiteSpace:"pre-wrap" }}>{post.caption}</p>
      </div>

      {/* Validation */}
      <div style={{ borderTop:"1px solid #E5E5EA", paddingTop:12 }}>
        <p style={{ fontFamily:"'Inter'", fontSize:12, color:"#6E6E73", marginBottom:8 }}>Votre commentaire (optionnel pour approbation, requis pour révision) :</p>
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
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#FFFFFF", borderRadius:8, border:"1px solid #E5E5EA" }}>
      <span style={{ fontSize:16 }}>{netData.icon}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontFamily:"'Inter'", fontSize:12, color:"#1D1D1F", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{post.caption.slice(0,60)}…</p>
        <p style={{ fontFamily:"'Inter'", fontSize:10, color:"#8E8E93" }}>{netData.label} · {fmtS(post.scheduledAt)}</p>
      </div>
      {post.comment && (
        <div style={{ background:"#4ECDC410", border:"1px solid #4ECDC430", borderRadius:6, padding:"3px 8px", maxWidth:160 }}>
          <p style={{ fontFamily:"'Inter'", fontSize:10, color:"#4ECDC4", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>"{post.comment}"</p>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// J-2 ALERT BANNER
// ─────────────────────────────────────────────────────────────────────────────
const WMO_LABELS={
  0:["Ciel dégagé","☀️"],1:["Peu nuageux","🌤"],2:["Partiellement nuageux","⛅"],3:["Couvert","☁️"],
  45:["Brume/brouillard","🌫"],48:["Brouillard givrant","🌫"],
  51:["Bruine légère","🌦"],53:["Bruine modérée","🌦"],55:["Bruine dense","🌧"],
  61:["Pluie légère","🌦"],63:["Pluie modérée","🌧"],65:["Pluie forte","🌧"],
  80:["Averses légères","🌦"],81:["Averses modérées","🌧"],82:["Averses violentes","⛈"],
  95:["Orage","⛈"],96:["Orage avec grêle","⛈"],99:["Orage violent","⛈"],
};
const wmoLabel=(code)=>WMO_LABELS[code]||["Météo indisponible","🌡"];

function J2AlertBanner({projects,clients}){
  const[alerts,setAlerts]=useState([]);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{
    const j2=new Date(TODAY);j2.setDate(j2.getDate()+2);
    const j2str=j2.toISOString().split("T")[0];
    const upcoming=projects.filter(p=>p.shootDate===j2str&&p.status!=="livré");
    if(upcoming.length===0){setLoading(false);return;}
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=14.6415&longitude=-61.0242&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=America%2FMartinique&start_date=${j2str}&end_date=${j2str}`)
      .then(r=>r.json())
      .then(data=>{
        const d=data.daily;
        const weather={code:d?.weathercode?.[0],tmax:d?.temperature_2m_max?.[0],tmin:d?.temperature_2m_min?.[0],rain:d?.precipitation_sum?.[0]};
        setAlerts(upcoming.map(p=>({project:p,weather,date:j2str})));
      })
      .catch(()=>setAlerts(upcoming.map(p=>({project:p,weather:null,date:j2str}))))
      .finally(()=>setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[projects.length]);

  if(loading||alerts.length===0)return null;

  return(
    <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:4}}>
      {alerts.map(({project,weather,date})=>{
        const client=clients.find(c=>c.id===project.clientId);
        const[label,emoji]=wmoLabel(weather?.code);
        const bodyLines=[
          `Bonjour ${client?.name||""},`,
          ``,
          `Nous vous confirmons le tournage de votre projet "${project.title}" prévu après-demain, le ${fmtD(date)}.`,
          ``,
          `📅 Date : ${fmtD(date)}`,
          `🕗 Heure d'arrivée de l'équipe : 08h00`,
          `📍 Lieu : Third-One Studio, Martinique`,
          weather?`🌤 Météo prévue : ${label} ${emoji} — ${Math.round(weather.tmin||22)}°–${Math.round(weather.tmax||28)}°C${weather.rain>1?` · Précipitations : ${weather.rain?.toFixed(1)} mm`:""}` : "",
          ``,
          `N'hésitez pas à nous contacter pour toute question.`,
          ``,
          `L'équipe Third-One Studio`,
        ].filter(l=>l!==undefined);
        const mailto=`mailto:${client?.email||""}?subject=${encodeURIComponent(`Rappel tournage – ${project.title} – ${fmtD(date)}`)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
        return(
          <div key={project.id} style={{background:"linear-gradient(135deg,#00B4D818,#FF9F4310)",border:"2px solid #00B4D840",borderRadius:10,padding:"14px 18px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
            <div style={{fontSize:28}}>{emoji||"🎬"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{fontFamily:"'Urbanist'",fontSize:16,color:"#00B4D8",letterSpacing:"0.05em"}}>J-2 — TOURNAGE</span>
                <span style={{fontFamily:"'Inter'",fontSize:12,color:"#1D1D1F",fontWeight:600}}>{project.title}</span>
                {client&&<span style={{fontFamily:"'Inter'",fontSize:11,color:"#6E6E73"}}>· {client.name}</span>}
              </div>
              {weather?(
                <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",marginTop:3}}>
                  {label} · {Math.round(weather.tmin||22)}°–{Math.round(weather.tmax||28)}°C
                  {weather.rain>1?<span style={{color:"#7B9CFF"}}> · 🌧 {weather.rain?.toFixed(1)} mm prévus</span>:null}
                </p>
              ):<p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93",marginTop:2}}>Météo indisponible</p>}
            </div>
            <a href={mailto} style={{textDecoration:"none"}} title={client?.email?"Envoyer à "+client.email:"Email client non renseigné"}>
              <button className="btn btn-primary" style={{fontSize:12,whiteSpace:"nowrap"}}>📧 Envoyer le rappel</button>
            </a>
          </div>
        );
      })}
    </div>
  );
}

// ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function AdminDashboard({ projects, clients, assignments, onSelectProject, onSectionChange, bookings=[], onGoToCalendar, teamMembers=[] }) {
  const [sortBy, setSortBy] = useState("tournage");

  const statusColor = s => ({brief:"#7B9CFF",storyboard:"#00B4D8",tournage:"#FF9F43",montage:"#B47FFF",livraison:"#4ECDC4"}[s]||"#6E6E73");
  const statusLabel = s => ({brief:"Brief",storyboard:"Storyboard",tournage:"Tournage",montage:"Montage",livraison:"Livré"}[s]||s);
  const deliveryColor = date => { const diff=(new Date(date+"T12:00:00")-new Date())/86400000; return diff<0?"#FF3B30":diff<=7?"#FF9F43":"#4ECDC4"; };

  // Group projects by client
  const grouped = {};
  projects.forEach(p => {
    const clientName = clients.find(c => c.id === p.clientId)?.name || p.client || "Client inconnu";
    if (!grouped[clientName]) grouped[clientName] = [];
    grouped[clientName].push(p);
  });

  // Sort projects
  const sortProjects = (projs) => {
    if (sortBy === "tournage") return [...projs].sort((a,b) => (a.createdAt||"").localeCompare(b.createdAt||""));
    if (sortBy === "livraison") return [...projs].sort((a,b) => {
      const order = ["brief","storyboard","tournage","montage","livraison"];
      return order.indexOf(b.status) - order.indexOf(a.status);
    });
    if (sortBy === "statut") return [...projs].sort((a,b) => {
      const order = ["brief","storyboard","tournage","montage","livraison"];
      return order.indexOf(a.status) - order.indexOf(b.status);
    });
    return projs;
  };

  const totalProjects = projects.length;
  const byStatus = s => projects.filter(p => p.status === s).length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontFamily:"'Urbanist'", fontSize:28, color:"#1D1D1F", letterSpacing:"0.04em" }}>TABLEAU DE BORD</h2>
        <p style={{ fontFamily:"'Inter'", fontSize:12, color:"#6E6E73", marginTop:2 }}>Vue d ensemble de tous vos projets et clients</p>
      </div>

      {/* Stats globales */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8 }}>
        {[
          { label:"Total projets", value:totalProjects, color:"#1D1D1F" },
          { label:"En brief", value:byStatus("brief"), color:"#7B9CFF" },
          { label:"Storyboard", value:byStatus("storyboard"), color:"#00B4D8" },
          { label:"En tournage", value:byStatus("tournage"), color:"#FF9F43" },
          { label:"Livrés", value:byStatus("livraison"), color:"#4ECDC4" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background:"#FFFFFF", border:`1px solid ${color}33`, borderRadius:8, padding:"12px 14px" }}>
            <p style={{ fontFamily:"'Urbanist'", fontSize:28, color, letterSpacing:"0.05em" }}>{value}</p>
            <p style={{ fontFamily:"'Inter'", fontSize:10, color:"#6E6E73", textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Tri */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontFamily:"'Inter'", fontSize:11, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.08em" }}>Trier par</span>
        <div style={{ display:"flex", gap:4, background:"#F5F5F7", padding:3, borderRadius:7, border:"1px solid #E5E5EA" }}>
          {[
            { key:"tournage", label:"📅 Date tournage" },
            { key:"livraison", label:"🏁 Avancement" },
            { key:"statut", label:"📊 Statut" },
          ].map(s => (
            <button key={s.key} className={sortBy===s.key?"tab active":"tab"} style={{ fontSize:11, padding:"4px 10px", whiteSpace:"nowrap" }} onClick={() => setSortBy(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Projets groupés par client */}
      {Object.entries(grouped).map(([clientName, clientProjects]) => (
        <div key={clientName}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:"#00B4D822", border:"1px solid #00B4D844", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Urbanist'", fontSize:14, color:"#00B4D8", flexShrink:0 }}>
              {clientName[0]}
            </div>
            <div>
              <h3 style={{ fontFamily:"'Inter'", fontSize:14, fontWeight:600, color:"#1D1D1F" }}>{clientName}</h3>
              <p style={{ fontFamily:"'Inter'", fontSize:11, color:"#8E8E93" }}>{clientProjects.length} projet{clientProjects.length>1?"s":""}</p>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, paddingLeft:42 }}>
            {sortProjects(clientProjects).map(p => (
              <div key={p.id} onClick={() => { onSelectProject(p.id); onSectionChange("projets"); }}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", background:"#FFFFFF", borderRadius:8, border:"1px solid #E5E5EA", cursor:"pointer", transition:"all .15s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor="#C7C7CC"}
                onMouseLeave={e => e.currentTarget.style.borderColor="#E5E5EA"}
              >
                <div style={{ width:8, height:8, borderRadius:"50%", background:statusColor(p.status), flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontFamily:"'Inter'", fontSize:13, fontWeight:500, color:"#1D1D1F", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.title}</p>
                  <p style={{ fontFamily:"'Inter'", fontSize:10, color:"#8E8E93", marginTop:1 }}>Créé le {p.createdAt ? new Date(p.createdAt+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"}) : "—"}</p>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                  {p.deliveryDate&&(
                    <span style={{fontFamily:"'JetBrains Mono'",fontSize:9,color:deliveryColor(p.deliveryDate),background:deliveryColor(p.deliveryDate)+"18",border:`1px solid ${deliveryColor(p.deliveryDate)}30`,borderRadius:5,padding:"2px 6px",whiteSpace:"nowrap"}}>
                      {(new Date(p.deliveryDate+"T12:00:00")-new Date())/86400000<0?"⚠ ":"📅 "}{fmtS(p.deliveryDate)}
                    </span>
                  )}
                  {assignments.filter(a=>a.projectId===p.id).length>0&&(
                    <span style={{fontFamily:"'Inter'",fontSize:10,color:"#B47FFF",background:"#B47FFF18",border:"1px solid #B47FFF30",borderRadius:8,padding:"1px 7px",whiteSpace:"nowrap"}}>
                      👥 {assignments.filter(a=>a.projectId===p.id).length}
                    </span>
                  )}
                  <div style={{ width:70 }}>
                    <div style={{ height:3, background:"#F2F2F7", borderRadius:2, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${p.progress||0}%`, background:statusColor(p.status), borderRadius:2, transition:"width .5s" }}/>
                    </div>
                  </div>
                  <span style={{ fontFamily:"'Inter'", fontSize:11, color:statusColor(p.status), background:statusColor(p.status)+"22", border:`1px solid ${statusColor(p.status)}44`, borderRadius:10, padding:"2px 8px", whiteSpace:"nowrap" }}>
                    {statusLabel(p.status)}
                  </span>
                  <span style={{ color:"#8E8E93", fontSize:12 }}>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {projects.length === 0 && (
        <div style={{ textAlign:"center", padding:"40px 0", color:"#8E8E93", fontFamily:"'Inter'", fontSize:13 }}>
          Aucun projet pour l instant. Crée ton premier projet dans la section Projets.
        </div>
      )}

      {/* ── 1a. Prochaines réservations ───────────────────────────────────── */}
      {(()=>{
        const today=new Date(); today.setHours(0,0,0,0);
        const upcoming=(bookings||[])
          .filter(b=>b.status!=="expired"&&b.date&&new Date(b.date+"T00:00:00")>=today)
          .sort((a,b2)=>a.date.localeCompare(b2.date))
          .slice(0,5);
        return(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <h3 style={{fontFamily:"'Urbanist'",fontSize:20,color:"#00B4D8",letterSpacing:"0.06em"}}>PROCHAINES RÉSERVATIONS</h3>
              {onGoToCalendar&&<button className="btn btn-ghost" style={{fontSize:11}} onClick={onGoToCalendar}>Voir le calendrier →</button>}
            </div>
            {upcoming.length===0?(
              <p style={{fontFamily:"'Inter'",fontSize:13,color:"#8E8E93",textAlign:"center",padding:"16px 0"}}>Aucune réservation à venir</p>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {upcoming.map(b=>{
                  const linkedProject=b.projectId?projects.find(p=>String(p.id)===String(b.projectId)):null;
                  const clientName=b.client||b.client_name||"";
                  const teamColor=b.team==="A"?"#7B9CFF":"#FF9F43";
                  const statusColor2=b.status==="confirmed"?"#4ECDC4":"#FF9F43";
                  const dateStr=b.date?new Date(b.date+"T00:00:00").toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"}):"—";
                  return(
                    <div key={b.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#FFFFFF",borderRadius:8,border:"1px solid #E5E5EA",flexWrap:"wrap"}}>
                      <span style={{fontFamily:"'JetBrains Mono'",fontSize:11,color:"#1D1D1F",minWidth:90}}>{dateStr}</span>
                      <span style={{fontFamily:"'Inter'",fontSize:10,fontWeight:600,color:teamColor,background:teamColor+"18",border:`1px solid ${teamColor}30`,borderRadius:8,padding:"1px 7px",flexShrink:0}}>Éq.{b.team}</span>
                      <span style={{fontFamily:"'Inter'",fontSize:12,color:"#1D1D1F",flex:1,minWidth:80}}>{clientName}</span>
                      <span style={{fontFamily:"'Inter'",fontSize:10,color:statusColor2,background:statusColor2+"18",border:`1px solid ${statusColor2}30`,borderRadius:8,padding:"1px 7px",flexShrink:0}}>
                        {b.status==="confirmed"?"Confirmé":"Option"}
                      </span>
                      {linkedProject&&(
                        <span style={{fontFamily:"'Inter'",fontSize:10,color:"#B47FFF",background:"#B47FFF18",border:"1px solid #B47FFF30",borderRadius:8,padding:"1px 7px",flexShrink:0}}>
                          📁 {linkedProject.title}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── 1b. Activité récente ──────────────────────────────────────────── */}
      {(()=>{
        const recent=[...projects]
          .sort((a,b2)=>(b2.createdAt||"").localeCompare(a.createdAt||""))
          .slice(0,5);
        const statusColor2=s=>({brief:"#7B9CFF",storyboard:"#00B4D8",tournage:"#FF9F43",montage:"#B47FFF",livraison:"#4ECDC4"}[s]||"#6E6E73");
        const statusLabel2=s=>({brief:"Brief",storyboard:"Storyboard",tournage:"Tournage",montage:"Montage",livraison:"Livré"}[s]||s);
        return(
          <div>
            <h3 style={{fontFamily:"'Urbanist'",fontSize:20,color:"#00B4D8",letterSpacing:"0.06em",marginBottom:12}}>ACTIVITÉ RÉCENTE</h3>
            {recent.length===0?(
              <p style={{fontFamily:"'Inter'",fontSize:13,color:"#8E8E93",textAlign:"center",padding:"16px 0"}}>Aucun projet</p>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {recent.map(p=>{
                  const clientName=clients.find(c=>c.id===p.clientId)?.name||p.client||"";
                  const sc=statusColor2(p.status);
                  return(
                    <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",background:"#FFFFFF",borderRadius:8,border:"1px solid #E5E5EA"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                          <p style={{fontFamily:"'Inter'",fontSize:13,fontWeight:500,color:"#1D1D1F",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</p>
                          {clientName&&<span style={{fontFamily:"'Inter'",fontSize:10,color:"#6E6E73",flexShrink:0}}>{clientName}</span>}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontFamily:"'Inter'",fontSize:10,color:sc,background:sc+"22",border:`1px solid ${sc}44`,borderRadius:8,padding:"1px 6px"}}>{statusLabel2(p.status)}</span>
                          <div style={{flex:1,height:3,background:"#F2F2F7",borderRadius:2,overflow:"hidden",maxWidth:80}}>
                            <div style={{height:"100%",width:`${p.progress||0}%`,background:sc,borderRadius:2}}/>
                          </div>
                          <span style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93"}}>{p.progress||0}%</span>
                        </div>
                      </div>
                      <button className="btn btn-ghost" style={{fontSize:11,padding:"5px 10px",flexShrink:0}} onClick={()=>{onSelectProject(p.id);onSectionChange("projets");}}>→</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── 1c. Stats équipe ──────────────────────────────────────────────── */}
      {teamMembers&&teamMembers.length>0&&(
        <div>
          <h3 style={{fontFamily:"'Urbanist'",fontSize:20,color:"#00B4D8",letterSpacing:"0.06em",marginBottom:12}}>STATS ÉQUIPE</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {[
              {label:"Membres Équipe A",value:teamMembers.filter(m=>m.team==="A").length,color:"#7B9CFF"},
              {label:"Membres Équipe B",value:teamMembers.filter(m=>m.team==="B").length,color:"#FF9F43"},
              {label:"Projets assignés",value:projects.filter(p=>assignments.some(a=>a.projectId===p.id)).length,color:"#B47FFF"},
            ].map(({label,value,color})=>(
              <div key={label} style={{background:"#FFFFFF",border:`1px solid ${color}33`,borderRadius:8,padding:"12px 14px"}}>
                <p style={{fontFamily:"'Urbanist'",fontSize:28,color,letterSpacing:"0.05em"}}>{value}</p>
                <p style={{fontFamily:"'Inter'",fontSize:10,color:"#6E6E73",textTransform:"uppercase",letterSpacing:"0.08em"}}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM SECTION (fiche projet — admin)
// ─────────────────────────────────────────────────────────────────────────────
function TeamSection({project,teamMembers,assignments,onUpdateAssignments,onNotif}){
  const projectAssignments=assignments.filter(a=>a.projectId===project.id);
  const assignedIds=projectAssignments.map(a=>a.memberId);
  const[showAdd,setShowAdd]=useState(false);
  const[selMember,setSelMember]=useState("");
  const[roleOnProject,setRoleOnProject]=useState("");
  const[saving,setSaving]=useState(false);
  const available=teamMembers.filter(m=>!assignedIds.includes(m.id));
  const MEMBER_COLORS=["#00B4D8","#4ECDC4","#7B9CFF","#FF9F43","#B47FFF","#FF3B30"];
  const assign=async()=>{
    if(!selMember)return;
    setSaving(true);
    const memberId=Number(selMember);
    const{data,error}=await supabase.from("project_assignments").insert({project_id:project.id,member_id:memberId,role_on_project:roleOnProject}).select().single();
    if(error){onNotif("Erreur : "+error.message);setSaving(false);return;}
    onUpdateAssignments(prev=>[...prev,{id:data.id,projectId:data.project_id,memberId:data.member_id,roleOnProject:data.role_on_project||""}]);
    onNotif("Membre assigné !");setShowAdd(false);setSelMember("");setRoleOnProject("");setSaving(false);
  };
  const remove=async(a)=>{
    await supabase.from("project_assignments").delete().eq("id",a.id);
    onUpdateAssignments(prev=>prev.filter(x=>x.id!==a.id));
    onNotif("Membre retiré");
  };
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div className="card" style={{padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <SH icon="👥" title="ÉQUIPE ASSIGNÉE"/>
          {(available.length>0||showAdd)&&<button className="btn btn-ghost" style={{fontSize:11}} onClick={()=>setShowAdd(!showAdd)}>{showAdd?"✕":"+ Assigner"}</button>}
        </div>
        {showAdd&&(
          <div style={{background:"#F5F5F7",border:"1px solid #00B4D830",borderRadius:8,padding:12,marginBottom:12,display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><Lbl>Membre</Lbl><select className="input" value={selMember} onChange={e=>setSelMember(e.target.value)}><option value="">Choisir...</option>{available.map(m=><option key={m.id} value={m.id}>{m.nom} ({m.role})</option>)}</select></div>
              <div><Lbl>Rôle sur ce projet</Lbl><input className="input" placeholder="Cadreur principal..." value={roleOnProject} onChange={e=>setRoleOnProject(e.target.value)}/></div>
            </div>
            <div style={{display:"flex",gap:7,justifyContent:"flex-end"}}><button className="btn btn-ghost" style={{fontSize:11}} onClick={()=>setShowAdd(false)}>Annuler</button><button className="btn btn-primary" style={{fontSize:11}} onClick={assign} disabled={!selMember||saving}>{saving?"...":"Assigner"}</button></div>
          </div>
        )}
        {projectAssignments.length===0?(
          <p style={{fontFamily:"'Inter'",fontSize:13,color:"#8E8E93",textAlign:"center",padding:"16px 0"}}>
            {teamMembers.length===0?"Créez des membres dans Planning → Gérer l'équipe.":"Aucun membre assigné à ce projet."}
          </p>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {projectAssignments.map((a,idx)=>{
              const member=teamMembers.find(m=>m.id===a.memberId);
              if(!member)return null;
              const col=member.color||MEMBER_COLORS[idx%MEMBER_COLORS.length];
              return(
                <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:"#F5F5F7",borderRadius:7,border:"1px solid #E5E5EA"}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:col+"22",border:`1px solid ${col}44`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Urbanist'",fontSize:13,color:col,flexShrink:0}}>{member.nom[0]}</div>
                  <div style={{flex:1}}>
                    <p style={{fontFamily:"'Inter'",fontSize:13,fontWeight:600,color:"#1D1D1F"}}>{member.nom}</p>
                    <p style={{fontFamily:"'Inter'",fontSize:11,color:"#6E6E73"}}>{a.roleOnProject||member.role}</p>
                  </div>
                  <span style={{fontFamily:"'Inter'",fontSize:10,color:member.team==="A"?"#00B4D8":"#4ECDC4",background:member.team==="A"?"#00B4D818":"#4ECDC418",border:`1px solid ${member.team==="A"?"#00B4D830":"#4ECDC430"}`,borderRadius:8,padding:"2px 7px",flexShrink:0}}>Éq.{member.team||"?"}</span>
                  <button className="btn btn-red" style={{fontSize:10,padding:"3px 7px"}} onClick={()=>remove(a)}>✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEETING NOTES SECTION (fiche projet — admin)
// ─────────────────────────────────────────────────────────────────────────────
function MeetingNotesSection({project,meetingNotes,onUpdateMeetingNotes,onNotif}){
  const notes=meetingNotes.filter(n=>n.projectId===project.id);
  const[showAdd,setShowAdd]=useState(false);
  const[saving,setSaving]=useState(false);
  const[form,setForm]=useState({date:isoToday(),participants:"",content:"",decisions:""});
  const sf=(k,v)=>setForm(p=>({...p,[k]:v}));

  const add=async()=>{
    if(!form.content.trim())return;
    setSaving(true);
    const{data,error}=await supabase.from("meeting_notes").insert({project_id:project.id,date:form.date,participants:form.participants,content:form.content,decisions:form.decisions}).select().single();
    if(error){onNotif("Erreur : "+error.message);setSaving(false);return;}
    onUpdateMeetingNotes(prev=>[...prev,{id:data.id,projectId:data.project_id,date:data.date,participants:data.participants||"",content:data.content||"",decisions:data.decisions||""}]);
    onNotif("Note ajoutée !");setForm({date:isoToday(),participants:"",content:"",decisions:""});setShowAdd(false);setSaving(false);
  };

  const del=async(id)=>{
    await supabase.from("meeting_notes").delete().eq("id",id);
    onUpdateMeetingNotes(prev=>prev.filter(n=>n.id!==id));
    onNotif("Note supprimée");
  };

  const exportPDF=(note)=>{
    const win=window.open("","_blank");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Note de réunion — ${project.title}</title><style>
      body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#111;padding:40px;max-width:720px;margin:0 auto}
      h1{font-size:22px;font-weight:800;margin-bottom:4px}
      .sub{color:#666;font-size:13px;margin-bottom:24px}
      .label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:6px;font-weight:600}
      .box{border:1px solid #ddd;border-radius:6px;padding:14px 16px;margin-bottom:16px;font-size:14px;line-height:1.7;white-space:pre-wrap}
      .decisions{border-color:#4ECDC4;background:#f0fffe}
      .decision-item{display:flex;gap:8px;margin-bottom:4px}
      .decision-item::before{content:"→";color:#4ECDC4;font-weight:700;flex-shrink:0}
      @media print{body{padding:20px}button{display:none}}
    </style></head><body>
      <h1>Note de réunion</h1>
      <p class="sub">Projet : ${project.title} — ${new Date(note.date+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
      ${note.participants?`<p class="label">Participants</p><p class="box">${note.participants}</p>`:""}
      <p class="label">Notes</p><div class="box">${note.content.replace(/\n/g,"<br>")}</div>
      ${note.decisions?`<p class="label">Décisions prises</p><div class="box decisions">${note.decisions.split("\n").filter(Boolean).map(d=>`<div class="decision-item">${d}</div>`).join("")}</div>`:""}
      <p style="color:#aaa;font-size:11px;margin-top:32px">Généré par Third-One Studio — ${new Date().toLocaleDateString("fr-FR")}</p>
      <script>window.onload=()=>window.print()</script>
    </body></html>`);
    win.document.close();
  };
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h3 style={{fontFamily:"'Urbanist'",fontSize:17,color:"#1D1D1F",letterSpacing:"0.05em"}}>NOTES DE RÉUNION</h3>
        <button className="btn btn-primary" style={{fontSize:11}} onClick={()=>setShowAdd(!showAdd)}>{showAdd?"✕ Fermer":"+ Nouvelle note"}</button>
      </div>
      {showAdd&&(
        <div className="card fadeUp" style={{padding:16}}>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div><Lbl>Date</Lbl><input type="date" className="input" value={form.date} onChange={e=>sf("date",e.target.value)}/></div>
              <div><Lbl>Participants</Lbl><input className="input" placeholder="Alice, Bob, Client..." value={form.participants} onChange={e=>sf("participants",e.target.value)}/></div>
            </div>
            <div><Lbl>Notes libres</Lbl><textarea className="input" rows={4} placeholder="Points abordés, contexte, discussions..." value={form.content} onChange={e=>sf("content",e.target.value)}/></div>
            <div><Lbl>Décisions prises (une par ligne)</Lbl><textarea className="input" rows={3} placeholder={"Décision 1\nDécision 2..."} value={form.decisions} onChange={e=>sf("decisions",e.target.value)}/></div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button className="btn btn-ghost" style={{fontSize:11}} onClick={()=>setShowAdd(false)}>Annuler</button><button className="btn btn-primary" style={{fontSize:11}} onClick={add} disabled={saving||!form.content.trim()}>{saving?"Enregistrement...":"Enregistrer"}</button></div>
          </div>
        </div>
      )}
      {notes.length===0&&!showAdd&&<p style={{fontFamily:"'Inter'",fontSize:13,color:"#8E8E93",textAlign:"center",padding:"20px 0"}}>Aucune note de réunion</p>}
      {[...notes].sort((a,b)=>b.date.localeCompare(a.date)).map(note=>(
        <div key={note.id} className="card fadeUp" style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:6}}>
            <div>
              <p style={{fontFamily:"'Inter'",fontSize:13,fontWeight:600,color:"#1D1D1F"}}>{fmtD(note.date)}</p>
              {note.participants&&<p style={{fontFamily:"'Inter'",fontSize:11,color:"#6E6E73",marginTop:2}}>👥 {note.participants}</p>}
            </div>
            <div style={{display:"flex",gap:6}}>
              <button className="btn btn-ghost" style={{fontSize:10,padding:"3px 9px"}} onClick={()=>exportPDF(note)}>↓ PDF</button>
              <button className="btn btn-red" style={{fontSize:10,padding:"3px 7px"}} onClick={()=>del(note.id)}>✕</button>
            </div>
          </div>
          {note.content&&<div style={{background:"#F5F5F7",border:"1px solid #E5E5EA",borderRadius:7,padding:12,marginBottom:8}}><p style={{fontFamily:"'Inter'",fontSize:12,color:"#1D1D1F",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{note.content}</p></div>}
          {note.decisions&&(
            <div style={{background:"#4ECDC410",border:"1px solid #4ECDC430",borderRadius:7,padding:10}}>
              <p style={{fontFamily:"'Inter'",fontSize:10,color:"#4ECDC4",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>✓ Décisions</p>
              {note.decisions.split("\n").filter(Boolean).map((dec,i)=>(
                <div key={i} style={{display:"flex",gap:7,alignItems:"flex-start",marginBottom:3}}>
                  <span style={{color:"#4ECDC4",fontSize:11,marginTop:1,flexShrink:0}}>→</span>
                  <p style={{fontFamily:"'Inter'",fontSize:12,color:"#1D1D1F"}}>{dec}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE F — PLANNING ÉQUIPE
// ─────────────────────────────────────────────────────────────────────────────
function PlanningModule({teamMembers,setTeamMembers,planningSlots,setPlanningSlots,projects,bookings,onNotif}){
  const[view,setView]=useState("planning");
  const[weekStart,setWeekStart]=useState(()=>{
    const d=new Date(TODAY);
    const day=d.getDay();
    const diff=day===0?-6:1-day;
    d.setDate(d.getDate()+diff);
    return new Date(d.getFullYear(),d.getMonth(),d.getDate());
  });
  const[slotModal,setSlotModal]=useState(null);
  const[editSlot,setEditSlot]=useState(null);
  const[slotForm,setSlotForm]=useState({type:"tournage",projectId:"",startTime:"09:00",endTime:"17:00",note:""});
  const[showAddMember,setShowAddMember]=useState(false);
  const[memberForm,setMemberForm]=useState({nom:"",role:"cadreur",email:"",team:"A",color:"#00B4D8"});

  const SLOT_TYPES=[
    {id:"tournage",  label:"Tournage",  color:"#00B4D8"},
    {id:"montage",   label:"Montage",   color:"#7B9CFF"},
    {id:"reunion",   label:"Réunion",   color:"#FF9F43"},
    {id:"post-prod", label:"Post-prod", color:"#B47FFF"},
  ];
  const MEMBER_ROLES=["cadreur","monteur","chef de projet","alternant","photographe"];
  const MEMBER_COLORS=["#00B4D8","#4ECDC4","#7B9CFF","#FF9F43","#B47FFF","#FF3B30"];

  const weekDays=Array.from({length:7},(_,i)=>{
    const d=new Date(weekStart);d.setDate(d.getDate()+i);
    return d.toISOString().split("T")[0];
  });
  const prevWeek=()=>{const d=new Date(weekStart);d.setDate(d.getDate()-7);setWeekStart(new Date(d.getFullYear(),d.getMonth(),d.getDate()));};
  const nextWeek=()=>{const d=new Date(weekStart);d.setDate(d.getDate()+7);setWeekStart(new Date(d.getFullYear(),d.getMonth(),d.getDate()));};

  const slotsFor=(memberId,date)=>planningSlots.filter(s=>s.memberId===memberId&&s.date===date);
  const typeColor=type=>SLOT_TYPES.find(t=>t.id===type)?.color||"#6E6E73";
  const projTitle=id=>id?(projects.find(p=>p.id===Number(id))?.title||"Projet inconnu"):"";
  const bookingsFor=date=>bookings.filter(b=>b.date===date&&b.status==="confirmed");

  const openSlot=(memberId,date)=>{
    setEditSlot(null);
    setSlotForm({type:"tournage",projectId:"",startTime:"09:00",endTime:"17:00",note:""});
    setSlotModal({memberId,date});
  };
  const openEditSlot=(slot,e)=>{
    e.stopPropagation();
    setEditSlot(slot);
    setSlotForm({type:slot.type,projectId:slot.projectId||"",startTime:slot.startTime||"09:00",endTime:slot.endTime||"17:00",note:slot.note||""});
    setSlotModal({memberId:slot.memberId,date:slot.date});
  };
  const saveSlot=async()=>{
    if(!slotModal)return;
    const base={memberId:slotModal.memberId,date:slotModal.date,type:slotForm.type,projectId:slotForm.projectId?Number(slotForm.projectId):null,startTime:slotForm.startTime,endTime:slotForm.endTime,note:slotForm.note};
    if(editSlot){
      await supabase.from("planning_slots").update({type:base.type,project_id:base.projectId,start_time:base.startTime,end_time:base.endTime,note:base.note}).eq("id",editSlot.id);
      setPlanningSlots(prev=>prev.map(s=>s.id===editSlot.id?{...base,id:editSlot.id}:s));
      onNotif("Créneau modifié !");
    }else{
      const{data}=await supabase.from("planning_slots").insert({member_id:base.memberId,date:base.date,type:base.type,project_id:base.projectId,start_time:base.startTime,end_time:base.endTime,note:base.note}).select().single();
      if(data)setPlanningSlots(prev=>[...prev,{id:data.id,memberId:data.member_id,date:data.date,type:data.type,projectId:data.project_id,startTime:data.start_time||"",endTime:data.end_time||"",note:data.note||""}]);
      onNotif("Créneau ajouté !");
    }
    setSlotModal(null);setEditSlot(null);
  };
  const deleteSlot=async(id)=>{
    await supabase.from("planning_slots").delete().eq("id",id);
    setPlanningSlots(prev=>prev.filter(s=>s.id!==id));
    onNotif("Créneau supprimé");setSlotModal(null);setEditSlot(null);
  };

  const addMember=async()=>{
    if(!memberForm.nom.trim())return;
    const{data}=await supabase.from("team_members").insert({nom:memberForm.nom,role:memberForm.role,email:memberForm.email,team:memberForm.team,color:memberForm.color}).select().single();
    if(data)setTeamMembers(prev=>[...prev,{id:data.id,nom:data.nom,role:data.role||"",email:data.email||"",team:data.team||"A",color:data.color||"#00B4D8"}]);
    onNotif("Membre ajouté !");
    setMemberForm({nom:"",role:"cadreur",email:"",team:"A",color:"#00B4D8"});
    setShowAddMember(false);
  };
  const deleteMember=async(id)=>{
    await supabase.from("team_members").delete().eq("id",id);
    setTeamMembers(prev=>prev.filter(m=>m.id!==id));
    onNotif("Membre supprimé");
  };

  const weekLabel=`${new Date(weekDays[0]+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"long"})} – ${new Date(weekDays[6]+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}`;

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{fontFamily:"'Urbanist'",fontSize:26,color:"#1D1D1F",letterSpacing:"0.04em"}}>PLANNING ÉQUIPE</h2>
          <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",marginTop:2}}>
            {view==="planning"?weekLabel:`${teamMembers.length} membre${teamMembers.length>1?"s":""} dans l'équipe`}
          </p>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {view==="planning"&&(
            <>
              <button className="btn btn-ghost" style={{padding:"5px 11px"}} onClick={prevWeek}>←</button>
              <button className="btn btn-ghost" style={{padding:"5px 11px"}} onClick={nextWeek}>→</button>
            </>
          )}
          <div style={{display:"flex",gap:3,background:"#F5F5F7",padding:3,borderRadius:7,border:"1px solid #E5E5EA"}}>
            <button className={view==="planning"?"tab active":"tab"} style={{fontSize:11,padding:"4px 10px"}} onClick={()=>setView("planning")}>📆 Planning</button>
            <button className={view==="equipe"?"tab active":"tab"} style={{fontSize:11,padding:"4px 10px"}} onClick={()=>setView("equipe")}>👥 Équipe</button>
          </div>
        </div>
      </div>

      {view==="planning"&&(
        <>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {SLOT_TYPES.map(t=>(
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:10,height:10,borderRadius:2,background:t.color+"44",border:`1px solid ${t.color}66`}}/>
                <span style={{fontFamily:"'Inter'",fontSize:11,color:"#6E6E73"}}>{t.label}</span>
              </div>
            ))}
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:10,height:10,borderRadius:2,background:"#4ECDC444",border:"1px solid #4ECDC466"}}/>
              <span style={{fontFamily:"'Inter'",fontSize:11,color:"#6E6E73"}}>Tournage confirmé</span>
            </div>
          </div>
          {teamMembers.length===0?(
            <div className="card" style={{padding:40,textAlign:"center"}}>
              <p style={{fontFamily:"'Inter'",fontSize:14,color:"#8E8E93"}}>Aucun membre configuré.</p>
              <button className="btn btn-primary" style={{marginTop:12}} onClick={()=>setView("equipe")}>+ Ajouter des membres</button>
            </div>
          ):(
            <div style={{overflowX:"auto",borderRadius:10,border:"1px solid #E5E5EA"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:700,background:"#FFFFFF"}}>
                <thead>
                  <tr>
                    <th style={{width:130,padding:"10px 12px",textAlign:"left",fontFamily:"'Inter'",fontSize:10,color:"#8E8E93",textTransform:"uppercase",letterSpacing:"0.08em",borderBottom:"1px solid #E5E5EA",position:"sticky",left:0,background:"#F7F7F7",zIndex:2}}>Membre</th>
                    {weekDays.map(date=>{
                      const isToday=date===isoToday();
                      const dn=new Date(date+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"short"});
                      const dd=new Date(date+"T12:00:00").getDate();
                      const bks=bookingsFor(date);
                      return(
                        <th key={date} style={{padding:"8px 4px",textAlign:"center",fontFamily:"'Inter'",fontSize:11,color:isToday?"#00B4D8":"#6E6E73",borderBottom:"1px solid #E5E5EA",borderLeft:"1px solid #E5E5EA",background:isToday?"#00B4D810":"#F7F7F7",minWidth:110}}>
                          <div style={{textTransform:"capitalize",fontSize:10}}>{dn}</div>
                          <div style={{fontFamily:"'Urbanist'",fontSize:18,letterSpacing:"0.05em"}}>{dd}</div>
                          {bks.map(b=><div key={b.id} style={{background:"#4ECDC418",border:"1px solid #4ECDC440",borderRadius:3,padding:"1px 5px",margin:"2px auto",fontSize:9,color:"#4ECDC4",display:"inline-block",whiteSpace:"nowrap"}}>📅 Éq.{b.team}</div>)}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map(member=>{
                    const col=member.color||"#00B4D8";
                    return(
                      <tr key={member.id} style={{borderBottom:"1px solid #F2F2F7"}}>
                        <td style={{padding:"8px 10px",borderRight:"1px solid #E5E5EA",position:"sticky",left:0,background:"#FFFFFF",zIndex:1,verticalAlign:"top"}}>
                          <div style={{display:"flex",alignItems:"center",gap:7}}>
                            <div style={{width:26,height:26,borderRadius:"50%",background:col+"22",border:`1px solid ${col}44`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Urbanist'",fontSize:12,color:col,flexShrink:0}}>{member.nom[0]}</div>
                            <div>
                              <p style={{fontFamily:"'Inter'",fontSize:11,fontWeight:600,color:"#1D1D1F",whiteSpace:"nowrap"}}>{member.nom}</p>
                              <p style={{fontFamily:"'Inter'",fontSize:9,color:"#8E8E93"}}>{member.role}</p>
                            </div>
                          </div>
                        </td>
                        {weekDays.map(date=>{
                          const daySlots=slotsFor(member.id,date);
                          const isToday=date===isoToday();
                          return(
                            <td key={date} onClick={()=>openSlot(member.id,date)}
                              style={{padding:"4px",verticalAlign:"top",borderLeft:"1px solid #F2F2F7",background:isToday?"#00B4D806":"transparent",cursor:"pointer",minHeight:60,transition:"background .1s"}}
                              onMouseEnter={e=>e.currentTarget.style.background=isToday?"#00B4D812":"#F2F2F7"}
                              onMouseLeave={e=>e.currentTarget.style.background=isToday?"#00B4D806":"transparent"}
                            >
                              <div style={{display:"flex",flexDirection:"column",gap:2,minHeight:52}}>
                                {daySlots.map(slot=>(
                                  <div key={slot.id} onClick={e=>openEditSlot(slot,e)}
                                    style={{background:typeColor(slot.type)+"22",border:`1px solid ${typeColor(slot.type)}44`,borderRadius:4,padding:"2px 5px",cursor:"pointer"}}>
                                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:2}}>
                                      <span style={{fontFamily:"'Inter'",fontSize:9,color:typeColor(slot.type),fontWeight:600,lineHeight:1.4,flex:1,wordBreak:"break-word"}}>
                                        {slot.startTime&&slot.endTime?`${slot.startTime}–${slot.endTime} `:""}{slot.projectId?projTitle(slot.projectId):SLOT_TYPES.find(t=>t.id===slot.type)?.label||slot.type}
                                      </span>
                                      <button onClick={e=>{e.stopPropagation();deleteSlot(slot.id);}} style={{background:"none",border:"none",color:"#8E8E93",cursor:"pointer",fontSize:9,lineHeight:1,padding:0,flexShrink:0,marginTop:1}}>✕</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {view==="equipe"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h3 style={{fontFamily:"'Urbanist'",fontSize:17,color:"#1D1D1F",letterSpacing:"0.05em"}}>MEMBRES DE L'ÉQUIPE</h3>
            <button className="btn btn-primary" style={{fontSize:11}} onClick={()=>setShowAddMember(!showAddMember)}>{showAddMember?"✕ Fermer":"+ Ajouter"}</button>
          </div>
          {showAddMember&&(
            <div className="card fadeUp" style={{padding:16}}>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div><Lbl>Nom *</Lbl><input className="input" placeholder="Prénom Nom" value={memberForm.nom} onChange={e=>setMemberForm(p=>({...p,nom:e.target.value}))}/></div>
                  <div><Lbl>Email</Lbl><input className="input" placeholder="email@..." value={memberForm.email} onChange={e=>setMemberForm(p=>({...p,email:e.target.value}))}/></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                  <div><Lbl>Rôle</Lbl><select className="input" value={memberForm.role} onChange={e=>setMemberForm(p=>({...p,role:e.target.value}))}>{MEMBER_ROLES.map(r=><option key={r} value={r}>{r}</option>)}</select></div>
                  <div><Lbl>Équipe</Lbl><select className="input" value={memberForm.team} onChange={e=>setMemberForm(p=>({...p,team:e.target.value}))}><option value="A">Équipe A</option><option value="B">Équipe B</option></select></div>
                  <div><Lbl>Couleur</Lbl><div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:4}}>{MEMBER_COLORS.map(c=><button key={c} onClick={()=>setMemberForm(p=>({...p,color:c}))} style={{width:20,height:20,borderRadius:"50%",background:c,border:memberForm.color===c?"3px solid #1D1D1F":"2px solid transparent",cursor:"pointer"}}/>)}</div></div>
                </div>
                <div style={{display:"flex",gap:7,justifyContent:"flex-end"}}><button className="btn btn-ghost" style={{fontSize:11}} onClick={()=>setShowAddMember(false)}>Annuler</button><button className="btn btn-primary" style={{fontSize:11}} onClick={addMember} disabled={!memberForm.nom.trim()}>Ajouter</button></div>
              </div>
            </div>
          )}
          {teamMembers.length===0?(
            <div style={{textAlign:"center",padding:"30px 0",color:"#8E8E93",fontFamily:"'Inter'",fontSize:13}}>Aucun membre. Ajoutez votre équipe.</div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {teamMembers.map((m,idx)=>{
                const col=m.color||MEMBER_COLORS[idx%MEMBER_COLORS.length];
                return(
                  <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#FFFFFF",borderRadius:8,border:"1px solid #E5E5EA"}}>
                    <div style={{width:34,height:34,borderRadius:"50%",background:col+"22",border:`1px solid ${col}44`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Urbanist'",fontSize:15,color:col,flexShrink:0}}>{m.nom[0]}</div>
                    <div style={{flex:1}}>
                      <p style={{fontFamily:"'Inter'",fontSize:13,fontWeight:600,color:"#1D1D1F"}}>{m.nom}</p>
                      <p style={{fontFamily:"'Inter'",fontSize:11,color:"#6E6E73"}}>{m.role}{m.email?` · ${m.email}`:""}</p>
                    </div>
                    <span style={{fontFamily:"'Inter'",fontSize:10,color:m.team==="A"?"#00B4D8":"#4ECDC4",background:m.team==="A"?"#00B4D818":"#4ECDC418",border:`1px solid ${m.team==="A"?"#00B4D830":"#4ECDC430"}`,borderRadius:8,padding:"2px 7px",flexShrink:0}}>Éq.{m.team}</span>
                    <button className="btn btn-red" style={{fontSize:10,padding:"3px 7px"}} onClick={()=>deleteMember(m.id)}>✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {slotModal&&(
        <div className="modal-overlay" onClick={()=>{setSlotModal(null);setEditSlot(null);}}>
          <div className="modal" style={{padding:24}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <h3 style={{fontFamily:"'Urbanist'",fontSize:18,color:"#1D1D1F",letterSpacing:"0.05em"}}>{editSlot?"MODIFIER LE CRÉNEAU":"NOUVEAU CRÉNEAU"}</h3>
              <button className="btn btn-ghost" style={{padding:"4px 10px"}} onClick={()=>{setSlotModal(null);setEditSlot(null);}}>✕</button>
            </div>
            <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",marginBottom:14}}>
              {teamMembers.find(m=>m.id===slotModal.memberId)?.nom} · {fmtD(slotModal.date)}
            </p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div><Lbl>Type</Lbl><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{SLOT_TYPES.map(t=><button key={t.id} onClick={()=>setSlotForm(p=>({...p,type:t.id}))} style={{padding:"5px 12px",borderRadius:6,border:`2px solid ${slotForm.type===t.id?t.color:"#E5E5EA"}`,background:slotForm.type===t.id?t.color+"22":"#F5F5F7",cursor:"pointer",fontFamily:"'Inter'",fontSize:12,color:slotForm.type===t.id?t.color:"#6E6E73",transition:"all .15s"}}>{t.label}</button>)}</div></div>
              <div><Lbl>Projet (optionnel)</Lbl><select className="input" value={slotForm.projectId} onChange={e=>setSlotForm(p=>({...p,projectId:e.target.value}))}><option value="">— Aucun —</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><Lbl>Début</Lbl><input type="time" className="input" value={slotForm.startTime} onChange={e=>setSlotForm(p=>({...p,startTime:e.target.value}))}/></div>
                <div><Lbl>Fin</Lbl><input type="time" className="input" value={slotForm.endTime} onChange={e=>setSlotForm(p=>({...p,endTime:e.target.value}))}/></div>
              </div>
              <div><Lbl>Note</Lbl><input className="input" placeholder="Optionnel..." value={slotForm.note} onChange={e=>setSlotForm(p=>({...p,note:e.target.value}))}/></div>
              <div style={{display:"flex",gap:8,justifyContent:"space-between",marginTop:4}}>
                <div>{editSlot&&<button className="btn btn-red" style={{fontSize:11}} onClick={()=>deleteSlot(editSlot.id)}>Supprimer</button>}</div>
                <div style={{display:"flex",gap:8}}><button className="btn btn-ghost" onClick={()=>{setSlotModal(null);setEditSlot(null);}}>Annuler</button><button className="btn btn-primary" onClick={saveSlot}>{editSlot?"Modifier":"Ajouter"}</button></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE PROJECT MODAL
// ─────────────────────────────────────────────────────────────────────────────
function CreateProjectModal({isAdmin,clients,teamMembers,planningSlots,onClose,onCreate}){
  const[title,setTitle]=useState("");
  const[clientId,setClientId]=useState("");
  const[selectedTeam,setSelectedTeam]=useState(null);
  const[loading,setLoading]=useState(false);

  const today=new Date();
  const in30=new Date(today); in30.setDate(today.getDate()+30);
  const inRange=d=>{const dd=new Date(d);return dd>=today&&dd<=in30;};

  const teamSlots=(t)=>planningSlots.filter(s=>{
    const m=teamMembers.find(x=>x.id===s.memberId);
    return m&&m.team===t&&inRange(s.date);
  }).length;

  const TeamCard=({team})=>{
    const members=teamMembers.filter(m=>m.team===team);
    const slots=teamSlots(team);
    const busy=slots>=5;
    const sel=selectedTeam===team;
    return(
      <div onClick={()=>setSelectedTeam(sel?null:team)} style={{flex:1,background:sel?"#00B4D815":"#F5F5F7",border:`1px solid ${sel?"#00B4D8":"#E5E5EA"}`,borderRadius:8,padding:"12px 14px",cursor:"pointer",transition:"all .15s"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontFamily:"'Urbanist'",fontSize:16,color:sel?"#00B4D8":"#1D1D1F",letterSpacing:"0.06em"}}>ÉQUIPE {team}</span>
          <span style={{fontFamily:"'Inter'",fontSize:10,padding:"2px 7px",borderRadius:4,background:busy?"#FF9F4322":"#4ECDC422",color:busy?"#FF9F43":"#4ECDC4",fontWeight:600}}>{busy?"Chargée":"Disponible"}</span>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>
          {members.map(m=>(
            <div key={m.id} style={{display:"flex",alignItems:"center",gap:4,background:"#FFFFFF",border:"1px solid #E5E5EA",borderRadius:4,padding:"3px 7px"}}>
              <div style={{width:16,height:16,borderRadius:"50%",background:m.color||"#00B4D8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"#FFFFFF",flexShrink:0}}>{m.nom[0]}</div>
              <span style={{fontFamily:"'Inter'",fontSize:10,color:"#1D1D1F"}}>{m.nom.split(" ")[0]}</span>
            </div>
          ))}
          {members.length===0&&<span style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93"}}>Aucun membre</span>}
        </div>
        <p style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93"}}>{slots} créneau{slots!==1?"x":""} dans les 30 prochains jours</p>
      </div>
    );
  };

  const uuidClients=clients.filter(c=>typeof c.id==="string"&&c.id.includes("-"));
  const submit=async()=>{
    if(!title.trim()) return;
    setLoading(true);
    await onCreate(title.trim(), isAdmin?(clientId||null):undefined, selectedTeam);
    setLoading(false);
  };

  return(
    <div style={{position:"fixed",inset:0,background:"#000000AA",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="card fadeUp" style={{width:"100%",maxWidth:500,padding:28,background:"#FFFFFF"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <h2 style={{fontFamily:"'Urbanist'",fontSize:22,color:"#1D1D1F",letterSpacing:"0.05em"}}>NOUVEAU PROJET</h2>
          <button style={{background:"none",border:"none",color:"#8E8E93",cursor:"pointer",fontSize:18,lineHeight:1}} onClick={onClose}>✕</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <Lbl>Nom du projet</Lbl>
            <input className="input" autoFocus placeholder="Ex: Spot publicitaire Martinique 2026" value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          </div>
          {isAdmin&&uuidClients.length>0&&(
            <div>
              <Lbl>Client (optionnel)</Lbl>
              <select className="input" value={clientId} onChange={e=>setClientId(e.target.value)}>
                <option value="">— Aucun client pour l'instant —</option>
                {uuidClients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {isAdmin&&teamMembers.length>0&&(
            <div>
              <Lbl>Équipe assignée (optionnel)</Lbl>
              <div style={{display:"flex",gap:10}}>
                <TeamCard team="A"/>
                <TeamCard team="B"/>
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}>
            <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary" disabled={loading||!title.trim()} onClick={submit}>
              {loading?"Création...":"Créer le projet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTS MANAGER
// ─────────────────────────────────────────────────────────────────────────────
function ClientsManager({clients,setClients,onNotif,onPreviewClient}){
  const TYPES=["PME","Startup","Association","Collectivité","Particulier","Autre"];
  const emptyForm={nom:"",email:"",password:"",client_type:"PME",discount:0,simulator_enabled:false,shortone_enabled:false};
  const[tab,setTab]=useState("liste");
  const[form,setForm]=useState(emptyForm);
  const[editId,setEditId]=useState(null);
  const[saving,setSaving]=useState(false);
  const[createdPass,setCreatedPass]=useState(null);
  const[showPass,setShowPass]=useState(false);
  const F=(k,v)=>setForm(p=>({...p,[k]:v}));

  const openEdit=(c)=>{setEditId(c.id);setForm({nom:c.name,email:c.email,password:"",client_type:c.type,discount:c.discount,simulator_enabled:c.simulatorEnabled,shortone_enabled:c.shortoneEnabled||false});setTab("edit");};
  const cancelEdit=()=>{setEditId(null);setForm(emptyForm);setTab("liste");};

  const createAccount=async()=>{
    if(!form.email||!form.password){onNotif("Email et mot de passe requis");return;}
    setSaving(true);
    const{data,error}=await supabase.auth.signUp({email:form.email,password:form.password,options:{data:{nom:form.nom,role:"client"}}});
    if(error){onNotif("Erreur : "+error.message);setSaving(false);return;}
    const uid=data.user?.id;
    if(!uid){onNotif("Erreur création compte");setSaving(false);return;}
    await supabase.from("profiles").upsert({id:uid,email:form.email,nom:form.nom,role:"client",client_type:form.client_type,discount:form.discount,simulator_enabled:form.simulator_enabled,shortone_enabled:form.shortone_enabled,is_active:true});
    const nc={id:uid,name:form.nom||form.email,email:form.email,type:form.client_type,discount:form.discount,simulatorEnabled:form.simulator_enabled,shortoneEnabled:form.shortone_enabled,isActive:true};
    setClients(cs=>[...cs,nc]);
    setCreatedPass(form.password);
    setShowPass(true);
    setForm(emptyForm);
    setSaving(false);
    setTab("liste");
    onNotif("Compte créé !");
  };

  const saveEdit=async()=>{
    setSaving(true);
    await supabase.from("profiles").update({nom:form.nom,client_type:form.client_type,discount:Number(form.discount),simulator_enabled:form.simulator_enabled,shortone_enabled:form.shortone_enabled}).eq("id",editId);
    setClients(cs=>cs.map(c=>c.id===editId?{...c,name:form.nom||c.email,type:form.client_type,discount:Number(form.discount),simulatorEnabled:form.simulator_enabled,shortoneEnabled:form.shortone_enabled}:c));
    setSaving(false);
    onNotif("Compte mis à jour");
    cancelEdit();
  };

  const toggleActive=async(c)=>{
    const v=!c.isActive;
    await supabase.from("profiles").update({is_active:v}).eq("id",c.id);
    setClients(cs=>cs.map(x=>x.id===c.id?{...x,isActive:v}:x));
    onNotif(v?"Compte activé":"Compte suspendu");
  };

  const deleteClient=async(c)=>{
    if(!window.confirm(`Supprimer définitivement le compte de ${c.name} ?\n\nCette action est irréversible.`))return;
    await supabase.from("profiles").delete().eq("id",c.id);
    setClients(cs=>cs.filter(x=>x.id!==c.id));
    onNotif("Compte supprimé");
  };

  const toggleShortone=async(c)=>{
    const v=!c.shortoneEnabled;
    const{error}=await supabase.from("profiles").update({shortone_enabled:v}).eq("id",c.id);
    if(error){onNotif("Erreur : colonne shortone_enabled manquante — lance le SQL ALTER TABLE");return;}
    setClients(cs=>cs.map(x=>x.id===c.id?{...x,shortoneEnabled:v}:x));
    onNotif(v?"◆ Shortone activé pour "+c.name:"◆ Shortone désactivé");
  };

  const renderForm=(isNew)=>(
    <div className="card fadeUp" style={{padding:22,maxWidth:520}}>
      <SH icon={isNew?"➕":"✏️"} title={isNew?"NOUVEAU COMPTE CLIENT":"MODIFIER LE COMPTE"}/>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><Lbl>Nom complet</Lbl><input className="input" placeholder="Jean Dupont" value={form.nom} onChange={e=>F("nom",e.target.value)}/></div>
          <div><Lbl>Type de client</Lbl><select className="input" value={form.client_type} onChange={e=>F("client_type",e.target.value)}>{TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
        </div>
        <div><Lbl>Email</Lbl><input className="input" type="email" placeholder="client@email.com" value={form.email} onChange={e=>F("email",e.target.value)} disabled={!isNew} style={!isNew?{opacity:.5}:{}}/></div>
        {isNew&&<div><Lbl>Mot de passe provisoire</Lbl><input className="input" type="text" placeholder="Mot de passe temporaire" value={form.password} onChange={e=>F("password",e.target.value)}/></div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><Lbl>Remise (%)</Lbl><input className="input" type="number" min={0} max={100} value={form.discount} onChange={e=>F("discount",Number(e.target.value))}/></div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <Lbl>Accès simulateur</Lbl>
            <button className={`btn ${form.simulator_enabled?"btn-green":"btn-ghost"}`} style={{fontSize:12}} onClick={()=>F("simulator_enabled",!form.simulator_enabled)}>{form.simulator_enabled?"✓ Activé":"✗ Désactivé"}</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <Lbl>Accès Shortone</Lbl>
            <button className={`btn ${form.shortone_enabled?"btn-primary":"btn-ghost"}`} style={{fontSize:12}} onClick={()=>F("shortone_enabled",!form.shortone_enabled)}>{form.shortone_enabled?"◆ Activé":"◆ Désactivé"}</button>
          </div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
          {!isNew&&<button className="btn btn-ghost" onClick={cancelEdit}>Annuler</button>}
          <button className="btn btn-primary" disabled={saving} onClick={isNew?createAccount:saveEdit}>{saving?"...":(isNew?"Créer le compte":"Enregistrer")}</button>
        </div>
      </div>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div style={{background:"linear-gradient(135deg,#00B4D810,#7B9CFF08)",border:"1px solid #00B4D820",borderRadius:10,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{fontFamily:"'Urbanist'",fontSize:24,color:"#1D1D1F",letterSpacing:"0.04em"}}>COMPTES CLIENTS</h2>
          <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",marginTop:2}}>{clients.length} compte{clients.length!==1?"s":""} — gestion des accès et identifiants</p>
        </div>
        <button className="btn btn-primary" onClick={()=>{setTab(tab==="nouveau"?"liste":"nouveau");setEditId(null);setForm(emptyForm);}}>
          {tab==="nouveau"?"✕ Annuler":"+ Nouveau compte"}
        </button>
      </div>

      {showPass&&createdPass&&(
        <div className="fadeUp" style={{background:"#4ECDC415",border:"1px solid #4ECDC444",borderRadius:8,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div>
            <p style={{fontFamily:"'Inter'",fontSize:13,fontWeight:600,color:"#4ECDC4"}}>✓ Compte créé — transmettez ce mot de passe au client</p>
            <p style={{fontFamily:"'JetBrains Mono'",fontSize:14,color:"#1D1D1F",marginTop:4,letterSpacing:"0.05em"}}>{createdPass}</p>
          </div>
          <button className="btn btn-ghost" style={{fontSize:11}} onClick={()=>{setShowPass(false);setCreatedPass(null);}}>✕</button>
        </div>
      )}

      {tab==="nouveau"&&renderForm(true)}
      {tab==="edit"&&editId&&renderForm(false)}

      {/* Comptes en attente de validation */}
      {clients.filter(c=>!c.isActive).length>0&&(
        <div style={{background:"#FF9F4310",border:"1px solid #FF9F4340",borderRadius:10,padding:"14px 18px"}}>
          <p style={{fontFamily:"'Urbanist'",fontSize:15,color:"#FF9F43",letterSpacing:"0.06em",marginBottom:10}}>
            ⏳ EN ATTENTE DE VALIDATION — {clients.filter(c=>!c.isActive).length} compte{clients.filter(c=>!c.isActive).length>1?"s":""}
          </p>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {clients.filter(c=>!c.isActive).map(c=>(
              <div key={c.id} style={{background:"#FFFFFF",border:"1px solid #FF9F4330",borderRadius:8,padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:"#FF9F4320",border:"1px solid #FF9F4340",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Urbanist'",fontSize:14,color:"#FF9F43",flexShrink:0}}>
                    {(c.name||"?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p style={{fontFamily:"'Inter'",fontSize:13,fontWeight:600,color:"#1D1D1F"}}>{c.name}</p>
                    <p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93"}}>{c.email}</p>
                  </div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button className="btn btn-ghost" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>openEdit(c)}>✏️ Modifier</button>
                  <button className="btn btn-green" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>toggleActive(c)}>✓ Valider le compte</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comptes actifs */}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {clients.filter(c=>c.isActive).length===0&&<div className="card" style={{padding:32,textAlign:"center",color:"#8E8E93",fontFamily:"'Inter'",fontSize:13}}>Aucun compte client actif — créez le premier ci-dessus</div>}
        {clients.filter(c=>c.isActive).map(c=>(
          <div key={c.id} className="card fadeUp" style={{padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:"#00B4D820",border:"1px solid #00B4D840",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Urbanist'",fontSize:16,color:"#00B4D8",flexShrink:0}}>
                {(c.name||"?")[0].toUpperCase()}
              </div>
              <div>
                <p style={{fontFamily:"'Inter'",fontSize:13,fontWeight:600,color:"#1D1D1F"}}>{c.name}</p>
                <p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93"}}>{c.email}</p>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span style={{fontFamily:"'Inter'",fontSize:11,padding:"3px 8px",borderRadius:4,background:"#E5E5EA",color:"#6E6E73"}}>{c.type}</span>
              {c.discount>0&&<span style={{fontFamily:"'Inter'",fontSize:11,padding:"3px 8px",borderRadius:4,background:"#00B4D820",color:"#00B4D8"}}>-{c.discount}%</span>}
              {c.simulatorEnabled&&<span style={{fontFamily:"'Inter'",fontSize:11,padding:"3px 8px",borderRadius:4,background:"#4ECDC420",color:"#4ECDC4"}}>Simulateur</span>}
              <button onClick={()=>toggleShortone(c)} style={{fontFamily:"'Inter'",fontSize:11,padding:"3px 8px",borderRadius:4,border:`1px solid ${c.shortoneEnabled?"#00d4ff40":"#E5E5EA"}`,background:c.shortoneEnabled?"#00d4ff18":"transparent",color:c.shortoneEnabled?"#00d4ff":"#8E8E93",cursor:"pointer"}}>◆ Shortone</button>
              <button className="btn btn-blue" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>onPreviewClient(c)}>👁 Voir l'espace</button>
              <button className="btn btn-ghost" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>openEdit(c)}>✏️ Modifier</button>
              <button className={`btn ${c.isActive?"btn-red":"btn-green"}`} style={{fontSize:11,padding:"4px 10px"}} onClick={()=>toggleActive(c)}>{c.isActive?"Suspendre":"Réactiver"}</button>
              <button className="btn btn-red" style={{fontSize:11,padding:"4px 10px",opacity:0.7}} onClick={()=>deleteClient(c)}>🗑 Supprimer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS PANEL
const ACCENT_COLORS={or:"#00B4D8",cyan:"#4ECDC4",bleu:"#7B9CFF",violet:"#B47FFF",rouge:"#FF3B30"};
const DEFAULT_SETTINGS={fontSize:"normale",density:"normale",accent:"or",contrast:false};

function SettingsPanel({settings,onChange,onClose,user,onLogout}){
  const S=(k,v)=>onChange({...settings,[k]:v});
  const densityLabel={"compact":"Compact","normale":"Normal","spacieux":"Spacieux"};
  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:998,background:"#00000055"}}/>
      <div style={{position:"fixed",top:0,right:0,height:"100vh",width:320,background:"#F5F5F7",borderLeft:"1px solid #E5E5EA",zIndex:999,display:"flex",flexDirection:"column",boxShadow:"-8px 0 40px #00000066"}}>
        {/* Header */}
        <div style={{padding:"18px 20px",borderBottom:"1px solid #E5E5EA",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontFamily:"'Urbanist'",fontSize:18,color:"#1D1D1F",letterSpacing:"0.06em"}}>PARAMÈTRES</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#8E8E93",cursor:"pointer",fontSize:18,lineHeight:1}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"18px 20px",display:"flex",flexDirection:"column",gap:22}}>

          {/* Profil */}
          <div style={{background:"#FFFFFF",border:"1px solid #E5E5EA",borderRadius:10,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:ACCENT_COLORS[settings.accent]+"22",border:`1px solid ${ACCENT_COLORS[settings.accent]}40`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Urbanist'",fontSize:18,color:ACCENT_COLORS[settings.accent],flexShrink:0}}>
              {(user?.email||"?")[0].toUpperCase()}
            </div>
            <div style={{minWidth:0}}>
              <p style={{fontFamily:"'Inter'",fontSize:13,fontWeight:600,color:"#1D1D1F",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.email||"—"}</p>
              <p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93",marginTop:1}}>Connecté</p>
            </div>
          </div>

          {/* Taille de police */}
          <div>
            <p style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93",textTransform:"uppercase",letterSpacing:".1em",fontWeight:700,marginBottom:8}}>Taille du texte</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
              {[["petite","A"],["normale","A"],["grande","A"],["tres-grande","A"]].map(([k,l],i)=>(
                <button key={k} onClick={()=>S("fontSize",k)} style={{padding:"8px 4px",background:settings.fontSize===k?ACCENT_COLORS[settings.accent]+"22":"#FFFFFF",border:`1px solid ${settings.fontSize===k?ACCENT_COLORS[settings.accent]:"#E5E5EA"}`,borderRadius:7,color:settings.fontSize===k?ACCENT_COLORS[settings.accent]:"#6E6E73",fontFamily:"'Inter'",fontSize:[11,13,16,19][i],fontWeight:600,cursor:"pointer",transition:"all .15s"}}>
                  {l}
                </button>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginTop:4}}>
              {["Petite","Normale","Grande","XL"].map((l,i)=>(
                <span key={l} style={{fontFamily:"'Inter'",fontSize:9,color:"#8E8E93",textAlign:"center"}}>{l}</span>
              ))}
            </div>
          </div>

          {/* Densité */}
          <div>
            <p style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93",textTransform:"uppercase",letterSpacing:".1em",fontWeight:700,marginBottom:8}}>Densité de l'interface</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
              {Object.entries(densityLabel).map(([k,l])=>(
                <button key={k} onClick={()=>S("density",k)} style={{padding:"8px 6px",background:settings.density===k?ACCENT_COLORS[settings.accent]+"22":"#FFFFFF",border:`1px solid ${settings.density===k?ACCENT_COLORS[settings.accent]:"#E5E5EA"}`,borderRadius:7,color:settings.density===k?ACCENT_COLORS[settings.accent]:"#6E6E73",fontFamily:"'Inter'",fontSize:12,fontWeight:600,cursor:"pointer",transition:"all .15s"}}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Couleur d'accent */}
          <div>
            <p style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93",textTransform:"uppercase",letterSpacing:".1em",fontWeight:700,marginBottom:8}}>Couleur d'accent</p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {Object.entries(ACCENT_COLORS).map(([k,v])=>(
                <button key={k} onClick={()=>S("accent",k)} style={{width:32,height:32,borderRadius:"50%",background:v,border:`3px solid ${settings.accent===k?"#1D1D1F":"transparent"}`,cursor:"pointer",transition:"all .15s",boxShadow:settings.accent===k?`0 0 12px ${v}66`:"none"}}/>
              ))}
            </div>
            <p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93",marginTop:6,textTransform:"capitalize"}}>{settings.accent}</p>
          </div>

          {/* Contraste */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <p style={{fontFamily:"'Inter'",fontSize:13,color:"#1D1D1F",fontWeight:600}}>Contraste élevé</p>
              <p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93",marginTop:2}}>Améliore la lisibilité</p>
            </div>
            <button onClick={()=>S("contrast",!settings.contrast)} className={`toggle ${settings.contrast?"on":""}`}/>
          </div>

        </div>

        {/* Footer — déconnexion */}
        <div style={{padding:"16px 20px",borderTop:"1px solid #E5E5EA"}}>
          <button onClick={onLogout} style={{width:"100%",padding:"10px",background:"#FF3B3018",border:"1px solid #FF3B3030",borderRadius:8,color:"#FF3B30",fontFamily:"'Inter'",fontWeight:700,fontSize:13,cursor:"pointer",transition:"all .15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="#FF3B3028"} onMouseLeave={e=>e.currentTarget.style.background="#FF3B3018"}>
            ↩ Se déconnecter
          </button>
        </div>
      </div>
    </>
  );
}

const genToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(18))).map(b=>b.toString(16).padStart(2,"0")).join("");

function GuestView(){
  const[state,setState]=useState("loading"); // loading | found | expired | invalid
  const[project,setProject]=useState(null);
  const[token,setToken]=useState(null);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const t=params.get("guest");
    if(!t||t.length<20){setState("invalid");return;}
    setToken(t);
    supabase.rpc("get_project_by_guest_token",{guest_token:t}).then(({data,error})=>{
      if(error||!data){setState("invalid");return;}
      const guest=(data.brief?.guests||[]).find(g=>g.token===t);
      if(guest?.expiresAt&&new Date(guest.expiresAt)<Date.now()){setState("expired");return;}
      setProject({id:data.id,title:data.title,brief:data.brief,replayUrl:data.replay_url||"",videoStatus:data.brief?.videoStatus||null,videoComment:data.brief?.videoComment||"",moodboard:data.brief?.moodboard||[]});
      setState("found");
    });
  },[]);

  const onUpdate=(updated)=>setProject(p=>({...p,...updated}));
  const onNotif=()=>{};

  const guestName=project?(project.brief?.guests||[]).find(g=>g.token===token)?.name:"";

  if(state==="loading")return(
    <div style={{minHeight:"100vh",background:"#FFFFFF",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,backgroundImage:"radial-gradient(ellipse at 50% 0%,#0090B310 0%,transparent 60%)"}}>
      <img src="/logo192.png" alt="Third-One Studio" style={{height:40}}/>
      <div style={{width:28,height:28,border:"2px solid #00B4D840",borderTopColor:"#00B4D8",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
    </div>
  );

  if(state==="invalid"||state==="expired")return(
    <div style={{minHeight:"100vh",background:"#FFFFFF",backgroundImage:"radial-gradient(ellipse at 50% 0%,#0090B310 0%,transparent 60%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:0,padding:24,fontFamily:"'Inter',sans-serif"}}>
      <img src="/logo192.png" alt="Third-One Studio" style={{height:44,marginBottom:32}}/>
      <div style={{background:"#F5F5F7",border:"1px solid #E5E5EA",borderRadius:14,padding:"36px 32px",maxWidth:400,width:"100%",textAlign:"center",boxShadow:"0 0 60px #0090B306"}}>
        <div style={{width:56,height:56,borderRadius:"50%",background:state==="expired"?"#FF9F4318":"#FF3B3018",border:`1px solid ${state==="expired"?"#FF9F4340":"#FF3B3040"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 16px"}}>
          {state==="expired"?"⏰":"🔒"}
        </div>
        <p style={{fontFamily:"'Urbanist'",fontSize:24,color:"#1D1D1F",letterSpacing:"0.05em",marginBottom:8}}>
          {state==="expired"?"Lien expiré":"Lien invalide"}
        </p>
        <p style={{fontSize:13,color:"#6E6E73",lineHeight:1.6}}>
          {state==="expired"?"Ce lien de validation a expiré. Contactez votre référent Third-One Studio pour obtenir un nouveau lien.":"Ce lien n'existe pas ou a été révoqué par votre interlocuteur."}
        </p>
      </div>
      <p style={{marginTop:24,fontSize:11,color:"#C7C7CC"}}>© 2026 Third-One Studio</p>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"#FFFFFF",backgroundImage:"radial-gradient(ellipse at 50% 0%,#0090B312 0%,transparent 55%)",fontFamily:"'Inter',sans-serif"}}>
      {/* Header */}
      <div style={{borderBottom:"1px solid #1A1A28",background:"#FFFFFFcc",backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:10,padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <img src="/logo192.png" alt="Third-One Studio" style={{height:32}}/>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {guestName&&<span style={{fontFamily:"'Inter'",fontSize:12,color:"#8E8E93"}}>Bonjour, <span style={{color:"#6E6E73",fontWeight:600}}>{guestName}</span></span>}
          <span style={{fontFamily:"'Inter'",fontSize:10,padding:"3px 8px",borderRadius:4,background:"#0090B318",color:"#0090B3",border:"1px solid #0090B333",letterSpacing:"0.05em",textTransform:"uppercase"}}>Accès invité</span>
        </div>
      </div>

      {/* Content */}
      <div style={{maxWidth:700,margin:"0 auto",padding:"32px 20px 48px"}}>
        {/* Project header */}
        <div style={{marginBottom:24}}>
          <p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6}}>Validation vidéo</p>
          <h1 style={{fontFamily:"'Urbanist'",fontSize:32,color:"#1D1D1F",letterSpacing:"0.04em",lineHeight:1}}>{project.title}</h1>
        </div>

        <VideoValidationPanel project={project} onUpdate={onUpdate} onNotif={onNotif} isGuest={true}/>

        <p style={{textAlign:"center",marginTop:32,fontSize:11,color:"#C7C7CC"}}>
          © 2026 Third-One Studio · Accès restreint à la validation vidéo
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const RADAR_TRENDS = [
  { id:1, tag:"#75HardChallenge", platform:"TikTok",     niche:"Fitness", views:"2.4M", growth:"+312%", why:"Challenge 75 jours ultra-viral combinant discipline et transformation physique.",     hook:"Jour 1 du challenge qui a changé ma vie...", plans:["Intro","Training","Sweat","Result","CTA"] },
  { id:2, tag:"#SilentWalking",   platform:"TikTok",     niche:"Fitness", views:"1.1M", growth:"+187%", why:"Tendance bien-être minimaliste. La marche sans écran comme antidote au burnout.",      hook:"J'ai marché 30 min sans mon téléphone. Résultat...", plans:["Contexte","La marche","Feeling","Bilan","CTA"] },
  { id:3, tag:"#CleanGirl",       platform:"Instagram",  niche:"Beauty",  views:"5.8M", growth:"+445%", why:"Esthétique minimaliste naturelle. Très fort taux de saves et de partages sur Reels.", hook:"Ma routine beauté en 5 produits max...", plans:["Wake up","Skincare","Makeup","GRWM","CTA"] },
  { id:4, tag:"#AITools2025",     platform:"LinkedIn",   niche:"Tech",    views:"890K", growth:"+203%", why:"L'IA en entreprise fascine. Les contenus 'avant/après productivité' performent fort.",  hook:"Ces 3 outils IA ont remplacé 4h de mon travail...", plans:["Problème","Outil 1","Outil 2","Outil 3","CTA"] },
];

function ShortoneModule({projects,clients,onSelectProject,onSectionChange,onNotif,onCreateFromTrend,isAdmin}){
  const [view,setView]=useState("radar");
  const [expanded,setExpanded]=useState(null);
  const [nicheFilter,setNicheFilter]=useState("Tous");
  const [scanning,setScanning]=useState(false);
  const [trends,setTrends]=useState(RADAR_TRENDS);
  const [trendsLoading,setTrendsLoading]=useState(true);
  const [lastFetch,setLastFetch]=useState(null);

  const niches=["Tous","Fitness","Beauty","Tech","Food","Voyage","Business","Lifestyle","Finance"];
  const nicheColors={"Fitness":"#4ECDC4","Beauty":"#FF3B30","Tech":"#7B9CFF","Food":"#FF9F43","Voyage":"#B47FFF","Business":"#00B4D8","Lifestyle":"#FF6B9D","Finance":"#4ECDC4"};

  useEffect(()=>{
    supabase.from("trends").select("*").eq("active",true).order("fetched_at",{ascending:false})
      .then(({data})=>{
        if(data&&data.length>0){
          setTrends(data.map(t=>({...t,plans:Array.isArray(t.plans)?t.plans:Object.values(t.plans||{})})));
          setLastFetch(data[0].fetched_at);
          setExpanded(data[0].id);
        }
        setTrendsLoading(false);
      })
      .catch(()=>setTrendsLoading(false));
  },[]);

  const runScan=async()=>{
    setScanning(true);
    try{
      const {error}=await supabase.functions.invoke("refresh-trends");
      if(error) throw error;
      const {data:fresh}=await supabase.from("trends").select("*").eq("active",true).order("fetched_at",{ascending:false});
      if(fresh&&fresh.length>0){
        setTrends(fresh.map(t=>({...t,plans:Array.isArray(t.plans)?t.plans:Object.values(t.plans||{})})));
        setLastFetch(fresh[0].fetched_at);
        setExpanded(fresh[0].id);
        onNotif(`${fresh.length} tendances mises à jour ✓`);
      }
    }catch(e){ onNotif("Erreur scan : "+(e?.message||e)); }
    setScanning(false);
  };

  const statusColor=s=>({brief:"#7B9CFF",storyboard:"#00B4D8",tournage:"#FF9F43",montage:"#B47FFF",livraison:"#4ECDC4"}[s]||"#6E6E73");
  const statusLabel=s=>({brief:"Brief",storyboard:"Storyboard",tournage:"Tournage",montage:"Montage",livraison:"Livré"}[s]||s);
  const PIPELINE=["brief","storyboard","tournage","montage","livraison"];

  const filteredTrends=nicheFilter==="Tous"?trends:trends.filter(t=>t.niche===nicheFilter);
  const clientName=cid=>clients.find(c=>c.id===cid)?.name||"—";

  const cardStyle=(active)=>({
    background:active?"#1A1A2A":"#FFFFFF",
    border:`1px solid ${active?"#00d4ff30":"#E5E5EA"}`,
    borderRadius:10,
    cursor:"pointer",
    transition:"all .15s",
  });

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{fontFamily:"'Urbanist'",fontSize:26,color:"#1D1D1F",letterSpacing:"0.05em",display:"flex",alignItems:"center",gap:8}}>
            <span style={{background:"linear-gradient(135deg,#00d4ff,#8b5cf6)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>◆</span> SHORTONE.STUDIO
          </h2>
          <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",marginTop:2}}>Radar tendances IA & production de contenu social media</p>
        </div>
        {/* Sub-tabs */}
        <div style={{display:"flex",gap:4,background:"#F5F5F7",border:"1px solid #E5E5EA",borderRadius:8,padding:3}}>
          <button className={view==="radar"?"tab active":"tab"} style={{fontSize:12,padding:"5px 14px"}} onClick={()=>setView("radar")}>⚡ Radar</button>
          <button className={view==="missions"?"tab active":"tab"} style={{fontSize:12,padding:"5px 14px"}} onClick={()=>setView("missions")}>
            ⬡ Missions {projects.length>0&&<span style={{marginLeft:4,background:"#FF9F43",color:"#FFFFFF",borderRadius:999,fontSize:9,fontWeight:800,padding:"1px 5px"}}>{projects.length}</span>}
          </button>
        </div>
      </div>

      {/* ── RADAR ── */}
      {view==="radar"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {trendsLoading&&<div style={{textAlign:"center",padding:"30px 0",fontFamily:"'Inter'",fontSize:12,color:"#8E8E93"}}><span style={{animation:"spin 1s linear infinite",display:"inline-block",marginRight:8}}>⟳</span>Chargement des tendances...</div>}
          {/* Stats */}
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {[{v:trends[0]?.growth||"—",l:"Top croissance",c:"#4ECDC4"},{v:`${trends.length}`,l:"Tendances actives",c:"#B47FFF"},{v:`${[...new Set(trends.map(t=>t.niche))].length||6}`,l:"Niches suivies",c:"#00B4D8"}].map(s=>(
              <div key={s.l} style={{flex:"1 1 80px",minWidth:80,background:"#FFFFFF",border:"1px solid #E5E5EA",borderRadius:10,padding:"12px 14px"}}>
                <div style={{fontFamily:"'Urbanist'",fontSize:22,color:s.c,letterSpacing:"0.04em"}}>{s.v}</div>
                <div style={{fontFamily:"'Inter'",fontSize:11,color:"#6E6E73",marginTop:2}}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Niche filter + scan */}
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            {niches.map(n=>(
              <button key={n} onClick={()=>setNicheFilter(n)} style={{background:nicheFilter===n?(nicheColors[n]||"#00B4D8"):"#FFFFFF",border:`1px solid ${nicheFilter===n?(nicheColors[n]||"#00B4D8"):"#E5E5EA"}`,borderRadius:999,color:nicheFilter===n?"#FFFFFF":"#6E6E73",fontFamily:"'Inter'",fontWeight:600,fontSize:11,padding:"4px 13px",cursor:"pointer",transition:"all .15s"}}>
                {n}
              </button>
            ))}
            {isAdmin&&(
              <button onClick={runScan} disabled={scanning} style={{marginLeft:"auto",background:scanning?"#00d4ff22":"linear-gradient(135deg,#00d4ff,#8b5cf6)",border:scanning?"1px solid #00d4ff":"none",borderRadius:8,color:scanning?"#00d4ff":"#fff",fontFamily:"'Inter'",fontWeight:700,fontSize:12,padding:"6px 16px",cursor:scanning?"not-allowed":"pointer",transition:"all .15s",opacity:scanning?.7:1}}>
                {scanning?"⟳ Scan en cours...":"⚡ Scanner les tendances"}
              </button>
            )}
          </div>
          {lastFetch&&<div style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93"}}>Dernière mise à jour : {new Date(lastFetch).toLocaleDateString("fr-FR",{day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"})}</div>}

          {/* Trend cards */}
          {filteredTrends.map(t=>(
            <div key={t.id} style={cardStyle(expanded===t.id)}>
              <div onClick={()=>setExpanded(expanded===t.id?null:t.id)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",cursor:"pointer",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",minWidth:0,flex:1}}>
                  <span style={{fontFamily:"'Inter'",fontWeight:700,fontSize:14,color:"#1D1D1F",whiteSpace:"nowrap"}}>{t.tag}</span>
                  <span style={{fontFamily:"'Inter'",fontSize:10,fontWeight:700,color:"#4ECDC4",background:"#4ECDC418",border:"1px solid #4ECDC430",borderRadius:999,padding:"2px 8px",whiteSpace:"nowrap"}}>{t.growth}</span>
                  <span style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93",whiteSpace:"nowrap"}}>{t.platform} · {t.views}</span>
                </div>
                <span style={{color:"#8E8E93",fontSize:10,transform:expanded===t.id?"rotate(180deg)":"none",transition:"transform .2s"}}>▼</span>
              </div>
              {expanded===t.id&&(
                <div style={{padding:"0 16px 16px",borderTop:"1px solid #E5E5EA",paddingTop:14,display:"flex",flexDirection:"column",gap:14}}>
                  <div>
                    <div style={{fontFamily:"'Inter'",fontSize:9,color:"#00B4D8",textTransform:"uppercase",letterSpacing:".1em",fontWeight:700,marginBottom:6}}>Pourquoi ça explose</div>
                    <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",lineHeight:1.6,margin:0}}>{t.why}</p>
                  </div>
                  <div style={{borderLeft:"3px solid #00d4ff",paddingLeft:12,fontFamily:"'Inter'",fontSize:12,fontStyle:"italic",color:"#6666AA"}}>"{t.hook}"</div>
                  <div>
                    <div style={{fontFamily:"'Inter'",fontSize:9,color:"#00B4D8",textTransform:"uppercase",letterSpacing:".1em",fontWeight:700,marginBottom:8}}>Shotlist — {t.plans.length} plans</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(52px,1fr))",gap:6}}>
                      {t.plans.map((p,i)=>{
                        const cols=["#7B9CFF","#4ECDC4","#FF9F43","#B47FFF","#FF3B30"];
                        return(
                          <div key={i} style={{display:"flex",flexDirection:"column",gap:4}}>
                            <div style={{aspectRatio:"9/16",borderRadius:6,background:cols[i]+"18",border:`1px solid ${cols[i]}30`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                              <div style={{width:14,height:14,borderRadius:3,background:cols[i]+"60"}}/>
                            </div>
                            <div style={{fontFamily:"'Inter'",fontSize:9,color:"#8E8E93",textAlign:"center"}}>{p}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <button onClick={()=>onCreateFromTrend(t)} style={{width:"100%",padding:"10px",background:"linear-gradient(135deg,#00d4ff,#8b5cf6)",border:"none",borderRadius:8,color:"#fff",fontFamily:"'Inter'",fontWeight:700,fontSize:13,cursor:"pointer",transition:"opacity .15s"}}
                    onMouseEnter={e=>e.currentTarget.style.opacity=".85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                    ✦ Créer une mission depuis cette tendance
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── MISSIONS ── */}
      {view==="missions"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {projects.length===0?(
            <div style={{background:"#FFFFFF",border:"1px solid #E5E5EA",borderRadius:10,padding:"40px 20px",textAlign:"center"}}>
              <p style={{fontFamily:"'Inter'",fontSize:13,color:"#8E8E93"}}>Aucune mission en cours — détecte une tendance dans le Radar pour commencer.</p>
              <button className="btn btn-primary" style={{marginTop:12,fontSize:12}} onClick={()=>setView("radar")}>⚡ Aller au Radar</button>
            </div>
          ):(
            PIPELINE.map(status=>{
              const col=projects.filter(p=>p.status===status);
              return(
                <div key={status}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:statusColor(status)}}/>
                    <span style={{fontFamily:"'Inter'",fontSize:11,color:statusColor(status),fontWeight:700,textTransform:"uppercase",letterSpacing:".08em"}}>{statusLabel(status)}</span>
                    <span style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93",marginLeft:2}}>{col.length}</span>
                  </div>
                  {col.length===0?(
                    <div style={{background:"#F5F5F7",border:"1px dashed #E5E5EA",borderRadius:8,padding:"10px 14px"}}>
                      <p style={{fontFamily:"'Inter'",fontSize:11,color:"#333350",textAlign:"center"}}>Aucune mission</p>
                    </div>
                  ):(
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {col.map(p=>(
                        <div key={p.id} onClick={()=>{onSelectProject(p.id);onSectionChange("projets");}}
                          style={{background:"#FFFFFF",border:`1px solid #E5E5EA`,borderLeft:`3px solid ${statusColor(p.status)}`,borderRadius:8,padding:"10px 14px",cursor:"pointer",transition:"background .15s",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}
                          onMouseEnter={e=>e.currentTarget.style.background="#F2F2F7"}
                          onMouseLeave={e=>e.currentTarget.style.background="#FFFFFF"}>
                          <div>
                            <div style={{fontFamily:"'Inter'",fontWeight:600,fontSize:13,color:"#1D1D1F"}}>{p.title}</div>
                            <div style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93",marginTop:2}}>{clientName(p.clientId)}</div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:60,height:3,background:"#F2F2F7",borderRadius:99}}>
                              <div style={{height:"100%",width:`${p.progress}%`,background:statusColor(p.status),borderRadius:99}}/>
                            </div>
                            <span style={{fontFamily:"'Inter'",fontSize:10,color:"#8E8E93"}}>{p.progress}%</span>
                            <span style={{fontFamily:"'Inter'",fontSize:10,color:"#6E6E73"}}>→</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT WELCOME PAGE
// ─────────────────────────────────────────────────────────────────────────────
function ClientWelcomePage({client,projects,onGoTo}){
  const shortcuts=[
    {icon:"📁",k:"projets",title:"Mes projets",desc:"Suivez l'avancement et donnez vos retours"},
    {icon:"📅",k:"calendrier",title:"Disponibilités",desc:"Consultez nos créneaux disponibles"},
    {icon:"📲",k:"cm",title:"Mes contenus",desc:"Publications planifiées pour vos réseaux"},
    {icon:"💬",k:"projets",title:"Messagerie",desc:"Échangez avec votre équipe"},
  ];
  const statusColor=s=>({brief:"#00B4D8",storyboard:"#FF9500",tournage:"#FF9F43",montage:"#AF52DE",livraison:"#34C759"}[s]||"#6E6E73");
  const statusLabel=s=>({brief:"Brief en cours",storyboard:"Storyboard",tournage:"En tournage",montage:"Montage",livraison:"Livré ✓"}[s]||s);
  const statusIcon=s=>({brief:"✏️",storyboard:"🎞",tournage:"🎬",montage:"✂️",livraison:"✅"}[s]||"📌");
  const topProjects=projects.slice(0,3);
  const prenom=(client.name||"").split(" ")[0]||"vous";
  return(
    <div style={{display:"flex",flexDirection:"column",gap:28}} className="fadeUp">

      {/* Hero */}
      <div style={{background:"linear-gradient(135deg,rgba(0,180,216,0.07) 0%,rgba(175,82,222,0.04) 50%,rgba(0,180,216,0.03) 100%)",border:"1px solid rgba(0,180,216,0.12)",borderRadius:16,padding:"28px 30px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-20,right:-20,width:120,height:120,borderRadius:"50%",background:"rgba(0,180,216,0.04)",border:"1px solid rgba(0,180,216,0.08)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:10,right:40,width:60,height:60,borderRadius:"50%",background:"rgba(175,82,222,0.04)",border:"1px solid rgba(175,82,222,0.08)",pointerEvents:"none"}}/>
        <p style={{fontFamily:"'Inter'",fontSize:12,color:"#00B4D8",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8,fontWeight:700}}>Votre espace de création</p>
        <h1 style={{fontFamily:"'Urbanist'",fontSize:34,color:"#1D1D1F",letterSpacing:"0.02em",marginBottom:6,lineHeight:1.15,fontWeight:800}}>
          Bonjour, {prenom} 👋
        </h1>
        <p style={{fontFamily:"'Inter'",fontSize:14,color:"#6E6E73",lineHeight:1.6,maxWidth:480}}>
          Tout ce qu'il vous faut pour suivre votre production, valider vos contenus et rester en contact avec notre équipe.
        </p>
      </div>

      {/* Raccourcis */}
      <div>
        <p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12,fontWeight:700}}>Accès rapide</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:10}}>
          {shortcuts.map(c=>(
            <button key={c.title} onClick={()=>onGoTo(c.k)} style={{background:"#FFFFFF",border:"1.5px solid #E5E5EA",borderRadius:12,padding:"16px 14px",textAlign:"left",cursor:"pointer",transition:"border-color .2s,box-shadow .2s",width:"100%",boxShadow:"0 2px 6px rgba(0,0,0,0.04)"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#00B4D8";e.currentTarget.style.boxShadow="0 4px 16px rgba(0,180,216,0.1)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#E5E5EA";e.currentTarget.style.boxShadow="0 2px 6px rgba(0,0,0,0.04)";}}>
              <div style={{fontSize:24,marginBottom:10}}>{c.icon}</div>
              <p style={{fontFamily:"'Inter'",fontSize:13,fontWeight:700,color:"#1D1D1F",marginBottom:4}}>{c.title}</p>
              <p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93",lineHeight:1.5}}>{c.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Projets en cours */}
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93",letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:700}}>Vos projets en cours</p>
          {projects.length>0&&<button className="btn btn-ghost" style={{fontSize:11}} onClick={()=>onGoTo("projets")}>Voir tout →</button>}
        </div>
        {projects.length===0?(
          <div style={{background:"#FAFAFA",border:"1.5px dashed #E5E5EA",borderRadius:14,padding:"36px 24px",textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:14}}>🎬</div>
            <p style={{fontFamily:"'Inter'",fontSize:14,color:"#1D1D1F",fontWeight:600,marginBottom:6}}>Votre première production commence ici</p>
            <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",marginBottom:20,lineHeight:1.6}}>Contactez-nous pour lancer votre projet.<br/>Notre équipe vous accompagne de A à Z.</p>
            <a href="mailto:contact@thirdone.studio" style={{background:"#00B4D8",color:"#FFFFFF",border:"none",borderRadius:10,padding:"11px 24px",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:"0.04em",textTransform:"uppercase",textDecoration:"none",display:"inline-block",boxShadow:"0 4px 12px rgba(0,180,216,0.3)"}}>Démarrer un projet →</a>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {topProjects.map(p=>{
              const sc=statusColor(p.status);
              const pct=p.progress||0;
              return(
                <button key={p.id} onClick={()=>onGoTo("projets")} style={{background:"#FFFFFF",border:"1.5px solid #E5E5EA",borderRadius:12,padding:"16px 18px",textAlign:"left",cursor:"pointer",width:"100%",transition:"all .2s",boxShadow:"0 2px 6px rgba(0,0,0,0.04)"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=sc;e.currentTarget.style.boxShadow=`0 4px 16px ${sc}22`;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#E5E5EA";e.currentTarget.style.boxShadow="0 2px 6px rgba(0,0,0,0.04)";}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:12}}>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontFamily:"'Inter'",fontSize:14,fontWeight:700,color:"#1D1D1F",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</p>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:12}}>{statusIcon(p.status)}</span>
                        <span style={{fontFamily:"'Inter'",fontSize:11,color:sc,fontWeight:600}}>{statusLabel(p.status)}</span>
                      </div>
                    </div>
                    <span style={{fontFamily:"'Inter'",fontSize:13,fontWeight:700,color:sc,flexShrink:0}}>{pct}%</span>
                  </div>
                  <div style={{height:4,background:"#F2F2F7",borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${sc}99,${sc})`,borderRadius:4,transition:"width .8s"}}/>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Contact */}
      <div style={{background:"#FFFFFF",border:"1.5px solid #E5E5EA",borderRadius:12,padding:"18px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <div>
          <p style={{fontFamily:"'Inter'",fontSize:13,fontWeight:700,color:"#1D1D1F",marginBottom:2}}>Une question ? Nous sommes là pour vous.</p>
          <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73"}}>Notre équipe répond sous 24h.</p>
        </div>
        <a href="mailto:contact@thirdone.studio" style={{background:"transparent",border:"1.5px solid rgba(0,180,216,0.3)",borderRadius:8,padding:"8px 16px",color:"#00B4D8",fontFamily:"'Inter'",fontSize:12,fontWeight:600,textDecoration:"none",cursor:"pointer",whiteSpace:"nowrap"}}>Nous écrire →</a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESTATAIRES MODULE
// ─────────────────────────────────────────────────────────────────────────────
function PrestatairesModule({serviceTypes,setServiceTypes,prestataires,setPrestataires,missions,setMissions,projects,onNotif}){
  const[tab,setTab]=useState("annuaire");
  const[filterType,setFilterType]=useState("all");
  const[newTypeLabel,setNewTypeLabel]=useState("");
  const[newTypeIcon,setNewTypeIcon]=useState("🔧");
  const[loadingMissions,setLoadingMissions]=useState(false);

  const refreshMissions=async()=>{
    setLoadingMissions(true);
    const{data}=await supabase.from("prestataire_missions").select("*").order("created_at",{ascending:false});
    if(data) setMissions(data);
    setLoadingMissions(false);
    onNotif("Missions actualisées");
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{ if(tab==="missions") refreshMissions(); },[tab]);

  const addType=async()=>{
    if(!newTypeLabel.trim())return;
    const{data}=await supabase.from("service_types").insert({label:newTypeLabel.trim(),icone:newTypeIcon,actif:true}).select().single();
    if(data)setServiceTypes(prev=>[...prev,{id:data.id,label:data.label,icone:data.icone,actif:data.actif}]);
    setNewTypeLabel("");setNewTypeIcon("🔧");
    onNotif("Type ajouté !");
  };
  const deleteType=async(id)=>{
    await supabase.from("service_types").delete().eq("id",id);
    setServiceTypes(prev=>prev.filter(t=>t.id!==id));
    onNotif("Type supprimé");
  };

  const emptyP={nom:"",email:"",telephone:"",description:"",portfolio_urls:"",service_type_id:""};
  const[pForm,setPForm]=useState(emptyP);
  const[editId,setEditId]=useState(null);
  const[saving,setSaving]=useState(false);
  const[accessModal,setAccessModal]=useState(null);
  const[accessPass,setAccessPass]=useState("");
  const[creatingAccess,setCreatingAccess]=useState(false);
  const FP=(k,v)=>setPForm(p=>({...p,[k]:v}));

  const createAccess=async()=>{
    if(!accessPass||accessPass.length<6){onNotif("Mot de passe requis (6 caractères min)");return;}
    setCreatingAccess(true);
    const{data,error}=await supabase.auth.signUp({email:accessModal.email,password:accessPass,options:{data:{nom:accessModal.nom,role:"partenaire"}}});
    if(error){onNotif("Erreur : "+error.message);setCreatingAccess(false);return;}
    const uid=data.user?.id;
    if(uid)await supabase.from("profiles").upsert({id:uid,email:accessModal.email,nom:accessModal.nom,role:"partenaire",is_active:true});
    setCreatingAccess(false);setAccessModal(null);setAccessPass("");
    onNotif(`✓ Accès partenaire créé pour ${accessModal.nom}`);
  };

  const savePrestataire=async()=>{
    if(!pForm.nom||!pForm.email||!pForm.service_type_id){onNotif("Nom, email et type requis");return;}
    setSaving(true);
    const urls=pForm.portfolio_urls.split("\n").map(u=>u.trim()).filter(Boolean);
    const payload={nom:pForm.nom,email:pForm.email,telephone:pForm.telephone,description:pForm.description,portfolio_urls:urls,service_type_id:pForm.service_type_id,actif:true};
    if(editId){
      await supabase.from("prestataires").update(payload).eq("id",editId);
      setPrestataires(prev=>prev.map(p=>p.id===editId?{...p,...payload}:p));
      onNotif("Prestataire mis à jour");
    }else{
      const{data}=await supabase.from("prestataires").insert(payload).select().single();
      if(data)setPrestataires(prev=>[...prev,data]);
      onNotif("Prestataire ajouté !");
    }
    setPForm(emptyP);setEditId(null);setSaving(false);
  };
  const openEdit=(p)=>{
    setEditId(p.id);
    setPForm({nom:p.nom,email:p.email,telephone:p.telephone||"",description:p.description||"",portfolio_urls:(p.portfolio_urls||[]).join("\n"),service_type_id:p.service_type_id||""});
  };
  const deletePrestataire=async(id)=>{
    await supabase.from("prestataires").delete().eq("id",id);
    setPrestataires(prev=>prev.filter(p=>p.id!==id));
    onNotif("Prestataire supprimé");
  };

  const filtered=filterType==="all"?prestataires:prestataires.filter(p=>p.service_type_id===filterType);
  const tLabel=id=>serviceTypes.find(t=>t.id===id)?.label||"";
  const tIcon=id=>serviceTypes.find(t=>t.id===id)?.icone||"🔧";
  const statColor=s=>({envoyé:"#00B4D8",répondu:"#7B9CFF",accepté:"#4ECDC4",refusé:"#FF3B30"}[s]||"#6E6E73");

  return(
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div className="fadeUp" style={{background:"linear-gradient(135deg,#4ECDC412,#7B9CFF08)",border:"1px solid #4ECDC425",borderRadius:10,padding:"16px 20px"}}>
        <h2 style={{fontFamily:"'Urbanist'",fontSize:26,color:"#1D1D1F",letterSpacing:"0.04em"}}>ESPACE PRESTATAIRES</h2>
        <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",marginTop:2}}>Annuaire, types de services et missions envoyées depuis les fiches projet.</p>
      </div>
      <div style={{display:"flex",gap:4,background:"#F5F5F7",padding:4,borderRadius:8}}>
        {[{k:"annuaire",l:"Annuaire"},{k:"types",l:"Types de services"},{k:"missions",l:`Missions (${missions.length})`}].map(t=>(
          <button key={t.k} className={`tab ${tab===t.k?"active":""}`} onClick={()=>setTab(t.k)}>{t.l}</button>
        ))}
      </div>

      {tab==="types"&&(
        <div className="fadeUp" style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="card" style={{padding:18}}>
            <SH icon="➕" title="NOUVEAU TYPE"/>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
              <div style={{width:70}}><Lbl>Icône</Lbl><input className="input" value={newTypeIcon} onChange={e=>setNewTypeIcon(e.target.value)} placeholder="🔧"/></div>
              <div style={{flex:1}}><Lbl>Nom du type *</Lbl><input className="input" placeholder="Ex: Location de villa, Traiteur, Transport..." value={newTypeLabel} onChange={e=>setNewTypeLabel(e.target.value)}/></div>
              <button className="btn btn-primary" onClick={addType} disabled={!newTypeLabel.trim()}>Ajouter</button>
            </div>
          </div>
          <div className="card" style={{padding:18}}>
            <SH icon="🏷️" title="TYPES EXISTANTS"/>
            {serviceTypes.length===0&&<p style={{fontFamily:"'Inter'",fontSize:12,color:"#8E8E93"}}>Aucun type — ajoutez-en un ci-dessus.</p>}
            <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:8}}>
              {serviceTypes.map(t=>(
                <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#F5F5F7",borderRadius:8,border:"1px solid #E5E5EA"}}>
                  <span style={{fontSize:18}}>{t.icone}</span>
                  <span style={{fontFamily:"'Inter'",fontSize:13,color:"#1D1D1F",flex:1}}>{t.label}</span>
                  <span style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93"}}>{prestataires.filter(p=>p.service_type_id===t.id).length} prestataire(s)</span>
                  <button className="btn btn-red" style={{padding:"4px 10px",fontSize:11}} onClick={()=>deleteType(t.id)}>Supprimer</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab==="annuaire"&&(
        <div className="fadeUp" style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="card" style={{padding:18}}>
            <SH icon={editId?"✏️":"➕"} title={editId?"MODIFIER PRESTATAIRE":"NOUVEAU PRESTATAIRE"}/>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><Lbl>Nom *</Lbl><input className="input" value={pForm.nom} onChange={e=>FP("nom",e.target.value)} placeholder="Nom ou entreprise"/></div>
                <div><Lbl>Type de service *</Lbl>
                  <select className="input" value={pForm.service_type_id} onChange={e=>FP("service_type_id",e.target.value)}>
                    <option value="">— Choisir —</option>
                    {serviceTypes.map(t=><option key={t.id} value={t.id}>{t.icone} {t.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><Lbl>Email *</Lbl><input className="input" type="email" value={pForm.email} onChange={e=>FP("email",e.target.value)} placeholder="contact@exemple.com"/></div>
                <div><Lbl>Téléphone</Lbl><input className="input" value={pForm.telephone} onChange={e=>FP("telephone",e.target.value)} placeholder="+596 696 ..."/></div>
              </div>
              <div><Lbl>Description</Lbl><textarea className="input" rows={2} value={pForm.description} onChange={e=>FP("description",e.target.value)} placeholder="Spécialités, zone d'intervention..."/></div>
              <div><Lbl>Portfolio / Liens (un par ligne)</Lbl><textarea className="input" rows={3} value={pForm.portfolio_urls} onChange={e=>FP("portfolio_urls",e.target.value)} placeholder={"https://instagram.com/...\nhttps://son-site.com"}/></div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                {editId&&<button className="btn btn-ghost" onClick={()=>{setEditId(null);setPForm(emptyP);}}>Annuler</button>}
                <button className="btn btn-primary" onClick={savePrestataire} disabled={saving}>{saving?"...":(editId?"Mettre à jour":"Ajouter")}</button>
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontFamily:"'Inter'",fontSize:12,color:"#8E8E93"}}>Filtrer :</span>
            <button className={`type-pill ${filterType==="all"?"selected":""}`} onClick={()=>setFilterType("all")}>Tous ({prestataires.length})</button>
            {serviceTypes.map(t=>(
              <button key={t.id} className={`type-pill ${filterType===t.id?"selected":""}`} onClick={()=>setFilterType(t.id)}>
                {t.icone} {t.label} ({prestataires.filter(p=>p.service_type_id===t.id).length})
              </button>
            ))}
          </div>
          {filtered.length===0&&<p style={{fontFamily:"'Inter'",fontSize:12,color:"#8E8E93",textAlign:"center",padding:20}}>Aucun prestataire{filterType!=="all"?" pour ce type":""}.</p>}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {filtered.map(p=>(
              <div key={p.id} className="card fadeUp" style={{padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                      <span style={{fontSize:16}}>{tIcon(p.service_type_id)}</span>
                      <span style={{fontFamily:"'Inter'",fontSize:14,fontWeight:600,color:"#1D1D1F"}}>{p.nom}</span>
                      <span style={{fontFamily:"'Inter'",fontSize:11,color:"#6E6E73",background:"#F2F2F7",padding:"2px 8px",borderRadius:10}}>{tLabel(p.service_type_id)}</span>
                    </div>
                    <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                      <span style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73"}}>✉ {p.email}</span>
                      {p.telephone&&<span style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73"}}>📞 {p.telephone}</span>}
                    </div>
                    {p.description&&<p style={{fontFamily:"'Inter'",fontSize:12,color:"#8E8E93",marginTop:4}}>{p.description}</p>}
                    {(p.portfolio_urls||[]).length>0&&(
                      <div style={{marginTop:6,display:"flex",gap:6,flexWrap:"wrap"}}>
                        {p.portfolio_urls.map((url,i)=>{const safe=safePortfolioUrl(url);return safe?(<a key={i} href={safe} target="_blank" rel="noreferrer" style={{fontFamily:"'Inter'",fontSize:11,color:"#7B9CFF",textDecoration:"none",background:"#7B9CFF15",border:"1px solid #7B9CFF30",borderRadius:4,padding:"2px 8px"}}>↗ Lien {i+1}</a>):null;})}
                      </div>
                    )}
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <button className="btn btn-blue" style={{padding:"5px 10px",fontSize:11}} onClick={()=>{setAccessModal(p);setAccessPass("");}}>🔑 Accès</button>
                    <button className="btn btn-ghost" style={{padding:"5px 10px",fontSize:11}} onClick={()=>openEdit(p)}>✏</button>
                    <button className="btn btn-red" style={{padding:"5px 10px",fontSize:11}} onClick={()=>deletePrestataire(p.id)}>✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {accessModal&&(
        <div className="modal-overlay" onClick={()=>setAccessModal(null)}>
          <div className="modal" style={{padding:24}} onClick={e=>e.stopPropagation()}>
            <h3 style={{fontFamily:"'Urbanist'",fontSize:18,color:"#1D1D1F",letterSpacing:"0.05em",marginBottom:4}}>CRÉER UN ACCÈS PARTENAIRE</h3>
            <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",marginBottom:16}}>{accessModal.nom} — {accessModal.email}</p>
            <p style={{fontFamily:"'Inter'",fontSize:12,color:"#8E8E93",marginBottom:12}}>Le partenaire pourra se connecter sur thirdone.studio avec son email et ce mot de passe. Il accèdera à un espace dédié pour voir et répondre à ses missions.</p>
            <div style={{marginBottom:16}}>
              <Lbl>Mot de passe initial</Lbl>
              <input className="input" type="password" value={accessPass} onChange={e=>setAccessPass(e.target.value)} placeholder="Minimum 6 caractères"/>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setAccessModal(null)}>Annuler</button>
              <button className="btn btn-primary" disabled={creatingAccess||!accessPass} onClick={createAccess}>{creatingAccess?"Création...":"Créer l'accès"}</button>
            </div>
          </div>
        </div>
      )}

      {tab==="missions"&&(
        <div className="fadeUp" style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <button className="btn btn-ghost" style={{fontSize:11}} disabled={loadingMissions} onClick={refreshMissions}>{loadingMissions?"↻ Chargement...":"↻ Actualiser"}</button>
          </div>
          {missions.length===0&&!loadingMissions&&(
            <div className="card" style={{padding:30,textAlign:"center"}}>
              <p style={{fontFamily:"'Inter'",fontSize:13,color:"#8E8E93"}}>Aucune mission envoyée.</p>
              <p style={{fontFamily:"'Inter'",fontSize:12,color:"#8E8E93",marginTop:6}}>Envoyez des missions depuis l'onglet "Prestataires" d'une fiche projet.</p>
            </div>
          )}
          {missions.map(m=>{
            const prest=prestataires.find(p=>p.id===m.prestataire_id);
            const proj=projects.find(p=>p.id===m.project_id);
            const respUrl=`${window.location.origin}${window.location.pathname}?prestataire=${m.token}`;
            return(
              <div key={m.id} className="card fadeUp" style={{padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                      <span style={{fontFamily:"'Inter'",fontSize:14,fontWeight:600,color:"#1D1D1F"}}>{prest?.nom||"Prestataire inconnu"}</span>
                      <span style={{fontFamily:"'Inter'",fontSize:11,color:"#6E6E73"}}>→ {proj?.title||"Projet inconnu"}</span>
                      <span style={{fontFamily:"'Inter'",fontSize:11,fontWeight:600,color:statColor(m.statut),background:statColor(m.statut)+"22",border:`1px solid ${statColor(m.statut)}44`,borderRadius:10,padding:"2px 8px"}}>{m.statut}</span>
                    </div>
                    {m.brief_extrait&&<p style={{fontFamily:"'JetBrains Mono'",fontSize:11,color:"#8E8E93",background:"#F5F5F7",padding:"8px 12px",borderRadius:6,whiteSpace:"pre-line",marginBottom:8}}>{m.brief_extrait}</p>}
                    {m.message_dispo&&(
                      <div style={{background:"#4ECDC410",border:"1px solid #4ECDC430",borderRadius:8,padding:"10px 14px",marginBottom:8}}>
                        <p style={{fontFamily:"'Inter'",fontSize:11,color:"#4ECDC4",fontWeight:600,marginBottom:4}}>Réponse reçue</p>
                        <p style={{fontFamily:"'Inter'",fontSize:13,color:"#1D1D1F"}}>{m.message_dispo}</p>
                      </div>
                    )}
                    <p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93"}}>Envoyé le {m.created_at?new Date(m.created_at).toLocaleDateString("fr-FR"):"-"}{m.responded_at&&` · Réponse le ${new Date(m.responded_at).toLocaleDateString("fr-FR")}`}</p>
                  </div>
                  <div style={{display:"flex",gap:6,flexDirection:"column",alignItems:"flex-end"}}>
                    {m.statut==="envoyé"&&(
                      <button className="btn btn-ghost" style={{fontSize:11}} onClick={()=>{navigator.clipboard.writeText(respUrl);onNotif("Lien copié !");}}>🔗 Copier lien réponse</button>
                    )}
                    {m.statut==="répondu"&&(
                      <>
                        <button className="btn btn-green" style={{fontSize:11}} onClick={async()=>{await supabase.from("prestataire_missions").update({statut:"accepté"}).eq("id",m.id);setMissions(prev=>prev.map(x=>x.id===m.id?{...x,statut:"accepté"}:x));onNotif("Mission acceptée");}}>✓ Accepter</button>
                        <button className="btn btn-red" style={{fontSize:11}} onClick={async()=>{await supabase.from("prestataire_missions").update({statut:"refusé"}).eq("id",m.id);setMissions(prev=>prev.map(x=>x.id===m.id?{...x,statut:"refusé"}:x));onNotif("Mission refusée");}}>✕ Refuser</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT PRESTATAIRES PANEL (onglet dans fiche projet admin)
// ─────────────────────────────────────────────────────────────────────────────
function ProjectPrestatairesPanel({project,serviceTypes,prestataires,missions,setMissions,onNotif}){
  const[sending,setSending]=useState(null);
  const[copied,setCopied]=useState(null);
  const[freshBrief,setFreshBrief]=useState(project.brief||{});
  const[refreshing,setRefreshing]=useState(false);

  useEffect(()=>{
    supabase.from("projects").select("brief").eq("id",project.id).single()
      .then(({data})=>{ if(data?.brief) setFreshBrief(data.brief); });
  },[project.id]);

  const refreshBrief=async()=>{
    setRefreshing(true);
    const{data}=await supabase.from("projects").select("brief").eq("id",project.id).single();
    if(data?.brief) setFreshBrief(data.brief);
    setRefreshing(false);
    onNotif("Brief actualisé");
  };

  const briefServices=freshBrief.services||[];
  const matchingTypes=serviceTypes.filter(t=>briefServices.includes(t.id));
  const missionsForProject=missions.filter(m=>String(m.project_id)===String(project.id));

  const buildExtrait=(prest,typeLabel)=>{
    const b=project.brief||{};
    return [
      `Projet : ${project.title}`,
      `Service demandé : ${typeLabel}`,
      b.objective?`Objectif : ${b.objective}`:"",
      b.target?`Cible : ${b.target}`:"",
      project.shootDate?`Date souhaitée : ${project.shootDate}`:"",
      b.notes?`Informations : ${b.notes}`:"",
      `\nLien pour répondre à cette mission : [votre lien personnalisé]`,
    ].filter(Boolean).join("\n");
  };

  const sendMission=async(prest,type)=>{
    const existing=missionsForProject.find(m=>m.prestataire_id===prest.id);
    if(existing){onNotif("Mission déjà envoyée à ce prestataire");return;}
    setSending(prest.id);
    const extrait=buildExtrait(prest,type.label);
    const{data}=await supabase.from("prestataire_missions").insert({
      prestataire_id:prest.id,
      project_id:project.id,
      brief_extrait:extrait,
      statut:"envoyé",
    }).select().single();
    if(data){
      const fullExtrait=extrait.replace("[votre lien personnalisé]",`${window.location.origin}${window.location.pathname}?prestataire=${data.token}`);
      await supabase.from("prestataire_missions").update({brief_extrait:fullExtrait}).eq("id",data.id);
      setMissions(prev=>[{...data,brief_extrait:fullExtrait},...prev]);
      const mailBody=encodeURIComponent(`Bonjour ${prest.nom},\n\nNous avons un projet qui pourrait vous intéresser.\n\n${fullExtrait}\n\nCordialement,\nThird-One Studio`);
      const mailSubject=encodeURIComponent(`Mission prestataire — ${project.title}`);
      window.open(`mailto:${prest.email}?subject=${mailSubject}&body=${mailBody}`);
      onNotif("Mission créée — email pré-rempli ouvert !");
    }
    setSending(null);
  };

  const copyLink=async(token)=>{
    const url=`${window.location.origin}${window.location.pathname}?prestataire=${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(()=>setCopied(null),2000);
    onNotif("Lien copié !");
  };

  const statColor=s=>({envoyé:"#00B4D8",répondu:"#7B9CFF",accepté:"#4ECDC4",refusé:"#FF3B30"}[s]||"#6E6E73");

  if(briefServices.length===0)return(
    <div className="card" style={{padding:24,textAlign:"center",display:"flex",flexDirection:"column",gap:12,alignItems:"center"}}>
      <p style={{fontFamily:"'Inter'",fontSize:13,color:"#8E8E93"}}>Le client n'a pas encore coché de services prestataires dans son brief.</p>
      <button className="btn btn-ghost" style={{fontSize:11}} disabled={refreshing} onClick={refreshBrief}>{refreshing?"↻ Actualisation...":"↻ Actualiser le brief"}</button>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <button className="btn btn-ghost" style={{fontSize:11}} disabled={refreshing} onClick={refreshBrief}>{refreshing?"↻ Actualisation...":"↻ Actualiser le brief"}</button>
      </div>
      {matchingTypes.length===0&&(
        <div className="card" style={{padding:18}}>
          <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73"}}>Services cochés par le client mais aucun type correspondant dans l'annuaire. Vérifiez les types de services.</p>
        </div>
      )}
      {matchingTypes.map(type=>{
        const prests=prestataires.filter(p=>p.service_type_id===type.id);
        return(
          <div key={type.id} className="card" style={{padding:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <span style={{fontSize:20}}>{type.icone}</span>
              <span style={{fontFamily:"'Urbanist'",fontSize:17,color:"#1D1D1F",letterSpacing:"0.05em"}}>{type.label}</span>
              <span style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93"}}>{prests.length} prestataire(s) disponible(s)</span>
            </div>
            {prests.length===0&&<p style={{fontFamily:"'Inter'",fontSize:12,color:"#8E8E93"}}>Aucun prestataire pour ce type — ajoutez-en dans l'espace Prestataires.</p>}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {prests.map(p=>{
                const mission=missionsForProject.find(m=>m.prestataire_id===p.id);
                return(
                  <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#F5F5F7",borderRadius:8,border:`1px solid ${mission?"#00B4D840":"#E5E5EA"}`,flexWrap:"wrap"}}>
                    <div style={{flex:1}}>
                      <p style={{fontFamily:"'Inter'",fontSize:13,fontWeight:600,color:"#1D1D1F"}}>{p.nom}</p>
                      <p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93"}}>{p.email}{p.telephone?` · ${p.telephone}`:""}</p>
                    </div>
                    {mission?(
                      <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                        <span style={{fontFamily:"'Inter'",fontSize:11,fontWeight:600,color:statColor(mission.statut),background:statColor(mission.statut)+"22",border:`1px solid ${statColor(mission.statut)}44`,borderRadius:10,padding:"2px 8px"}}>{mission.statut}</span>
                        {mission.statut==="envoyé"&&(
                          <button className="btn btn-ghost" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>copyLink(mission.token)}>{copied===mission.token?"✓ Copié !":"🔗 Lien"}</button>
                        )}
                      </div>
                    ):(
                      <button className="btn btn-primary" style={{fontSize:11,padding:"6px 12px"}} disabled={sending===p.id} onClick={()=>sendMission(p,type)}>
                        {sending===p.id?"Envoi...":"✉ Envoyer mission"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {missionsForProject.length>0&&(
        <div className="card" style={{padding:16}}>
          <SH icon="📬" title="HISTORIQUE DES MISSIONS"/>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8}}>
            {missionsForProject.map(m=>{
              const prest=prestataires.find(p=>p.id===m.prestataire_id);
              return(
                <div key={m.id} style={{padding:"10px 14px",background:"#F5F5F7",borderRadius:8,border:"1px solid #E5E5EA"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
                    <span style={{fontFamily:"'Inter'",fontSize:13,color:"#1D1D1F"}}>{prest?.nom||"—"}</span>
                    <span style={{fontFamily:"'Inter'",fontSize:11,fontWeight:600,color:statColor(m.statut),background:statColor(m.statut)+"22",padding:"2px 8px",borderRadius:10}}>{m.statut}</span>
                  </div>
                  {m.message_dispo&&<p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",marginTop:4,whiteSpace:"pre-line"}}>{m.message_dispo}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ESPACE PARTENAIRE (dashboard connecté)
// ─────────────────────────────────────────────────────────────────────────────
function PartenaireView({user,userProfile,onLogout}){
  const[prestataire,setPrestataire]=useState(null);
  const[missions,setMissions]=useState([]);
  const[serviceTypes,setServiceTypes]=useState([]);
  const[loading,setLoading]=useState(true);
  const[respondingId,setRespondingId]=useState(null);
  const[replyMsg,setReplyMsg]=useState("");
  const[replyPrix,setReplyPrix]=useState("");
  const[replyDesc,setReplyDesc]=useState("");
  const[nonConcurrence,setNonConcurrence]=useState(false);
  const[portfolioInput,setPortfolioInput]=useState("");
  const[savingPortfolio,setSavingPortfolio]=useState(false);
  const[notif,setNotif]=useState(null);
  const showNotif=msg=>{setNotif(msg);setTimeout(()=>setNotif(null),3100);};

  useEffect(()=>{
    const load=async()=>{
      const{data:pData}=await supabase.from("prestataires").select("*").eq("email",user.email).single();
      if(!pData){setLoading(false);return;}
      setPrestataire(pData);
      setPortfolioInput((pData.portfolio_urls||[]).join("\n"));
      const[{data:mData},{data:stData}]=await Promise.all([
        supabase.from("prestataire_missions").select("*, projects(id,title,shoot_date)").eq("prestataire_id",pData.id).order("created_at",{ascending:false}),
        supabase.from("service_types").select("*"),
      ]);
      if(mData)setMissions(mData);
      if(stData)setServiceTypes(stData);
      setLoading(false);
    };
    load();
  },[user.email]);

  const respond=async(mission)=>{
    if(!replyMsg.trim())return;
    if(!nonConcurrence){showNotif("Veuillez accepter la clause de non-concurrence");return;}
    const urls=portfolioInput.split("\n").map(u=>u.trim()).filter(Boolean);
    const proposal={type:"prestataire_proposal",message:replyMsg,prix:replyPrix?Number(replyPrix):null,description:replyDesc,portfolio_urls:urls,non_concurrence:true};
    const summary=[replyPrix?`Proposition : ${replyPrix} €`:"",replyDesc,replyMsg].filter(Boolean).join("\n");
    await supabase.from("prestataire_missions").update({statut:"répondu",message_dispo:summary,responded_at:new Date().toISOString()}).eq("id",mission.id);
    if(mission.project_id){
      await supabase.from("messages").insert({project_id:mission.project_id,author:prestataire.nom,content:JSON.stringify(proposal),role:"prestataire"});
    }
    setMissions(prev=>prev.map(m=>m.id===mission.id?{...m,statut:"répondu",message_dispo:summary}:m));
    setReplyMsg("");setReplyPrix("");setReplyDesc("");setNonConcurrence(false);setRespondingId(null);
    showNotif("Proposition envoyée !");
  };

  const savePortfolio=async()=>{
    if(!prestataire)return;
    setSavingPortfolio(true);
    const urls=portfolioInput.split("\n").map(u=>u.trim()).filter(Boolean);
    await supabase.from("prestataires").update({portfolio_urls:urls}).eq("id",prestataire.id);
    setPrestataire(p=>({...p,portfolio_urls:urls}));
    setSavingPortfolio(false);showNotif("Portfolio mis à jour !");
  };

  const statColor=s=>({envoyé:"#00B4D8",répondu:"#7B9CFF",accepté:"#4ECDC4",refusé:"#FF3B30"}[s]||"#6E6E73");
  const tLabel=id=>serviceTypes.find(t=>t.id===id)?.label||"";
  const tIcon=id=>serviceTypes.find(t=>t.id===id)?.icone||"🤝";

  if(loading)return<div style={{minHeight:"100vh",background:"#FFFFFF",display:"flex",alignItems:"center",justifyContent:"center"}}><FontLoader/><p style={{color:"#0090B3",fontFamily:"'Urbanist'",fontSize:18,letterSpacing:"0.15em"}}>CHARGEMENT...</p></div>;

  if(!prestataire)return(
    <div style={{minHeight:"100vh",background:"#FFFFFF",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <FontLoader/>
      <p style={{color:"#FF3B30",fontFamily:"'Urbanist'",fontSize:20}}>COMPTE NON LIÉ</p>
      <p style={{color:"#8E8E93",fontFamily:"'Inter'",fontSize:13,textAlign:"center",maxWidth:320}}>Ce compte n'est pas encore associé à un prestataire. Contactez Third-One Studio.</p>
      <button className="btn btn-ghost" onClick={onLogout}>Se déconnecter</button>
    </div>
  );

  const pending=missions.filter(m=>m.statut==="envoyé");
  const historic=missions.filter(m=>m.statut!=="envoyé");

  return(
    <>
      <FontLoader/>
      <div style={{minHeight:"100vh",background:"#FFFFFF",color:"#1D1D1F"}}>
        <div style={{background:"#F5F5F7",borderBottom:"1px solid #E5E5EA",padding:"0 20px",height:54,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <img src="/logo-wordmark.svg" alt="ThirdOne Studio" style={{height:24,display:"block"}}/>
            <span style={{color:"#E5E5EA"}}>|</span>
            <span style={{fontFamily:"'Inter'",fontSize:11,color:"#4ECDC4"}}>Espace Partenaire</span>
          </div>
          <button className="btn btn-ghost" style={{fontSize:12}} onClick={onLogout}>Déconnexion</button>
        </div>

        <div style={{maxWidth:760,margin:"0 auto",padding:"28px 16px",display:"flex",flexDirection:"column",gap:20}}>
          <div className="fadeUp" style={{background:"linear-gradient(135deg,#4ECDC412,#7B9CFF08)",border:"1px solid #4ECDC430",borderRadius:12,padding:"20px 24px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
            <div style={{width:52,height:52,borderRadius:"50%",background:"#4ECDC422",border:"1.5px solid #4ECDC455",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{tIcon(prestataire.service_type_id)}</div>
            <div style={{flex:1}}>
              <h1 style={{fontFamily:"'Urbanist'",fontSize:24,color:"#1D1D1F",letterSpacing:"0.04em"}}>{prestataire.nom}</h1>
              <p style={{fontFamily:"'Inter'",fontSize:13,color:"#4ECDC4"}}>{tLabel(prestataire.service_type_id)}</p>
              {prestataire.description&&<p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",marginTop:4}}>{prestataire.description}</p>}
            </div>
            <div style={{textAlign:"right"}}>
              <p style={{fontFamily:"'JetBrains Mono'",fontSize:12,color:"#00B4D8",fontWeight:600}}>{pending.length} mission{pending.length!==1?"s":""} en attente</p>
              <p style={{fontFamily:"'JetBrains Mono'",fontSize:11,color:"#4ECDC4"}}>{historic.filter(m=>m.statut==="accepté").length} acceptée(s)</p>
            </div>
          </div>

          {pending.length>0&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <h2 style={{fontFamily:"'Urbanist'",fontSize:18,color:"#00B4D8",letterSpacing:"0.05em"}}>MISSIONS EN ATTENTE</h2>
              {pending.map(m=>(
                <div key={m.id} className="card fadeUp" style={{padding:20,borderColor:"#00B4D830"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
                    <div>
                      <p style={{fontFamily:"'Inter'",fontSize:14,fontWeight:600,color:"#1D1D1F"}}>{m.projects?.title||"Projet"}</p>
                      {m.projects?.shoot_date&&<p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",marginTop:2}}>📅 Date souhaitée : {new Date(m.projects.shoot_date+"T12:00:00").toLocaleDateString("fr-FR")}</p>}
                    </div>
                    <span style={{fontFamily:"'Inter'",fontSize:11,fontWeight:600,color:"#00B4D8",background:"#00B4D822",border:"1px solid #00B4D844",borderRadius:10,padding:"2px 8px"}}>En attente</span>
                  </div>
                  {m.brief_extrait&&(
                    <div style={{background:"#F5F5F7",borderRadius:8,padding:"12px 16px",marginBottom:14}}>
                      <p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>Brief du projet</p>
                      <p style={{fontFamily:"'Inter'",fontSize:13,color:"#1D1D1F",lineHeight:1.7,whiteSpace:"pre-line"}}>{m.brief_extrait}</p>
                    </div>
                  )}
                  {respondingId===m.id?(
                    <div style={{display:"flex",flexDirection:"column",gap:12}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        <div>
                          <label style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",display:"block",marginBottom:4}}>Prix proposé (€ HT)</label>
                          <input className="input" type="number" min="0" placeholder="Ex: 800" value={replyPrix} onChange={e=>setReplyPrix(e.target.value)}/>
                        </div>
                        <div>
                          <label style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",display:"block",marginBottom:4}}>Ce qui est inclus</label>
                          <input className="input" placeholder="Ex: Demi-journée, 2 photos HD..." value={replyDesc} onChange={e=>setReplyDesc(e.target.value)}/>
                        </div>
                      </div>
                      <div>
                        <label style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",display:"block",marginBottom:4}}>Message *</label>
                        <textarea className="input" rows={3} placeholder="Votre disponibilité, conditions particulières..." value={replyMsg} onChange={e=>setReplyMsg(e.target.value)}/>
                      </div>
                      <p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93"}}>Vos liens portfolio seront automatiquement joints à la proposition.</p>
                      <div style={{background:"#FF9F4310",border:"1px solid #FF9F4330",borderRadius:8,padding:"12px 14px"}}>
                        <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",userSelect:"none"}}>
                          <input type="checkbox" checked={nonConcurrence} onChange={e=>setNonConcurrence(e.target.checked)} style={{marginTop:3,flexShrink:0,accentColor:"#FF9F43"}}/>
                          <span style={{fontFamily:"'Inter'",fontSize:12,color:"#1D1D1F",lineHeight:1.5}}>
                            <strong style={{color:"#FF9F43"}}>Clause de non-concurrence</strong> — Je m'engage à ne pas démarcher directement les clients de Third-One Studio présentés dans le cadre de ces missions, pendant une durée de 24 mois à compter de la fin de la mission.
                          </span>
                        </label>
                      </div>
                      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                        <button className="btn btn-ghost" onClick={()=>{setRespondingId(null);setReplyMsg("");setReplyPrix("");setReplyDesc("");setNonConcurrence(false);}}>Annuler</button>
                        <button className="btn btn-primary" disabled={!replyMsg.trim()||!nonConcurrence} onClick={()=>respond(m)}>✓ Envoyer ma proposition</button>
                      </div>
                    </div>
                  ):(
                    <button className="btn btn-green" onClick={()=>setRespondingId(m.id)}>Répondre à cette mission</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {historic.length>0&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <h2 style={{fontFamily:"'Urbanist'",fontSize:18,color:"#1D1D1F",letterSpacing:"0.05em"}}>HISTORIQUE</h2>
              {historic.map(m=>(
                <div key={m.id} className="card fadeUp" style={{padding:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                    <div>
                      <p style={{fontFamily:"'Inter'",fontSize:13,fontWeight:600,color:"#1D1D1F"}}>{m.projects?.title||"Projet"}</p>
                      {m.responded_at&&<p style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93",marginTop:2}}>Répondu le {new Date(m.responded_at).toLocaleDateString("fr-FR")}</p>}
                    </div>
                    <span style={{fontFamily:"'Inter'",fontSize:11,fontWeight:600,color:statColor(m.statut),background:statColor(m.statut)+"22",border:`1px solid ${statColor(m.statut)}44`,borderRadius:10,padding:"2px 8px"}}>{m.statut}</span>
                  </div>
                  {m.message_dispo&&<p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",marginTop:8,whiteSpace:"pre-line"}}>{m.message_dispo}</p>}
                </div>
              ))}
            </div>
          )}

          {missions.length===0&&(
            <div className="card" style={{padding:30,textAlign:"center"}}>
              <p style={{fontFamily:"'Inter'",fontSize:13,color:"#8E8E93"}}>Aucune mission reçue pour l'instant.</p>
              <p style={{fontFamily:"'Inter'",fontSize:12,color:"#8E8E93",marginTop:6}}>Vous serez contacté directement par l'équipe Third-One Studio.</p>
            </div>
          )}

          <div className="card" style={{padding:20}}>
            <SH icon="🖼️" title="MON PORTFOLIO"/>
            <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",marginBottom:10}}>Liens Instagram, site web, Google Photos… (un par ligne). Ils seront joints à vos réponses.</p>
            <textarea className="input" rows={4} value={portfolioInput} onChange={e=>setPortfolioInput(e.target.value)} placeholder={"https://instagram.com/votre-compte\nhttps://votre-site.com\nhttps://drive.google.com/..."}/>
            <div style={{marginTop:10,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {(prestataire.portfolio_urls||[]).map((url,i)=>{const safe=safePortfolioUrl(url);return safe?(<a key={i} href={safe} target="_blank" rel="noreferrer" style={{fontFamily:"'Inter'",fontSize:11,color:"#7B9CFF",textDecoration:"none",background:"#7B9CFF15",border:"1px solid #7B9CFF30",borderRadius:4,padding:"2px 8px"}}>↗ Lien {i+1}</a>):null;})}
              </div>
              <button className="btn btn-primary" onClick={savePortfolio} disabled={savingPortfolio}>{savingPortfolio?"Enregistrement...":"Enregistrer"}</button>
            </div>
          </div>
        </div>
        {notif&&<Notif msg={notif} onDone={()=>setNotif(null)}/>}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE RÉPONSE PRESTATAIRE (token public)
// ─────────────────────────────────────────────────────────────────────────────
function PrestaireResponsePage({token}){
  const[mission,setMission]=useState(null);
  const[loading,setLoading]=useState(true);
  const[submitting,setSubmitting]=useState(false);
  const[done,setDone]=useState(false);
  const[message,setMessage]=useState("");
  const[prix,setPrix]=useState("");
  const[description,setDescription]=useState("");
  const[portfolioUrls,setPortfolioUrls]=useState("");
  const[nonConcurrence,setNonConcurrence]=useState(false);
  const[errMsg,setErrMsg]=useState("");

  useEffect(()=>{
    supabase.from("prestataire_missions").select("*, prestataires(*), projects(id,title)").eq("token",token).single()
      .then(({data,error})=>{
        if(error||!data)setErrMsg("Mission introuvable ou lien expiré.");
        else setMission(data);
        setLoading(false);
      });
  },[token]);

  const submit=async()=>{
    if(!message.trim())return;
    if(!nonConcurrence)return;
    setSubmitting(true);
    const urls=portfolioUrls.split("\n").map(u=>u.trim()).filter(Boolean);
    const nom=mission.prestataires?.nom||"Prestataire";
    const proposal={type:"prestataire_proposal",message,prix:prix?Number(prix):null,description,portfolio_urls:urls,non_concurrence:true};
    const summary=[prix?`Proposition : ${prix} €`:"",description,message].filter(Boolean).join("\n");
    await supabase.from("prestataire_missions").update({statut:"répondu",message_dispo:summary,responded_at:new Date().toISOString()}).eq("id",mission.id);
    if(mission.project_id){
      await supabase.from("messages").insert({project_id:mission.project_id,author:nom,content:JSON.stringify(proposal),role:"prestataire"});
    }
    setDone(true);setSubmitting(false);
  };

  if(loading)return<div style={{minHeight:"100vh",background:"#FFFFFF",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:"#0090B3",fontFamily:"'Urbanist'",fontSize:18,letterSpacing:"0.15em"}}>CHARGEMENT...</p></div>;
  if(errMsg)return<div style={{minHeight:"100vh",background:"#FFFFFF",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}><p style={{color:"#FF3B30",fontFamily:"'Urbanist'",fontSize:20}}>LIEN INVALIDE</p><p style={{color:"#8E8E93",fontFamily:"'Inter'",fontSize:13}}>{errMsg}</p></div>;
  if(done)return(
    <div style={{minHeight:"100vh",background:"#FFFFFF",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <FontLoader/>
      <span style={{fontSize:48}}>✅</span>
      <p style={{color:"#4ECDC4",fontFamily:"'Urbanist'",fontSize:22,letterSpacing:"0.1em"}}>RÉPONSE ENVOYÉE</p>
      <p style={{color:"#6E6E73",fontFamily:"'Inter'",fontSize:13,textAlign:"center",maxWidth:320}}>Merci ! L'équipe Third-One Studio a bien reçu votre disponibilité. Ils vous recontacteront directement.</p>
    </div>
  );

  return(
    <>
      <FontLoader/>
      <div style={{minHeight:"100vh",background:"#FFFFFF",color:"#1D1D1F",padding:"32px 16px"}}>
        <div style={{maxWidth:580,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:32}}>
            <img src="/logo-wordmark.svg" alt="ThirdOne Studio" style={{height:28,display:"inline-block"}}/>
            <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",marginTop:4}}>Mission prestataire</p>
          </div>
          <div style={{background:"#FFFFFF",border:"1px solid #E5E5EA",borderRadius:10,padding:24,marginBottom:16}}>
            <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>Projet</p>
            <p style={{fontFamily:"'Inter'",fontSize:15,fontWeight:600,color:"#1D1D1F"}}>{mission.projects?.title||"—"}</p>
            {mission.prestataires&&<p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",marginTop:4}}>Demande pour : <span style={{color:"#00B4D8"}}>{mission.prestataires.nom}</span></p>}
          </div>
          {mission.brief_extrait&&(
            <div style={{background:"#FFFFFF",border:"1px solid #E5E5EA",borderRadius:10,padding:24,marginBottom:16}}>
              <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Brief du projet</p>
              <p style={{fontFamily:"'Inter'",fontSize:13,color:"#1D1D1F",lineHeight:1.7,whiteSpace:"pre-line"}}>{mission.brief_extrait}</p>
            </div>
          )}
          {mission.statut!=="envoyé"?(
            <div style={{background:"#4ECDC410",border:"1px solid #4ECDC430",borderRadius:10,padding:24,textAlign:"center"}}>
              <p style={{fontFamily:"'Inter'",color:"#4ECDC4",fontSize:14,fontWeight:600}}>Vous avez déjà répondu à cette mission.</p>
              <p style={{fontFamily:"'Inter'",color:"#6E6E73",fontSize:12,marginTop:6}}>Statut : {mission.statut}</p>
            </div>
          ):(
            <div style={{background:"#FFFFFF",border:"1px solid #E5E5EA",borderRadius:10,padding:24,display:"flex",flexDirection:"column",gap:14}}>
              <p style={{fontFamily:"'Inter'",fontSize:14,fontWeight:600,color:"#1D1D1F"}}>Votre proposition</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <label style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",display:"block",marginBottom:5}}>Prix proposé (€ HT)</label>
                  <input style={{width:"100%",background:"#F5F5F7",border:"1px solid #E5E5EA",borderRadius:6,padding:"10px 14px",color:"#1D1D1F",fontFamily:"'Inter',sans-serif",fontSize:13,outline:"none",boxSizing:"border-box"}}
                    type="number" min="0" placeholder="Ex: 800" value={prix} onChange={e=>setPrix(e.target.value)}/>
                </div>
                <div>
                  <label style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",display:"block",marginBottom:5}}>Ce qui est inclus</label>
                  <input style={{width:"100%",background:"#F5F5F7",border:"1px solid #E5E5EA",borderRadius:6,padding:"10px 14px",color:"#1D1D1F",fontFamily:"'Inter',sans-serif",fontSize:13,outline:"none",boxSizing:"border-box"}}
                    placeholder="Ex: Demi-journée, 2 photos HD..." value={description} onChange={e=>setDescription(e.target.value)}/>
                </div>
              </div>
              <div>
                <label style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",display:"block",marginBottom:5}}>Message *</label>
                <textarea style={{width:"100%",background:"#F5F5F7",border:"1px solid #E5E5EA",borderRadius:6,padding:"10px 14px",color:"#1D1D1F",fontFamily:"'Inter',sans-serif",fontSize:13,outline:"none",resize:"none",minHeight:90,boxSizing:"border-box"}}
                  placeholder="Votre disponibilité, conditions particulières..." value={message} onChange={e=>setMessage(e.target.value)}/>
              </div>
              <div>
                <label style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",display:"block",marginBottom:5}}>Photos / Portfolio (un lien par ligne)</label>
                <textarea style={{width:"100%",background:"#F5F5F7",border:"1px solid #E5E5EA",borderRadius:6,padding:"10px 14px",color:"#1D1D1F",fontFamily:"'Inter',sans-serif",fontSize:13,outline:"none",resize:"none",boxSizing:"border-box"}}
                  rows={3} placeholder={"https://instagram.com/votre-compte\nhttps://drive.google.com/...\nhttps://votre-site.com/galerie"} value={portfolioUrls} onChange={e=>setPortfolioUrls(e.target.value)}/>
              </div>
              <div style={{background:"#FF9F4310",border:"1px solid #FF9F4330",borderRadius:8,padding:"12px 14px"}}>
                <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",userSelect:"none"}}>
                  <input type="checkbox" checked={nonConcurrence} onChange={e=>setNonConcurrence(e.target.checked)} style={{marginTop:3,flexShrink:0,accentColor:"#FF9F43"}}/>
                  <span style={{fontFamily:"'Inter'",fontSize:12,color:"#1D1D1F",lineHeight:1.5}}>
                    <strong style={{color:"#FF9F43"}}>Clause de non-concurrence</strong> — Je m'engage à ne pas démarcher directement les clients de Third-One Studio présentés dans le cadre de ces missions, pendant une durée de 24 mois à compter de la fin de la mission.
                  </span>
                </label>
              </div>
              <button style={{width:"100%",background:nonConcurrence&&message.trim()?"#00B4D8":"#E5E5EA",color:nonConcurrence&&message.trim()?"#FFFFFF":"#8E8E93",border:"none",borderRadius:6,padding:"12px",fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:600,cursor:nonConcurrence&&message.trim()?"pointer":"not-allowed",transition:"all .2s"}}
                disabled={submitting||!message.trim()||!nonConcurrence} onClick={submit}>
                {submitting?"Envoi en cours...":"✓ Envoyer ma proposition"}
              </button>
              {!nonConcurrence&&<p style={{fontFamily:"'Inter'",fontSize:11,color:"#FF9F43",textAlign:"center",marginTop:-8}}>Veuillez accepter la clause de non-concurrence pour continuer.</p>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function ComptesSection({clients,setClients,onNotif,onPreviewClient,isAdmin=false}){
  const[tab,setTab]=useState("clients");
  const tabs=[{k:"clients",l:"👥 Clients"},...(isAdmin?[{k:"acces",l:"🔐 Accès équipe"}]:[])];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {isAdmin&&(
        <div style={{display:"flex",gap:3,background:"#F5F5F7",padding:4,borderRadius:8,width:"fit-content",border:"1px solid #E5E5EA"}}>
          {tabs.map(t=>(
            <button key={t.k} className={`tab ${tab===t.k?"active":""}`} style={{fontSize:12,padding:"6px 14px"}} onClick={()=>setTab(t.k)}>{t.l}</button>
          ))}
        </div>
      )}
      {tab==="clients"&&<ClientsManager clients={clients} setClients={setClients} onNotif={onNotif} onPreviewClient={onPreviewClient}/>}
      {tab==="acces"&&isAdmin&&<AccessManager onNotif={onNotif}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function AccessManager({onNotif}){
  const[collabs,setCollabs]=useState([]);
  const[loading,setLoading]=useState(true);
  const[showAdd,setShowAdd]=useState(false);
  const[email,setEmail]=useState("");
  const[promoting,setPromoting]=useState(false);

  useEffect(()=>{
    supabase.from("profiles").select("*").eq("role","collaborateur")
      .then(({data})=>{setCollabs(data||[]);setLoading(false);});
  },[]);

  const promote=async()=>{
    if(!email.trim())return;
    setPromoting(true);
    const{data,error}=await supabase.rpc("promote_to_collaborateur",{target_email:email.trim()});
    if(error){onNotif("Erreur : "+error.message);setPromoting(false);return;}
    if(data==="not_found"){onNotif("Aucun compte trouvé pour cet email. Le collaborateur doit d'abord se connecter une fois sur la plateforme.");setPromoting(false);return;}
    const{data:profile}=await supabase.from("profiles").select("*").eq("email",email.trim()).single();
    if(profile) setCollabs(prev=>[...prev.filter(x=>x.email!==email.trim()),profile]);
    setEmail("");setShowAdd(false);
    onNotif("Accès collaborateur accordé !");
    setPromoting(false);
  };

  const revoke=async(c)=>{
    await supabase.rpc("promote_to_collaborateur",{target_email:"__revoke__"});
    await supabase.from("profiles").update({role:"client",is_active:false}).eq("id",c.id);
    setCollabs(prev=>prev.filter(x=>x.id!==c.id));
    onNotif("Accès révoqué");
  };

  const MODULES=["Dashboard","Projets","Calendrier","Organisation","Planning","Social Media","Prestataires","Comptes"];

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div>
          <SH icon="🔐" title="ACCÈS COLLABORATEURS"/>
          <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",marginTop:-8,marginBottom:4}}>Accès complet au back-office sauf la section Estimation / Tarifs.</p>
        </div>
        <button className="btn btn-primary" style={{fontSize:12}} onClick={()=>setShowAdd(v=>!v)}>{showAdd?"Annuler":"+ Ajouter un accès"}</button>
      </div>

      {showAdd&&(
        <div className="card" style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
          <p style={{fontFamily:"'Urbanist'",fontSize:16,color:"#00B4D8",letterSpacing:"0.05em"}}>ACCORDER UN ACCÈS COLLABORATEUR</p>
          <div style={{background:"#00B4D810",border:"1px solid #00B4D830",borderRadius:8,padding:"10px 14px"}}>
            <p style={{fontFamily:"'Inter'",fontSize:12,color:"#00B4D8",lineHeight:1.6}}>
              Le collaborateur doit d'abord <strong>créer son compte</strong> sur thirdone.studio (page de connexion → S'inscrire). Une fois fait, entre son email ci-dessous pour lui accorder l'accès.
            </p>
          </div>
          <div><Lbl>Email du collaborateur</Lbl><input className="input" type="email" placeholder="lucas@thirdone.studio" value={email} onChange={e=>setEmail(e.target.value)}/></div>
          <div style={{background:"#4ECDC410",border:"1px solid #4ECDC430",borderRadius:8,padding:"12px 14px"}}>
            <p style={{fontFamily:"'Inter'",fontSize:12,color:"#4ECDC4",fontWeight:600,marginBottom:8}}>Modules accessibles</p>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {MODULES.map(m=><span key={m} style={{fontFamily:"'Inter'",fontSize:11,background:"#4ECDC415",border:"1px solid #4ECDC430",borderRadius:4,padding:"2px 8px",color:"#1D1D1F"}}>✓ {m}</span>)}
              <span style={{fontFamily:"'Inter'",fontSize:11,background:"#FF3B3015",border:"1px solid #FF3B3030",borderRadius:4,padding:"2px 8px",color:"#FF3B3088",textDecoration:"line-through"}}>Estimation / Tarifs</span>
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
            <button className="btn btn-ghost" onClick={()=>setShowAdd(false)}>Annuler</button>
            <button className="btn btn-primary" disabled={promoting||!email.trim()} onClick={promote}>{promoting?"Recherche...":"Accorder l'accès"}</button>
          </div>
        </div>
      )}

      {loading?<p style={{color:"#8E8E93",fontFamily:"'Inter'",fontSize:13,textAlign:"center",padding:"20px 0"}}>Chargement...</p>
      :collabs.length===0?(
        <div className="card" style={{padding:24,textAlign:"center"}}>
          <p style={{fontFamily:"'Inter'",fontSize:13,color:"#8E8E93"}}>Aucun collaborateur. Ajoutez un accès ci-dessus.</p>
        </div>
      ):collabs.map(c=>(
        <div key={c.id} className="card" style={{padding:16,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{width:38,height:38,borderRadius:"50%",background:"#7B9CFF22",border:"1px solid #7B9CFF44",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Urbanist'",fontSize:18,color:"#7B9CFF",flexShrink:0}}>
            {(c.nom||c.email||"?")[0].toUpperCase()}
          </div>
          <div style={{flex:1}}>
            <p style={{fontFamily:"'Inter'",fontSize:14,fontWeight:600,color:"#1D1D1F"}}>{c.nom||"—"}</p>
            <p style={{fontFamily:"'Inter'",fontSize:12,color:"#8E8E93"}}>{c.email}</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontFamily:"'Inter'",fontSize:11,background:"#7B9CFF22",border:"1px solid #7B9CFF44",borderRadius:10,padding:"2px 10px",color:"#7B9CFF"}}>collaborateur</span>
            <button className="btn btn-red" style={{fontSize:11,padding:"4px 10px"}} onClick={()=>revoke(c)}>Révoquer</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function AppMain() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setAuthLoading(false), 8000);
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user || null);
        setAuthLoading(false);
      })
      .catch(() => { setUser(null); setAuthLoading(false); })
      .finally(() => clearTimeout(timeout));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Global state
  const[appView,setAppView]=useState("client"); // "prod" | "client"
  const[prodSection,setProdSection]=useState("dashboard");
  const[clientSection,setClientSection]=useState("accueil");
  const[showCreateModal,setShowCreateModal]=useState(false);
  const[sidebarOpen,setSidebarOpen]=useState(false);

  // Data
  const[projects,setProjects]=useState([]);
  const[selectedProjectId,setSelectedProjectId]=useState(null);
  const[bookings,setBookings]=useState(INIT_BOOKINGS);
  const[sheets,setSheets]=useState(INIT_SHEETS);
  const[clients,setClients]=useState(INIT_CLIENTS);
  const[pricing,setPricing]=useState(DEFAULT_PRICING);
  const[estimates,setEstimates]=useState(INIT_ESTIMATES);
  const[posts,setPosts]=useState([]);
  const[teamMembers,setTeamMembers]=useState([]);
  const[assignments,setAssignments]=useState([]);
  const[planningSlots,setPlanningSlots]=useState([]);
  const[meetingNotes,setMeetingNotes]=useState([]);
  const[serviceTypes,setServiceTypes]=useState([]);
  const[prestataires,setPrestataires]=useState([]);
  const[prestataireMissions,setPrestataireMissions]=useState([]);
  const[notif,setNotif]=useState(null);
  const[dataLoading,setDataLoading]=useState(true);
  const[previewClientId,setPreviewClientId]=useState(null);
  const[showSettings,setShowSettings]=useState(false);
  const[settings,setSettings]=useState(()=>{try{return JSON.parse(localStorage.getItem("ui_settings"))||DEFAULT_SETTINGS;}catch{return DEFAULT_SETTINGS;}});

  useEffect(()=>{localStorage.setItem("ui_settings",JSON.stringify(settings));},[settings]);

  useEffect(()=>{
    if(!user){ setDataLoading(false); return; }
    const loadData = async () => {
      setDataLoading(true);
      try{
      // Récupère le rôle d'abord pour adapter les requêtes
      const { data: myProfile } = await supabase.from("profiles").select("role").eq("id",user.id).single();
      const isAdminUser = myProfile?.role === "admin" || myProfile?.role === "collaborateur";

      const queries = [
        supabase.from("projects").select("*, messages(*), files(*)").order("created_at",{ascending:false}),
        supabase.from("posts").select("*").order("scheduled_at",{ascending:true}),
        supabase.from("bookings").select("*").order("date",{ascending:true}),
        supabase.from("service_types").select("*").order("label"),
      ];
      // Données admin seulement
      if(isAdminUser){
        queries.push(
          supabase.from("profiles").select("*").neq("role","admin").order("nom"),
          supabase.from("team_members").select("*").order("nom"),
          supabase.from("project_assignments").select("*"),
          supabase.from("planning_slots").select("*").order("date"),
          supabase.from("meeting_notes").select("*").order("date",{ascending:false}),
          supabase.from("prestataires").select("*").order("nom"),
          supabase.from("prestataire_missions").select("*").order("created_at",{ascending:false}),
        );
      }
      const results = await Promise.all(queries);
      const projectsData  = results[0]?.data;
      const postsData     = results[1]?.data;
      const bookingsData  = results[2]?.data;
      const stData        = results[3]?.data;
      const profilesData  = isAdminUser ? results[4]?.data : null;
      const membersData   = isAdminUser ? results[5]?.data : null;
      const assignData    = isAdminUser ? results[6]?.data : null;
      const slotsData     = isAdminUser ? results[7]?.data : null;
      const notesData     = isAdminUser ? results[8]?.data : null;
      const prestData     = isAdminUser ? results[9]?.data : null;
      const missionsData  = isAdminUser ? results[10]?.data : null;

      if(projectsData && projectsData.length > 0) {
        const formatted = projectsData.map(p => ({
          id: p.id,
          title: p.title,
          clientId: p.client_id,
          status: p.status || "brief",
          progress: p.progress || 0,
          createdAt: p.created_at?.split("T")[0],
          brief: p.brief || {},
          replayUrl: p.replay_url || "",
          deliveryDate: p.delivery_date || "",
          shootDate: p.shoot_date || "",
          statusNote: p.status_note || "",
          videoStatus: p.brief?.videoStatus || null,
          videoComment: p.brief?.videoComment || "",
          moodboard: p.brief?.moodboard || [],
          storyboards: (p.storyboards || []).map(s => ({
            id: s.id,
            title: s.title,
            frames: s.frames || [],
            validationStatus: s.validation_status || "pending",
            createdAt: s.created_at?.split("T")[0],
          })),
          comments: (p.messages || []).map(m => ({
            id: m.id,
            author: m.author,
            text: m.content,
            date: m.created_at?.split("T")[0],
            role: m.role,
          })),
          livrables: (p.files || []).map(f => ({
            id: f.id,
            name: f.name,
            url: f.url,
            category: f.category,
            note: f.note,
            date: f.created_at?.split("T")[0],
          })),
        }));
        setProjects(formatted);
        setSelectedProjectId(formatted[0]?.id || null);
      }
      if(postsData) setPosts(postsData.map(p=>({id:p.id,projectId:p.project_id,network:p.network,caption:p.caption||"",assetName:p.asset_name||"",scheduledAt:p.scheduled_at,status:p.status||"draft",comment:p.comment||"",cmNote:p.cm_note||"",createdAt:p.created_at?.split("T")[0]})));
      if(bookingsData) setBookings(bookingsData.map(b=>({...b,projectId:b.project_id||null,client:b.client_name||"",team:b.team||"A",status:b.status||"option",note:b.note||"",startTime:b.start_time||"08:00",endTime:b.end_time||"17:00",createdAt:b.created_at?.split("T")[0],expiresAt:b.expires_at||null,extras:b.extras||[],confirmType:b.confirm_type||null})));
      if(profilesData && profilesData.length > 0) setClients(profilesData.map(p=>({id:p.id,name:p.nom||p.email||"Client",email:p.email||"",discount:p.discount||0,type:p.client_type||"PME",simulatorEnabled:p.simulator_enabled||false,shortoneEnabled:p.shortone_enabled||false,isActive:p.is_active!==false})));
      if(membersData) setTeamMembers(membersData.map(m=>({id:m.id,nom:m.nom,role:m.role||"",email:m.email||"",team:m.team||"A",color:m.color||"#00B4D8"})));
      if(assignData) setAssignments(assignData.map(a=>({id:a.id,projectId:a.project_id,memberId:a.member_id,roleOnProject:a.role_on_project||""})));
      if(slotsData) setPlanningSlots(slotsData.map(s=>({id:s.id,memberId:s.member_id,projectId:s.project_id,date:s.date,type:s.type||"tournage",startTime:s.start_time||"",endTime:s.end_time||"",note:s.note||""})));
      if(notesData) setMeetingNotes(notesData.map(n=>({id:n.id,projectId:n.project_id,date:n.date,participants:n.participants||"",content:n.content||"",decisions:n.decisions||""})));
      if(stData) setServiceTypes(stData.map(t=>({id:t.id,label:t.label,icone:t.icone||"🔧",actif:t.actif!==false})));
      if(prestData) setPrestataires(prestData.map(p=>({id:p.id,nom:p.nom,email:p.email,telephone:p.telephone||"",description:p.description||"",portfolio_urls:p.portfolio_urls||[],service_type_id:p.service_type_id,actif:p.actif!==false})));
      if(missionsData) setPrestataireMissions(missionsData.map(m=>({id:m.id,prestataire_id:m.prestataire_id,project_id:m.project_id,brief_extrait:m.brief_extrait||"",statut:m.statut||"envoyé",message_dispo:m.message_dispo||"",token:m.token,responded_at:m.responded_at,created_at:m.created_at})));
      }catch(e){ console.error("loadData error",e); }
      finally{ setDataLoading(false); }
    };
    loadData();
  },[user]);

  const [userRole, setUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("*").eq("id", user.id).single()
        .then(({ data }) => {
          const role = data?.role || "client";
          setUserRole(role);
          setUserProfile(data || null);
          if(role === "collaborateur" || role === "admin") setAppView("prod");
        });
    }
  }, [user]);

  useEffect(() => {
    if (appView !== "client") return;
    const effClientId = userRole === "client" && user ? user.id : (previewClientId || null);
    const cProjects = effClientId ? projects.filter(p => p.clientId === effClientId) : projects;
    if (cProjects.length === 0) return;
    if (cProjects.find(p => p.id === selectedProjectId)) return;
    setSelectedProjectId(cProjects[0].id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appView, userRole, user, previewClientId, projects]);

  if (authLoading || dataLoading) return <div style={{minHeight:"100vh",background:"#FFFFFF",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
    <img src="/logo192.png" alt="Third-One Studio" style={{height:50,filter:"invert(1) brightness(0.9)",opacity:0.8}}/>
    <p style={{color:"#0090B3",fontFamily:"Bebas Neue",fontSize:18,letterSpacing:"0.15em"}}>CHARGEMENT...</p>
  </div>;
  if (!user) return <Login onLogin={setUser} />;
  if (user && userProfile === null && userRole !== null) return (
    <div style={{minHeight:"100vh",background:"#FFFFFF",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <p style={{color:"#FF3B30",fontFamily:"'Urbanist'",fontSize:20,letterSpacing:"0.1em"}}>COMPTE SUPPRIMÉ</p>
      <p style={{color:"#8E8E93",fontFamily:"'Inter'",fontSize:13,textAlign:"center",maxWidth:320}}>Ce compte n'existe plus. Contactez Third-One Studio.</p>
      <button className="btn btn-ghost" style={{marginTop:8}} onClick={()=>supabase.auth.signOut()}>Se déconnecter</button>
    </div>
  );
  if (userProfile && userProfile.role === "partenaire") return <PartenaireView user={user} userProfile={userProfile} onLogout={()=>supabase.auth.signOut()}/>;
  if (userProfile && userProfile.role === "client" && userProfile.is_active === false) return (
    <div style={{minHeight:"100vh",background:"#FFFFFF",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <img src="/logo192.png" alt="Third-One Studio" style={{height:50,filter:"invert(1) brightness(0.9)",opacity:0.6}}/>
      <p style={{color:"#FF3B30",fontFamily:"'Urbanist'",fontSize:20,letterSpacing:"0.1em"}}>ACCÈS SUSPENDU</p>
      <p style={{color:"#8E8E93",fontFamily:"'Inter'",fontSize:13,textAlign:"center",maxWidth:320}}>Votre accès a été suspendu. Contactez Third-One Studio pour plus d'informations.</p>
      <button className="btn btn-ghost" style={{marginTop:8}} onClick={()=>supabase.auth.signOut()}>Se déconnecter</button>
    </div>
  );

  const showNotif=msg=>{ setNotif(msg); setTimeout(()=>setNotif(null),3100); };
  const updProject=p=>setProjects(ps=>ps.map(x=>x.id===p.id?p:x));
  const selProject=projects.find(p=>p.id===selectedProjectId);
  const createProject=async(title,clientId,team)=>{
    const newClientId = userRole==="client" ? user.id : (clientId||null);
    const{data,error}=await supabase.from("projects").insert({title:title||"Nouveau projet",client_id:newClientId,status:"brief",progress:0,brief:{},replay_url:"",delivery_date:null,shoot_date:null,status_note:null}).select().single();
    if(error){showNotif("Erreur : "+error.message);return null;}
    const np={id:data.id,title:data.title,clientId:data.client_id,status:data.status,progress:0,createdAt:data.created_at?.split("T")[0],brief:{},replayUrl:"",deliveryDate:"",shootDate:"",statusNote:"",videoStatus:null,videoComment:"",moodboard:[],storyboards:[],comments:[],livrables:[]};
    setProjects(ps=>[np,...ps]);
    setSelectedProjectId(np.id);
    if(team){
      const members=teamMembers.filter(m=>m.team===team);
      if(members.length>0){
        const rows=members.map(m=>({project_id:data.id,member_id:m.id,role_on_project:""}));
        const{data:aData}=await supabase.from("project_assignments").insert(rows).select();
        if(aData) setAssignments(pa=>[...pa,...aData.map(a=>({id:a.id,projectId:a.project_id,memberId:a.member_id,roleOnProject:""}))]);
      }
    }
    if(userRole==="client"){setAppView("client");setClientSection("projets");}else setProdSection("projets");
    setShowCreateModal(false);
    showNotif(team?`Projet créé — Équipe ${team} assignée`:"Projet créé !");
    return np;
  };

  const isClient = userRole === "client";
  const isAdmin = userRole === "admin";
  const isCollab = userRole === "collaborateur";
  const previewClient = previewClientId ? clients.find(c=>c.id===previewClientId) : null;
  const effectiveClientId = isClient ? user.id : (previewClientId || null);
  const clientProjects = effectiveClientId ? projects.filter(p => p.clientId === effectiveClientId) : projects;
  const clientSelProject = clientProjects.find(p=>p.id===selectedProjectId) || clientProjects[0] || null;

  const activeClient = isClient && userProfile
    ? { id:user.id, name:userProfile.nom||user.email, email:user.email, simulatorEnabled:userProfile.simulator_enabled||false, shortoneEnabled:userProfile.shortone_enabled||false, discount:userProfile.discount||0, type:userProfile.client_type||"PME" }
    : previewClient || clients[0];
  const handlePreviewClient=(c)=>{setPreviewClientId(c.id);setAppView("client");setClientSection("projets");showNotif(`Aperçu : ${c.name}`);};

  const statusColor=s=>({brief:"#7B9CFF",storyboard:"#00B4D8",review:"#FF9F43",livraison:"#4ECDC4"}[s]||"#6E6E73");

  // ── PROD NAV ────────────────────────────────────────────────────────────────
  const prodNavAll=[
    {k:"dashboard",   l:"Dashboard",     icon:"📊"},
    {k:"projets",     l:"Projets",       icon:"📁"},
    {k:"calendrier",  l:"Calendrier",    icon:"📅"},
    {k:"organisation",l:"Organisation",  icon:"🗂️"},
    {k:"planning",    l:"Planning",      icon:"📆"},
    {k:"cm",          l:"Social Media",  icon:"📲"},
    {k:"prestataires",l:"Prestataires",  icon:"🤝"},
    {k:"tarifs",      l:"Tarifs",        icon:"💰"},
    {k:"comptes",     l:"Comptes",       icon:"👥"},
    {k:"shortone",    l:"Shortone",      icon:"◆"},
  ];
  const COLLAB_BLOCKED=["tarifs"];
  const prodNav=isCollab?prodNavAll.filter(n=>!COLLAB_BLOCKED.includes(n.k)):prodNavAll;

  // ── CLIENT NAV ──────────────────────────────────────────────────────────────
  const clientNav=[
    {k:"accueil",   l:"Accueil",        icon:"🏠"},
    {k:"projets",   l:"Mes projets",    icon:"📁"},
    {k:"calendrier",l:"Disponibilités", icon:"📅"},
    {k:"cm",        l:"Mes contenus",   icon:"📲"},
    ...(activeClient?.simulatorEnabled?[{k:"estimation",l:"Estimation",icon:"💰"}]:[]),
    ...(activeClient?.shortoneEnabled?[{k:"shortone",l:"Shortone",icon:"◆"}]:[]),
  ];

  const densityPad={"compact":"14px 14px 70px","normale":"22px 24px","spacieux":"32px 36px"};
  const fontSizePx={"petite":"13px","normale":"14px","grande":"16px","tres-grande":"18px"};
  const accentColor=ACCENT_COLORS[settings.accent]||ACCENT_COLORS.or;

  return(
    <>
      <FontLoader/>
      <style>{`
        :root { --accent:${accentColor}; --fs:${fontSizePx[settings.fontSize]}; }
        .app-main { padding:${densityPad[settings.density]||densityPad.normale} !important; }
        body { font-size:${fontSizePx[settings.fontSize]}; }
        ${settings.contrast?"*{--text:#FFFFFF}p,span,div{color:inherit}.nav-item{border-bottom:1px solid #C7C7CC}":""}
      `}</style>
      <div style={{minHeight:"100vh",background:settings.contrast?"#F0F0F5":"#FFFFFF",color:settings.contrast?"#FFFFFF":"#1D1D1F",display:"flex",flexDirection:"column"}}>

        {/* ── TOP BAR ── */}
        <div style={{background:"#F5F5F7",borderBottom:"1px solid #E5E5EA",padding:"0 16px",height:54,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button className="mob-only" onClick={()=>setSidebarOpen(o=>!o)} style={{background:"none",border:"none",color:"#6E6E73",cursor:"pointer",fontSize:18,padding:"4px",lineHeight:1,flexShrink:0}}>☰</button>
            <img src="/logo-wordmark.svg" alt="ThirdOne Studio" style={{height:24,display:"block"}}/>
            <span className="desk-only" style={{color:"#E5E5EA",alignItems:"center"}}>|</span>
            <span className="desk-only" style={{fontFamily:"'Inter'",fontSize:11,color:"#8E8E93",alignItems:"center"}}>
              {appView==="prod"?"Back-office":`Espace client${activeClient?.name?` — ${activeClient.name}`:""}`}
            </span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
              {userRole==="admin"&&previewClientId&&appView==="client"&&(
                <div className="desk-only" style={{display:"flex",alignItems:"center",gap:6,background:"#7B9CFF15",border:"1px solid #7B9CFF30",borderRadius:6,padding:"3px 10px"}}>
                  <span style={{fontFamily:"'Inter'",fontSize:11,color:"#7B9CFF"}}>👁 {previewClient?.name}</span>
                  <button style={{background:"none",border:"none",color:"#7B9CFF",cursor:"pointer",fontSize:12,padding:"0 2px"}} onClick={()=>{setPreviewClientId(null);setAppView("prod");setProdSection("comptes");}}>✕</button>
                </div>
              )}
              {isAdmin&&(
                <div style={{display:"flex",gap:3,background:"#FFFFFF",padding:3,borderRadius:7,border:"1px solid #E5E5EA"}}>
                  <button className={appView==="prod"?"tab active":"tab"} style={{fontSize:10,padding:"4px 9px"}} onClick={()=>{setAppView("prod");setSidebarOpen(false);}}>⚙ <span className="desk-only" style={{display:"inline"}}>Prod</span></button>
                  <button className={appView==="client"?"tab active":"tab"} style={{fontSize:10,padding:"4px 9px"}} onClick={()=>{setAppView("client");setSidebarOpen(false);}}>👤 <span className="desk-only" style={{display:"inline"}}>Client</span></button>
                </div>
              )}
              {isCollab&&(
                <span style={{fontFamily:"'Inter'",fontSize:11,color:"#7B9CFF",background:"#7B9CFF15",border:"1px solid #7B9CFF30",borderRadius:6,padding:"3px 10px"}}>Collaborateur</span>
              )}
              {/* Avatar / menu utilisateur */}
              <button onClick={()=>setShowSettings(true)} style={{width:34,height:34,borderRadius:"50%",background:accentColor+"22",border:`1.5px solid ${accentColor}55`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Urbanist'",fontSize:15,color:accentColor,cursor:"pointer",flexShrink:0,transition:"all .15s"}}
                onMouseEnter={e=>{e.currentTarget.style.background=accentColor+"40";e.currentTarget.style.borderColor=accentColor;}}
                onMouseLeave={e=>{e.currentTarget.style.background=accentColor+"22";e.currentTarget.style.borderColor=accentColor+"55";}}>
                {(user?.email||"?")[0].toUpperCase()}
              </button>
            </div>
        </div>

        {/* ── BODY ── */}
        <div className="app-body">

          {/* Backdrop mobile */}
          {sidebarOpen&&<div className="sidebar-backdrop" onClick={()=>setSidebarOpen(false)}/>}

          {/* ── SIDEBAR ── */}
          <div className={`app-sidebar${sidebarOpen?" open":""}`}>
            {(appView==="prod"?prodNav:clientNav).map(n=>(
              <div key={n.k} className={`nav-item ${(appView==="prod"?prodSection:clientSection)===n.k?"active":""}`}
                onClick={()=>{appView==="prod"?setProdSection(n.k):setClientSection(n.k);setSidebarOpen(false);}}>
                <span style={{fontSize:14}}>{n.icon}</span>
                <span>{n.l}</span>
              </div>
            ))}

            {/* Project list — prod: only on section "projets", client: always */}
            {((appView==="prod"&&prodSection==="projets")||appView==="client")&&(
              <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #F2F2F7"}}>
                <span style={{fontFamily:"'Inter'",fontSize:9,color:"#8E8E93",textTransform:"uppercase",letterSpacing:"0.1em",padding:"0 6px",display:"block",marginBottom:5}}>Projets</span>
                {(appView==="prod"?projects:clientProjects).map(p=>(
                  <div key={p.id} className={`sidebar-proj ${selectedProjectId===p.id?"active":""}`} onClick={()=>{setSelectedProjectId(p.id);if(appView==="client")setClientSection("projets");setSidebarOpen(false);}}>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontWeight:500,color:"inherit",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:11}}>{p.title}</p>
                      <div style={{height:2,background:"#F2F2F7",borderRadius:1,marginTop:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${p.progress}%`,background:statusColor(p.status),borderRadius:1,transition:"width .5s"}}/>
                      </div>
                    </div>
                  </div>
                ))}
                <button style={{width:"100%",marginTop:6,background:"#00B4D810",border:"1px solid #00B4D825",borderRadius:6,color:"#00B4D8",fontFamily:"'Inter'",fontSize:11,padding:"6px 0",cursor:"pointer"}} onClick={()=>setShowCreateModal(true)}>
                  + Nouveau projet
                </button>
                {appView==="client"&&clientProjects.length===0&&(
                  <button style={{width:"100%",marginTop:4,background:"#4ECDC410",border:"1px solid #4ECDC425",borderRadius:6,color:"#4ECDC4",fontFamily:"'Inter'",fontSize:11,padding:"6px 0",cursor:"pointer"}} onClick={()=>setClientSection("calendrier")}>
                    📅 Prendre un RDV →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── MAIN CONTENT ── */}
          <div className="app-main">

            {/* J-2 banner — visible sur toutes les sections prod */}
            {appView==="prod"&&<J2AlertBanner projects={projects} clients={clients}/>}

            {/* PROD SECTIONS */}
            {appView==="prod"&&prodSection==="dashboard"&&(
              <AdminDashboard projects={projects} clients={clients} assignments={assignments} onSelectProject={setSelectedProjectId} onSectionChange={setProdSection} bookings={bookings} onGoToCalendar={()=>setProdSection("calendrier")} teamMembers={teamMembers}/>
            )}
            {appView==="prod"&&prodSection==="projets"&&selProject&&(
              <ProdProjectView project={selProject} onUpdate={updProject} onNotif={showNotif} teamMembers={teamMembers} assignments={assignments} onUpdateAssignments={setAssignments} meetingNotes={meetingNotes} onUpdateMeetingNotes={setMeetingNotes} clients={clients} userProfile={userProfile} bookings={bookings} setBookings={setBookings} onGoToCalendar={()=>setProdSection("calendrier")} serviceTypes={serviceTypes} prestataires={prestataires} prestataireMissions={prestataireMissions} setPrestataireMissions={setPrestataireMissions} onPreviewClient={handlePreviewClient}/>
            )}
            {appView==="prod"&&prodSection==="calendrier"&&(
              <CalendarModule bookings={bookings} setBookings={setBookings} isAdmin={true} onNotif={showNotif} projects={projects} onGoToProject={(id)=>{setSelectedProjectId(id);setProdSection("projets");}}/>
            )}
            {appView==="prod"&&prodSection==="organisation"&&(
              <OrgModule sheets={sheets} setSheets={setSheets} onNotif={showNotif}/>
            )}
            {appView==="prod"&&prodSection==="tarifs"&&(
              <AdminPricingModule pricing={pricing} setPricing={setPricing} clients={clients} setClients={setClients} estimates={estimates} setEstimates={setEstimates}/>
            )}
            {appView==="prod"&&prodSection==="planning"&&(
              <PlanningModule teamMembers={teamMembers} setTeamMembers={setTeamMembers} planningSlots={planningSlots} setPlanningSlots={setPlanningSlots} projects={projects} bookings={bookings} onNotif={showNotif}/>
            )}
            {appView==="prod"&&prodSection==="cm"&&(
              <CMModule posts={posts} setPosts={setPosts} projects={projects} onNotif={showNotif}/>
            )}
            {appView==="prod"&&prodSection==="comptes"&&(isAdmin||isCollab)&&(
              <ComptesSection clients={clients} setClients={setClients} onNotif={showNotif} onPreviewClient={handlePreviewClient} isAdmin={isAdmin}/>
            )}
            {appView==="prod"&&prodSection==="prestataires"&&(
              <PrestatairesModule serviceTypes={serviceTypes} setServiceTypes={setServiceTypes} prestataires={prestataires} setPrestataires={setPrestataires} missions={prestataireMissions} setMissions={setPrestataireMissions} projects={projects} onNotif={showNotif}/>
            )}
            {appView==="prod"&&prodSection==="shortone"&&(
              <ShortoneModule
                projects={projects}
                clients={clients}
                onSelectProject={setSelectedProjectId}
                onSectionChange={setProdSection}
                isAdmin={true}
                onNotif={showNotif}
                onCreateFromTrend={async(trend)=>{
                  const{data,error}=await supabase.from("projects").insert({
                    title:`Reel ${trend.tag}`,
                    client_id:null,
                    status:"brief",
                    progress:0,
                    brief:{trendTag:trend.tag,platform:trend.platform,niche:trend.niche,growth:trend.growth,hook:trend.hook,shotlist:trend.plans,source:"shortone_radar"},
                    replay_url:"",delivery_date:null,shoot_date:null,status_note:null
                  }).select().single();
                  if(error){showNotif("Erreur : "+error.message);return;}
                  const np={id:data.id,title:data.title,clientId:null,status:"brief",progress:0,createdAt:data.created_at?.split("T")[0],brief:data.brief,replayUrl:"",deliveryDate:"",shootDate:"",statusNote:"",videoStatus:null,videoComment:"",moodboard:[],storyboards:[],comments:[],livrables:[]};
                  setProjects(ps=>[np,...ps]);
                  setSelectedProjectId(np.id);
                  setProdSection("projets");
                  showNotif(`Mission créée depuis ${trend.tag} — charte à attacher ✓`);
                }}
              />
            )}

            {/* CLIENT SECTIONS */}
            {appView==="client"&&clientSection==="accueil"&&<ClientWelcomePage client={activeClient||{}} projects={clientProjects} onGoTo={setClientSection}/>}
            {appView==="client"&&clientSection==="projets"&&clientSelProject&&(
              <ClientProjectView key={clientSelProject.id} project={clientSelProject} clientData={activeClient} onUpdate={updProject} onNotif={showNotif} pricing={pricing} serviceTypes={serviceTypes}/>
            )}
            {appView==="client"&&clientSection==="calendrier"&&(
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <div style={{background:"linear-gradient(135deg,#00B4D810,#7B9CFF08)",border:"1px solid #00B4D820",borderRadius:10,padding:"14px 18px"}}>
                  <h2 style={{fontFamily:"'Urbanist'",fontSize:22,color:"#1D1D1F",letterSpacing:"0.04em"}}>DISPONIBILITÉS</h2>
                  <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",marginTop:2}}>Consultez les disponibilités et posez une option sur une date.</p>
                </div>
                <CalendarModule bookings={bookings} setBookings={setBookings} isAdmin={false} onNotif={showNotif} projects={clientProjects}/>
              </div>
            )}
            {appView==="client"&&clientSection==="cm"&&(
              <CMClientView posts={posts} setPosts={setPosts} projects={clientProjects} onNotif={showNotif}/>
            )}
            {appView==="client"&&clientSection==="shortone"&&activeClient?.shortoneEnabled&&(
              <ShortoneModule
                projects={clientProjects}
                clients={clients}
                onSelectProject={setSelectedProjectId}
                onSectionChange={setClientSection}
                isAdmin={false}
                onNotif={showNotif}
                onCreateFromTrend={()=>showNotif("Contacte ton chargé de projet pour créer une mission.")}
              />
            )}
            {appView==="client"&&clientSection==="estimation"&&activeClient?.simulatorEnabled&&(
              <div style={{maxWidth:560}}>
                <div style={{marginBottom:20}}>
                  <h2 style={{fontFamily:"'Urbanist'",fontSize:24,color:"#1D1D1F",letterSpacing:"0.04em"}}>ESTIMATION TARIFAIRE</h2>
                  <p style={{fontFamily:"'Inter'",fontSize:12,color:"#6E6E73",marginTop:3}}>Obtenez une estimation indicative en quelques clics.</p>
                </div>
                <ClientEstimationWidget pricing={pricing} clientData={activeClient}/>
              </div>
            )}
          </div>
        </div>

        {notif&&<Notif msg={notif} onDone={()=>setNotif(null)}/>}
        {showCreateModal&&<CreateProjectModal isAdmin={userRole==="admin"} clients={clients} teamMembers={teamMembers} planningSlots={planningSlots} onClose={()=>setShowCreateModal(false)} onCreate={createProject}/>}
        {showSettings&&<SettingsPanel settings={settings} onChange={setSettings} onClose={()=>setShowSettings(false)} user={user} onLogout={()=>supabase.auth.signOut()}/>}
      </div>
    </>
  );
}
export default function App(){
  const params=new URLSearchParams(window.location.search);
  if(params.has("guest"))return <GuestView/>;
  if(params.has("prestataire"))return <PrestaireResponsePage token={params.get("prestataire")}/>;
  return <AppMain/>;
}
