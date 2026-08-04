#!/usr/bin/env python3
"""Piste rythmique zouk/bèlè synthétisée (104 BPM) -> beat.wav"""
import numpy as np, wave

SR = 44100
BPM = 104.0
BEAT = 60.0 / BPM            # 0.5769 s
BARS = 22                    # 22 mesures 4/4 ≈ 50.8 s
N = int(BARS * 4 * BEAT * SR)
mix = np.zeros(N)

def add(sig, t):
    i = int(t * SR)
    j = min(N, i + len(sig))
    if i < N:
        mix[i:j] += sig[:j - i]

def kick(dur=0.16, f0=120, f1=45, amp=1.0):
    t = np.linspace(0, dur, int(dur * SR))
    f = np.linspace(f0, f1, len(t))
    return amp * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22)

def tibwa(dur=0.05, amp=0.5):  # frappe de bois sèche
    t = np.linspace(0, dur, int(dur * SR))
    tone = np.sin(2 * np.pi * 2400 * t) + 0.5 * np.sin(2 * np.pi * 3150 * t)
    return amp * tone * np.exp(-t * 90)

def shaker(dur=0.09, amp=0.16):
    t = np.linspace(0, dur, int(dur * SR))
    return amp * np.random.randn(len(t)) * np.exp(-t * 45)

def conga(f, dur=0.14, amp=0.55):
    t = np.linspace(0, dur, int(dur * SR))
    return amp * np.sin(2 * np.pi * f * t) * np.exp(-t * 30)

rng = np.random.default_rng(7)
for bar in range(BARS):
    t0 = bar * 4 * BEAT
    # kick zouk : 1 et 3 (+ pickup léger sur 4&)
    add(kick(amp=1.0), t0)
    add(kick(amp=0.9), t0 + 2 * BEAT)
    add(kick(dur=0.1, amp=0.35), t0 + 3.5 * BEAT)
    # ti-bwa (transcription bèlè) : motif x.xx.xx. en doubles-croches sur 2 temps
    patt = [0, 0.75, 1.0, 1.5, 1.75]
    for rep in (0, 2):
        for p in patt:
            add(tibwa(amp=0.5 if p in (0, 1.0) else 0.34), t0 + (rep + p) * BEAT)
    # shaker sur les croches
    for e in range(8):
        add(shaker(amp=0.18 if e % 2 == 0 else 0.11), t0 + e * 0.5 * BEAT)
    # congas : réponse sur 2& et 4
    add(conga(210, amp=0.5), t0 + 1.5 * BEAT)
    add(conga(160, amp=0.6), t0 + 3 * BEAT)
    if bar % 4 == 3:  # petit roulement de fin de phrase
        for k in range(4):
            add(conga(180 + 30 * k, dur=0.09, amp=0.4), t0 + (3.25 + k * 0.25) * BEAT)

# intro douce / outro fade
env = np.ones(N)
fade_in = int(1.5 * SR); env[:fade_in] = np.linspace(0.4, 1, fade_in)
fade_out = int(2.5 * SR); env[-fade_out:] = np.linspace(1, 0, fade_out)
mix *= env
mix = np.tanh(mix * 0.9)  # bus soft-clip
mix = (mix / np.max(np.abs(mix)) * 0.85 * 32767).astype(np.int16)

with wave.open("beat.wav", "w") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(mix.tobytes())
print("beat.wav", len(mix) / SR, "s")
