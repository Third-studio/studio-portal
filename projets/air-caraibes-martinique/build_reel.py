#!/usr/bin/env python3
"""Reel rythmé ~50s : cuts calés sur le beat (104 BPM), punch-ins, flashs, typo.
Remplacer stills/seq*.jpg par les images Higgsfield puis relancer."""
import subprocess, os

SP = os.path.dirname(os.path.abspath(__file__))
ST = os.path.join(SP, "stills")
OUT = os.path.join(SP, "AirCaraibes-Reel-Rythme.mp4")
FPS = 25
W, H = 1280, 720
BEAT = 60.0 / 104.0

def img(name): return os.path.join(ST, name + ".jpg")

# (image, beats, effet) — effets : in=punch-in rapide, out=zoom-out, pan, hold
SHOTS = [
    ("seq1",  4, "in"),    # ouverture ciel — pose le décor
    ("card1", 2, "hold"),  # MARTINIQUE
    ("seq2",  2, "in"),    # porte créole
    ("seq3",  4, "out"),   # portrait madras/bakoua — respiration
    ("card2", 2, "hold"),  # AN KAY-MWEN (madras)
    ("card3", 1, "hold"),  # LE GOÛT
    ("seq4",  2, "in"),    # marché
    ("seq4",  1, "in2"),   # marché punch-in serré
    ("seq5",  4, "pan"),   # Pelée — plan large
    ("card4", 1, "hold"),  # LA MER
    ("seq6",  2, "in"),    # yole
    ("seq6",  1, "in2"),   # yole punch serré
    ("card5", 1, "hold"),  # LE SOIR
    ("seq7",  2, "in"),    # ti-punch
    ("seq7",  1, "in2"),   # punch serré
    ("seq8",  4, "out"),   # cabine — ralentissement final
    ("card6", 6, "hold"),  # signature
]

inputs, filters, labels = [], [], []
for i, (name, beats, fx) in enumerate(SHOTS):
    d = beats * BEAT
    frames = max(2, int(round(d * FPS)))
    inputs += ["-loop", "1", "-t", f"{d + 0.4}", "-i", img(name)]
    if fx == "in":     zp = f"zoompan=z='1+0.10*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS}"
    elif fx == "in2":  zp = f"zoompan=z='1.25+0.15*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/3-(ih/zoom/3)':d={frames}:s={W}x{H}:fps={FPS}"
    elif fx == "out":  zp = f"zoompan=z='1.18-0.12*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS}"
    elif fx == "pan":  zp = f"zoompan=z=1.12:x='(iw-iw/zoom)*on/{frames}':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS}"
    else:              zp = f"zoompan=z='1+0.03*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS}"
    # flash blanc 2 trames en tête de certains cuts (sur les cartes typo)
    flash = ",fade=t=in:st=0:d=0.08:color=white" if name.startswith("card") else ""
    filters.append(f"[{i}:v]scale={W*2}:{H*2},{zp}{flash},setsar=1,fps={FPS},trim=duration={d},setpts=PTS-STARTPTS[v{i}]")
    labels.append(f"[v{i}]")

filters.append("".join(labels) + f"concat=n={len(SHOTS)}:v=1:a=0[vc]")
# fondu final
total = sum(b for _, b, _ in SHOTS) * BEAT
filters.append(f"[vc]fade=t=out:st={total-1.2}:d=1.2[vf]")

script = os.path.join(SP, "txt", "reel_filters.txt")
os.makedirs(os.path.dirname(script), exist_ok=True)
with open(script, "w") as f:
    f.write(";\n".join(filters))

cmd = ["ffmpeg", "-y"] + inputs + [
    "-i", os.path.join(SP, "beat.wav"),
    "-filter_complex_script", script,
    "-map", "[vf]", "-map", f"{len(SHOTS)}:a",
    "-t", str(total),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "medium",
    "-c:a", "aac", "-b:a", "160k", "-af", f"afade=t=out:st={total-1.5}:d=1.5",
    "-movflags", "+faststart", OUT,
]
subprocess.run(cmd, check=True, capture_output=True)
print("OK →", OUT, f"({total:.1f}s)")
