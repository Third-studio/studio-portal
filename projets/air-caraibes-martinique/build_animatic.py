#!/usr/bin/env python3
"""Assemble l'animatic 90s depuis stills/seq1..8.jpg : Ken Burns + fondus + labels + VO.
Usage: python3 build_animatic.py [sortie.mp4] — remplacer les jpg puis relancer."""
import subprocess, os, sys

SP = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(SP, "AirCaraibes-Animatic-KenBurns.mp4")
FPS = 25
W, H = 1280, 720
XF = 0.8  # crossfade seconds

SEQ = [
    (8,  "SEQ. 1 · OUVERTURE CIEL",        "« On me demande souvent ce qu'il y a au bout de la ligne… »"),
    (7,  "SEQ. 2 · MATCH CUT PORTE",        ""),
    (7,  "SEQ. 3 · MATCH CUT BAKOUA & MADRAS", ""),
    (13, "SEQ. 4 · MARCHE DE FORT-DE-FRANCE", "« Ici, tout commence par le goût. »"),
    (15, "SEQ. 5 · NATURE — PELEE, CARAVELLE, BALATA", ""),
    (15, "SEQ. 6 · MER — FONDS BLANCS, YOLE RONDE", ""),
    (13, "SEQ. 7 · LE SOIR — TI-PUNCH, TABLE PARTAGEE", "« Ce que j'aime dans mon métier, c'est ramener un peu de tout ça à bord. »"),
    (12, "SEQ. 8 · BOUCLE FINALE",          "« À bord, je vous emmène. Ici, je vous accueille. »"),
]
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
SERIF_I = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf"
TXTDIR = os.path.join(SP, "txt")
os.makedirs(TXTDIR, exist_ok=True)

def textfile(name, content):
    p = os.path.join(TXTDIR, name)
    with open(p, "w") as f:
        f.write(content)
    return p

inputs, filters = [], []
for i, (dur, label, vo) in enumerate(SEQ):
    img = os.path.join(SP, "stills", f"seq{i+1}.jpg")
    d = dur + XF
    frames = int(d * FPS)
    inputs += ["-loop", "1", "-t", f"{d + 0.5}", "-i", img]
    if i % 2 == 0:
        zp = f"zoompan=z='min(1+0.0009*on\\,1.25)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS}"
    else:
        zp = f"zoompan=z=1.12:x='(iw-iw/zoom)*on/{frames}':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS}"
    lf = textfile(f"label{i}.txt", label)
    txt = (f"drawtext=fontfile={SANS}:textfile={lf}:fontsize=17:fontcolor=white@0.85:"
           f"x=28:y=26:box=1:boxcolor=black@0.35:boxborderw=10")
    if vo:
        vf_ = textfile(f"vo{i}.txt", vo)
        txt += (f",drawtext=fontfile={SERIF_I}:textfile={vf_}:fontsize=26:fontcolor=white:"
                f"borderw=2:bordercolor=black@0.6:x=(w-text_w)/2:y=h-92")
    filters.append(f"[{i}:v]scale={W*2}:{H*2},{zp},{txt},setsar=1[v{i}]")

prev, offset = "v0", 0.0
for i, (dur, _, _) in enumerate(SEQ[:-1]):
    offset += dur
    nxt = f"x{i}" if i < len(SEQ) - 2 else "vx"
    filters.append(f"[{prev}][v{i+1}]xfade=transition=fade:duration={XF}:offset={offset}[{nxt}]")
    prev = nxt

filters.append(f"[vx]drawtext=fontfile={SANS}:text='%{{pts\\:hms}}':fontsize=17:fontcolor=white:"
               f"x=w-tw-28:y=26:box=1:boxcolor=black@0.35:boxborderw=10[vf]")

script = textfile("filters.txt", ";\n".join(filters))
cmd = ["ffmpeg", "-y"] + inputs + [
    "-filter_complex_script", script, "-map", "[vf]",
    "-t", str(sum(d for d, _, _ in SEQ)),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "21", "-preset", "medium",
    "-movflags", "+faststart", OUT,
]
subprocess.run(cmd, check=True, capture_output=True)
print("OK →", OUT)
