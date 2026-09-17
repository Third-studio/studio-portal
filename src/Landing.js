import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// LANDING — vitrine Third One Studio (sombre cinéma)
// Fond : extraits de films en fondu croisé · apparitions au chargement et au scroll
// Une idée par écran, colonne de lecture réservée, la vidéo vit dans le vide.
// ─────────────────────────────────────────────────────────────────────────────

const CLIPS = [
  { src: "/videos/bg-01.mp4", poster: "/videos/bg-01.jpg", label: "SARA · Film institutionnel" },
  { src: "/videos/bg-02.mp4", poster: "/videos/bg-02.jpg", label: "Tour des Yoles · Martinique" },
  { src: "/videos/bg-03.mp4", poster: "/videos/bg-03.jpg", label: "EDF · Agir Plus" },
  { src: "/videos/bg-04.mp4", poster: "/videos/bg-04.jpg", label: "SARA · Exercice sécurité" },
  { src: "/videos/bg-05.mp4", poster: "/videos/bg-05.jpg", label: "SARA · Trait d'union" },
  { src: "/videos/bg-06.mp4", poster: "/videos/bg-06.jpg", label: "McDonald's · Portes ouvertes" },
  { src: "/videos/bg-07.mp4", poster: "/videos/bg-07.jpg", label: "SARA · Pipeline Rivière Salée" },
  { src: "/videos/bg-08.mp4", poster: "/videos/bg-08.jpg", label: "SARA · Trait d'union" },
];
const CLIP_SECONDS = 9;
const FADE_MS = 1500;

const SERVICES = [
  { n: "01", t: "Film de marque", d: "Un film court qui dit qui vous êtes, avec une écriture, une lumière et un rythme pensés pour votre public." },
  { n: "02", t: "Reportage & documentaire", d: "Sur le terrain, au plus près des équipes : portraits, web-séries, films institutionnels qui restent." },
  { n: "03", t: "Social & motion design", d: "Reels, formats courts et animations 2D pour exister chaque semaine sur vos réseaux." },
  { n: "04", t: "Événementiel & captation", d: "Multi-caméras, drone, aftermovie livré vite pour prolonger l'événement." },
];
const CLIENTS = ["SARA", "EDF", "McDonald's", "RED by SFR", "ARCOS", "Air Caraïbes", "Martinique Développement", "Sparkle", "TEF"];
const STEPS = [
  { t: "Brief", d: "On écoute, on cadre l'intention, on propose une direction et un devis clair." },
  { t: "Pré-production", d: "Storyboard, repérages, planning partagé. Vous validez avant de tourner." },
  { t: "Tournage", d: "Une équipe légère et précise, réalisation et cadrage en main." },
  { t: "Post-production", d: "Montage, étalonnage, mixage, versions par réseau. Suivi en ligne dans votre espace." },
];

const S = `
  .ld{ --bg:#05080F; --ink:#F5F7FA; --mut:rgba(245,247,250,.64); --dim:rgba(245,247,250,.42); --cy:#3DD0ED; --cy2:#00B4D8; --line:rgba(255,255,255,.12);
       position:relative; min-height:100vh; background:var(--bg); color:var(--ink); font-family:'Inter',sans-serif; -webkit-font-smoothing:antialiased; overflow-x:clip; }
  .ld *{ box-sizing:border-box; }
  .ld a{ color:inherit; }

  /* ── fond vidéo ─────────────────────────────────────────────────────────── */
  .ld-bg{ position:fixed; inset:0; z-index:0; overflow:hidden; background:#000; }
  .ld-bg video,.ld-bg img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:0; transition:opacity ${FADE_MS}ms ease, transform 12s linear; transform:scale(1.04); will-change:opacity; }
  .ld-bg video.on,.ld-bg img.on{ opacity:1; transform:scale(1.1); }
  .ld-veil{ position:fixed; inset:0; z-index:1; pointer-events:none;
    background:
      linear-gradient(90deg, rgba(5,8,15,.86) 0%, rgba(5,8,15,.62) 38%, rgba(5,8,15,.22) 68%, rgba(5,8,15,.38) 100%),
      linear-gradient(180deg, rgba(5,8,15,.55) 0%, rgba(5,8,15,0) 30%, rgba(5,8,15,0) 60%, rgba(5,8,15,.75) 100%); }
  .ld-grain{ position:fixed; inset:0; z-index:2; pointer-events:none; opacity:.07; mix-blend-mode:overlay;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"); }
  .ld-vig{ position:fixed; inset:0; z-index:1; pointer-events:none; background:radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(0,0,0,.55) 100%); }

  /* ── nav ────────────────────────────────────────────────────────────────── */
  .ld-nav{ position:fixed; top:0; left:0; right:0; z-index:20; display:flex; align-items:center; justify-content:space-between; gap:20px;
    padding:18px clamp(20px,4vw,56px); transition:background .35s, backdrop-filter .35s, border-color .35s; border-bottom:1px solid transparent;
    animation:ldFade 1s .2s both; }
  .ld-nav.solid{ background:rgba(5,8,15,.55); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); border-color:var(--line); }
  .ld-wm{ font-family:'Urbanist',sans-serif; font-weight:800; font-size:22px; letter-spacing:-.03em; display:inline-flex; align-items:center; gap:10px; text-decoration:none; }
  .ld-wm i{ width:30px; height:30px; border-radius:8px; background:linear-gradient(135deg,#3DD0ED,#0096BC); display:inline-flex; align-items:center; justify-content:center; font-style:normal; font-size:12px; color:#fff; box-shadow:0 6px 18px rgba(0,180,216,.35), inset 0 1px 0 rgba(255,255,255,.35); }
  .ld-wm span{ color:var(--cy); }
  .ld-links{ display:flex; gap:28px; font-size:13px; font-weight:500; color:var(--mut); }
  .ld-links a{ text-decoration:none; transition:color .2s; } .ld-links a:hover{ color:var(--ink); }
  .ld-btn{ display:inline-flex; align-items:center; gap:10px; height:44px; padding:0 20px; border-radius:999px; font-family:'Inter',sans-serif; font-size:14px; font-weight:600; text-decoration:none; cursor:pointer; border:1px solid transparent; transition:transform .25s cubic-bezier(.16,1,.3,1), background .25s, border-color .25s, color .25s; }
  .ld-btn:hover{ transform:translateY(-2px); }
  .ld-btn.ghost{ border-color:rgba(255,255,255,.22); color:var(--ink); background:rgba(255,255,255,.04); backdrop-filter:blur(8px); }
  .ld-btn.ghost:hover{ border-color:rgba(255,255,255,.5); background:rgba(255,255,255,.09); }
  .ld-btn.cyan{ background:var(--cy); color:#04121A; } .ld-btn.cyan:hover{ background:#6DDDF3; }
  .ld-btn.sm{ height:38px; padding:0 16px; font-size:13px; }
  .ld-btn svg{ transition:transform .25s; } .ld-btn:hover svg{ transform:translateX(3px); }

  /* ── structure ──────────────────────────────────────────────────────────── */
  .ld-main{ position:relative; z-index:5; }
  .ld-sec{ position:relative; min-height:100vh; min-height:100dvh; display:flex; align-items:center; padding:clamp(96px,14vh,160px) clamp(20px,6vw,96px); }
  .ld-col{ width:100%; max-width:600px; }
  .ld-sec.right{ justify-content:flex-end; }
  .ld-sec.right .ld-col{ text-align:left; }
  .ld-eyebrow{ display:inline-flex; align-items:center; gap:12px; font-size:11.5px; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:var(--cy); }
  .ld-eyebrow::before{ content:''; width:26px; height:1px; background:var(--cy); opacity:.8; }
  .ld-h1{ font-family:'Urbanist',sans-serif; font-weight:800; font-size:clamp(40px,6.2vw,84px); line-height:.98; letter-spacing:-.035em; margin:22px 0 24px; }
  .ld-h1 em,.ld-h2 em{ font-style:normal; color:var(--cy); }
  .ld-h1 .w{ display:inline-block; }
  .ld-h2{ font-family:'Urbanist',sans-serif; font-weight:800; font-size:clamp(30px,4.2vw,56px); line-height:1.02; letter-spacing:-.03em; margin:18px 0 20px; }
  .ld-lead{ font-size:clamp(15px,1.25vw,18px); line-height:1.7; color:var(--mut); max-width:46ch; font-weight:300; }
  .ld-lead b{ color:var(--ink); font-weight:500; }
  .ld-cta{ display:flex; gap:12px; flex-wrap:wrap; margin-top:36px; }

  /* ── apparitions ────────────────────────────────────────────────────────── */
  @keyframes ldUp{ from{opacity:0; transform:translateY(26px)} to{opacity:1; transform:none} }
  @keyframes ldFade{ from{opacity:0} to{opacity:1} }
  @keyframes ldWord{ from{opacity:0; transform:translateY(110%) rotate(2deg)} to{opacity:1; transform:none} }
  .ld-hero .a{ animation:ldUp .9s cubic-bezier(.16,1,.3,1) both; }
  .ld-hero .a1{ animation-delay:.35s } .ld-hero .a2{ animation-delay:.55s } .ld-hero .a3{ animation-delay:1.15s } .ld-hero .a4{ animation-delay:1.35s }
  .ld-h1 .m{ display:inline-block; overflow:hidden; vertical-align:bottom; padding-bottom:.06em; margin-bottom:-.06em; margin-right:.24em; }
  .ld-h1 .w{ animation:ldWord 1s cubic-bezier(.16,1,.3,1) both; }
  .ld-rv{ opacity:0; transform:translateY(28px); transition:opacity .9s cubic-bezier(.16,1,.3,1), transform .9s cubic-bezier(.16,1,.3,1); transition-delay:var(--d,0ms); }
  .ld-rv.in{ opacity:1; transform:none; }

  /* ── hero extras ────────────────────────────────────────────────────────── */
  .ld-hero{ padding-top:clamp(120px,18vh,200px); }
  .ld-hero-foot{ position:absolute; left:clamp(20px,6vw,96px); right:clamp(20px,6vw,96px); bottom:clamp(22px,4vh,40px); display:flex; align-items:flex-end; justify-content:space-between; gap:24px; animation:ldFade 1.2s 1.6s both; }
  .ld-scroll{ display:flex; align-items:center; gap:12px; font-size:11.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--dim); }
  .ld-scroll i{ width:1px; height:44px; background:linear-gradient(180deg,var(--cy),transparent); position:relative; overflow:hidden; display:block; }
  .ld-scroll i::after{ content:''; position:absolute; left:0; top:-100%; width:100%; height:100%; background:linear-gradient(180deg,transparent,#fff); animation:ldDrop 2.2s ease-in-out infinite; }
  @keyframes ldDrop{ to{ top:100% } }
  .ld-now{ display:grid; gap:8px; justify-items:end; text-align:right; }
  .ld-now .lbl{ font-size:12px; color:var(--mut); display:flex; gap:10px; align-items:center; font-variant-numeric:tabular-nums; }
  .ld-now .lbl b{ color:var(--ink); font-weight:500; animation:ldFade .8s both; }
  .ld-now .bar{ width:160px; height:2px; background:rgba(255,255,255,.14); border-radius:2px; overflow:hidden; }
  .ld-now .bar i{ display:block; height:100%; background:var(--cy); transform-origin:left; animation:ldProg ${CLIP_SECONDS}s linear both; }
  @keyframes ldProg{ from{transform:scaleX(0)} to{transform:scaleX(1)} }

  /* ── services ───────────────────────────────────────────────────────────── */
  .ld-grid{ display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:34px; }
  .ld-card{ padding:22px 22px 24px; border-radius:18px; background:rgba(255,255,255,.045); border:1px solid var(--line); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); transition:background .3s, border-color .3s, transform .4s cubic-bezier(.16,1,.3,1); }
  .ld-card:hover{ background:rgba(255,255,255,.08); border-color:rgba(61,208,237,.45); transform:translateY(-4px); }
  .ld-card .n{ font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--cy); }
  .ld-card h3{ font-family:'Urbanist',sans-serif; font-weight:800; font-size:20px; letter-spacing:-.02em; margin:12px 0 8px; }
  .ld-card p{ margin:0; font-size:13.5px; line-height:1.6; color:var(--mut); font-weight:300; }

  /* ── clients ────────────────────────────────────────────────────────────── */
  .ld-band{ position:relative; z-index:5; padding:28px 0; border-top:1px solid var(--line); border-bottom:1px solid var(--line); background:rgba(5,8,15,.35); backdrop-filter:blur(10px); overflow:hidden;
    -webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent); mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent); }
  .ld-track{ display:flex; gap:64px; width:max-content; animation:ldMarq 38s linear infinite; }
  .ld-track span{ font-family:'Urbanist',sans-serif; font-weight:800; font-size:clamp(20px,2.4vw,30px); letter-spacing:-.02em; color:rgba(245,247,250,.55); white-space:nowrap; display:inline-flex; align-items:center; gap:64px; }
  .ld-track span::after{ content:''; width:6px; height:6px; border-radius:50%; background:var(--cy); opacity:.7; }
  @keyframes ldMarq{ to{ transform:translateX(-50%) } }

  /* ── process ────────────────────────────────────────────────────────────── */
  .ld-steps{ list-style:none; margin:34px 0 0; padding:0; display:grid; gap:0; }
  .ld-steps li{ display:grid; grid-template-columns:52px 1fr; gap:18px; padding:20px 0; border-top:1px solid var(--line); }
  .ld-steps li:last-child{ border-bottom:1px solid var(--line); }
  .ld-steps .k{ font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--cy); padding-top:5px; }
  .ld-steps h3{ margin:0 0 6px; font-family:'Urbanist',sans-serif; font-weight:800; font-size:19px; letter-spacing:-.02em; }
  .ld-steps p{ margin:0; font-size:13.5px; line-height:1.6; color:var(--mut); font-weight:300; }

  /* ── contact ────────────────────────────────────────────────────────────── */
  .ld-contact .ld-h2{ font-size:clamp(38px,6vw,84px); }
  .ld-mail{ display:inline-block; margin-top:8px; font-family:'Urbanist',sans-serif; font-weight:700; font-size:clamp(18px,2.4vw,28px); letter-spacing:-.02em; text-decoration:none; border-bottom:1px solid rgba(61,208,237,.5); padding-bottom:4px; transition:border-color .25s, color .25s; }
  .ld-mail:hover{ color:var(--cy); border-color:var(--cy); }
  .ld-meta{ display:flex; gap:26px; flex-wrap:wrap; margin-top:30px; font-size:13px; color:var(--mut); }
  .ld-meta a{ text-decoration:none; } .ld-meta a:hover{ color:var(--ink); }

  .ld-foot{ position:relative; z-index:5; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; padding:26px clamp(20px,6vw,96px); border-top:1px solid var(--line); background:rgba(5,8,15,.7); backdrop-filter:blur(12px); font-size:12px; color:var(--dim); }
  .ld-foot a{ text-decoration:none; color:var(--mut); } .ld-foot a:hover{ color:var(--ink); }

  @media (max-width:860px){
    .ld-links{ display:none; }
    .ld-grid{ grid-template-columns:1fr; }
    .ld-sec{ padding-left:20px; padding-right:20px; }
    .ld-veil{ background:linear-gradient(180deg, rgba(5,8,15,.7) 0%, rgba(5,8,15,.45) 40%, rgba(5,8,15,.55) 70%, rgba(5,8,15,.85) 100%); }
    .ld-hero-foot{ flex-direction:column; align-items:flex-start; }
    .ld-now{ justify-items:start; text-align:left; }
  }
  @media (prefers-reduced-motion:reduce){
    .ld *{ animation-duration:.01ms !important; animation-delay:0s !important; transition-duration:.01ms !important; }
    .ld-rv{ opacity:1; transform:none; }
  }
`;

const Arrow = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>);

function Wordmark(){ return <a className="ld-wm" href="/"><i>31</i>Third<span>One</span></a>; }

// Fond : deux calques vidéo, on charge le suivant en coulisse puis on fond.
function Background({ index, still }){
  const refs = [useRef(null), useRef(null)];
  const [front, setFront] = useState(0);
  const [srcs, setSrcs] = useState([CLIPS[0], CLIPS[1 % CLIPS.length]]);
  const prev = useRef(-1);

  useEffect(()=>{
    if(still) return;
    if(prev.current===index) return; // StrictMode rejoue l'effet : on ne transite qu'au vrai changement
    const isFirst = prev.current===-1;
    prev.current = index;
    if(isFirst){ refs[0].current?.play?.().catch(()=>{}); return; }
    const back = 1 - front;
    const el = refs[back].current;
    if(!el) return;
    // le calque arrière contient déjà le clip `index` (préchargé) : on le lance puis on le passe devant
    try{ el.currentTime = 0; }catch{ /* pas encore prêt */ }
    el.play?.().catch(()=>{});
    setFront(back);
    // après le fondu, l'ancien calque précharge le clip suivant
    const t = setTimeout(()=>{
      setSrcs(s=>{ const n=[...s]; n[front]=CLIPS[(index+1)%CLIPS.length]; return n; });
    }, FADE_MS + 100);
    return ()=>clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[index]);

  if(still){
    return <div className="ld-bg" aria-hidden="true"><img className="on" src={CLIPS[index].poster} alt=""/></div>;
  }
  return (
    <div className="ld-bg" aria-hidden="true">
      {[0,1].map(i=>(
        <video key={i} ref={refs[i]} className={front===i?"on":""} src={srcs[i].src} poster={srcs[i].poster}
          muted playsInline preload="auto" loop={false} autoPlay={i===0} disablePictureInPicture />
      ))}
    </div>
  );
}

export default function Landing(){
  const [idx, setIdx] = useState(0);
  const [solid, setSolid] = useState(false);
  const still = typeof window!=="undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || navigator.connection?.saveData===true);

  // rotation des clips
  useEffect(()=>{
    if(still) return;
    const t = setTimeout(()=>setIdx(i=>(i+1)%CLIPS.length), CLIP_SECONDS*1000);
    return ()=>clearTimeout(t);
  },[idx, still]);

  // nav qui se solidifie + apparitions au scroll
  useEffect(()=>{
    const onScroll = ()=>setSolid(window.scrollY>40);
    onScroll(); window.addEventListener("scroll", onScroll, { passive:true });
    const els = Array.from(document.querySelectorAll(".ld-rv"));
    let io;
    if("IntersectionObserver" in window){
      io = new IntersectionObserver(ents=>ents.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); } }), { threshold:.15, rootMargin:"0px 0px -6% 0px" });
      els.forEach(e=>io.observe(e));
    } else els.forEach(e=>e.classList.add("in"));
    return ()=>{ window.removeEventListener("scroll", onScroll); io?.disconnect(); };
  },[]);

  useEffect(()=>{ document.title = "Third One Studio — Production audiovisuelle en Martinique"; },[]);

  const clip = CLIPS[idx];
  const words = (txt, base) => txt.split(" ").map((w,i)=>(
    <span className="m" key={i}><span className="w" style={{animationDelay:`${base + i*0.07}s`}}>{w}</span></span>
  ));

  return (
    <div className="ld">
      <style>{S}</style>
      <Background index={idx} still={still}/>
      <div className="ld-veil"/><div className="ld-vig"/><div className="ld-grain"/>

      <nav className={`ld-nav${solid?" solid":""}`}>
        <Wordmark/>
        <div className="ld-links">
          <a href="#services">Services</a><a href="#realisations">Réalisations</a><a href="#process">Méthode</a><a href="#contact">Contact</a>
        </div>
        <a className="ld-btn ghost sm" href="/login">Espace client <Arrow/></a>
      </nav>

      <main className="ld-main">
        {/* ── HERO ── */}
        <section className="ld-sec ld-hero">
          <div className="ld-col">
            <div className="ld-eyebrow a a1">Production audiovisuelle · Martinique</div>
            <h1 className="ld-h1">
              {words("Des images qui", 0.5)}<br/>
              {words("racontent ce que", 0.75)}<br/>
              <em>{words("vous faites de mieux.", 1.0)}</em>
            </h1>
            <p className="ld-lead a a3">Third One Studio réalise des films de marque, des reportages et des contenus sociaux pour les entreprises et institutions des Antilles. <b>Réalisation, cadrage, montage</b> : une seule équipe, du brief à la livraison.</p>
            <div className="ld-cta a a4">
              <a className="ld-btn cyan" href="#realisations">Voir nos réalisations <Arrow/></a>
              <a className="ld-btn ghost" href="#contact">Parler d'un projet</a>
            </div>
          </div>
          <div className="ld-hero-foot">
            <div className="ld-scroll"><i/>Défiler</div>
            <div className="ld-now" aria-live="off">
              <div className="lbl"><span>{String(idx+1).padStart(2,"0")} / {String(CLIPS.length).padStart(2,"0")}</span><b key={idx}>{clip.label}</b></div>
              {!still && <div className="bar"><i key={idx}/></div>}
            </div>
          </div>
        </section>

        {/* ── SERVICES ── */}
        <section className="ld-sec" id="services">
          <div className="ld-col">
            <div className="ld-eyebrow ld-rv">Ce que nous faisons</div>
            <h2 className="ld-h2 ld-rv" style={{"--d":"80ms"}}>Quatre façons de <em>vous raconter</em>.</h2>
            <p className="ld-lead ld-rv" style={{"--d":"160ms"}}>Chaque format a son rythme. On choisit le bon avec vous, puis on le tient jusqu'au bout.</p>
            <div className="ld-grid">
              {SERVICES.map((s,i)=>(
                <div className="ld-card ld-rv" style={{"--d":`${240+i*110}ms`}} key={s.n}>
                  <div className="n">{s.n}</div><h3>{s.t}</h3><p>{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── RÉALISATIONS ── */}
        <section className="ld-sec right" id="realisations">
          <div className="ld-col">
            <div className="ld-eyebrow ld-rv">Réalisations</div>
            <h2 className="ld-h2 ld-rv" style={{"--d":"80ms"}}>Ce qui tourne <em>derrière vous</em>, ce sont nos films.</h2>
            <p className="ld-lead ld-rv" style={{"--d":"160ms"}}>Portraits, web-séries, campagnes, aftermovies. Des images tournées ici, pour des marques qui vivent ici. Le fond de cette page en montre quelques extraits, en continu.</p>
            <div className="ld-cta ld-rv" style={{"--d":"260ms"}}>
              <a className="ld-btn ghost" href="https://www.instagram.com/idriss_duleme" target="_blank" rel="noreferrer">Voir sur Instagram <Arrow/></a>
            </div>
          </div>
        </section>
        <div className="ld-band" aria-hidden="true">
          <div className="ld-track">{[...CLIENTS, ...CLIENTS].map((c,i)=><span key={i}>{c}</span>)}</div>
        </div>

        {/* ── MÉTHODE ── */}
        <section className="ld-sec" id="process">
          <div className="ld-col">
            <div className="ld-eyebrow ld-rv">Méthode</div>
            <h2 className="ld-h2 ld-rv" style={{"--d":"80ms"}}>Simple pour vous, <em>précis</em> pour nous.</h2>
            <p className="ld-lead ld-rv" style={{"--d":"160ms"}}>Chaque projet est suivi dans votre espace client : storyboard, planning, versions à valider, livrables. Vous savez toujours où on en est.</p>
            <ol className="ld-steps">
              {STEPS.map((s,i)=>(
                <li className="ld-rv" style={{"--d":`${220+i*100}ms`}} key={s.t}><div className="k">0{i+1}</div><div><h3>{s.t}</h3><p>{s.d}</p></div></li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── CONTACT ── */}
        <section className="ld-sec ld-contact" id="contact">
          <div className="ld-col">
            <div className="ld-eyebrow ld-rv">Contact</div>
            <h2 className="ld-h2 ld-rv" style={{"--d":"80ms"}}>Parlons de <em>votre</em> projet.</h2>
            <p className="ld-lead ld-rv" style={{"--d":"160ms"}}>Un brief en quelques lignes suffit. On revient vers vous avec une direction et un devis.</p>
            <div className="ld-rv" style={{"--d":"240ms"}}><a className="ld-mail" href="mailto:contact@thirdone.studio">contact@thirdone.studio</a></div>
            <div className="ld-meta ld-rv" style={{"--d":"320ms"}}>
              <a href="https://www.instagram.com/idriss_duleme" target="_blank" rel="noreferrer">Instagram · @idriss_duleme</a>
              <span>Le François · Martinique</span>
              <a href="/login">Espace client →</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="ld-foot">
        <span>© {new Date().getFullYear()} Third One Studio · Production audiovisuelle · Martinique</span>
        <span><a href="/login">Plateforme client</a></span>
      </footer>
    </div>
  );
}
