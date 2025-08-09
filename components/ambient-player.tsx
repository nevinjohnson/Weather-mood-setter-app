"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"
import { Music, Pause, Play, Volume2, VolumeX, ExternalLink } from 'lucide-react'
import { type MoodKey } from "@/lib/moods"
import { cn } from "@/lib/utils"

type Suggestion = { title: string; artist: string; url: string }

type Props = {
  mood: MoodKey
  suggestion: Suggestion
  className?: string
}

/**
 * AmbientPlayer (Web Audio)
 * - Synth layers + filtered noise
 * - Adds a subtle rain loop when mood === "rainy" for deeper immersion
 * - Crossfades parameters per mood
 */
export function AmbientPlayer({ mood, suggestion, className }: Props) {
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState<number>(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("ambient-volume") : null
    return saved ? Number(saved) : 0.6
  })
  const [show, setShow] = useState(true)

  const ctxRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)

  // Synth nodes
  const oscARef = useRef<OscillatorNode | null>(null)
  const oscBRef = useRef<OscillatorNode | null>(null)
  const oscGainRef = useRef<GainNode | null>(null)
  const noiseRef = useRef<AudioBufferSourceNode | null>(null)
  const noiseGainRef = useRef<GainNode | null>(null)
  const filterRef = useRef<BiquadFilterNode | null>(null)
  const lfoRef = useRef<OscillatorNode | null>(null)
  const lfoGainRef = useRef<GainNode | null>(null)

  // Rain loop (decoded into a buffer, then started/stopped as needed)
  const rainBufferRef = useRef<AudioBuffer | null>(null)
  const rainGainRef = useRef<GainNode | null>(null)
  const rainSourceRef = useRef<AudioBufferSourceNode | null>(null)

  // Persisted preferences
  useEffect(() => {
    if (typeof window === "undefined") return
    const savedPlaying = window.localStorage.getItem("ambient-playing")
    const consent = window.localStorage.getItem("ambient-consent")
    setIsPlaying(savedPlaying === "true" && consent === "true")
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem("ambient-volume", String(volume))
    if (masterGainRef.current) {
      masterGainRef.current.gain.linearRampToValueAtTime(volume, now() + 0.2)
    }
  }, [volume])

  async function ensureAudio() {
    if (typeof window === "undefined") return
    if (!ctxRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      ctxRef.current = ctx
      // Master
      const master = ctx.createGain()
      master.gain.value = 0.0001
      master.connect(ctx.destination)
      masterGainRef.current = master

      // Musical layer
      const oscGain = ctx.createGain()
      oscGain.gain.value = 0.0
      oscGainRef.current = oscGain

      const filter = ctx.createBiquadFilter()
      filter.type = "lowpass"
      filter.frequency.value = 1000
      filterRef.current = filter

      // Noise layer
      const noiseGain = ctx.createGain()
      noiseGain.gain.value = 0.0
      noiseGainRef.current = noiseGain

      // Rain layer (post-filter, subtle bed)
      const rainGain = ctx.createGain()
      rainGain.gain.value = 0.0
      rainGainRef.current = rainGain

      // LFO for filter motion
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 0.08
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = 12
      lfo.connect(lfoGain).connect(filter.frequency)
      lfoRef.current = lfo
      lfoGainRef.current = lfoGain

      // Routing:
      // osc -> filter -> master
      // noise -> filter -> master
      // rain -> master (bypasses filter to feel "outside")
      oscGain.connect(filter)
      noiseGain.connect(filter)
      filter.connect(master)
      rainGain.connect(master)

      // Start sources
      const { oscA, oscB } = startOscillators(ctx, oscGain)
      oscARef.current = oscA
      oscBRef.current = oscB
      const noise = startNoise(ctx)
      noiseRef.current = noise
      lfo.start()

      setIsReady(true)
    }

    if (ctxRef.current?.state === "suspended") {
      await ctxRef.current.resume()
    }
  }

  function startOscillators(ctx: AudioContext, out: GainNode) {
    const oscA = ctx.createOscillator()
    const oscB = ctx.createOscillator()
    oscA.type = "sine"
    oscB.type = "triangle"
    oscA.connect(out)
    oscB.connect(out)
    oscA.start()
    oscB.start()
    return { oscA, oscB }
  }

  function startNoise(ctx: AudioContext) {
    const bufferSize = 2 * ctx.sampleRate
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    noise.loop = true
    noise.connect(noiseGainRef.current!)
    noise.start()
    return noise
  }

  function now() {
    return ctxRef.current ? ctxRef.current.currentTime : 0
  }

  // Load rain buffer once
  async function ensureRainBuffer() {
    if (!ctxRef.current) return
    if (rainBufferRef.current) return
    const res = await fetch("/audio/rain.mp3")
    const arr = await res.arrayBuffer()
    rainBufferRef.current = await ctxRef.current.decodeAudioData(arr)
  }

  function startRain() {
    const ctx = ctxRef.current
    const buf = rainBufferRef.current
    if (!ctx || !buf || !rainGainRef.current) return
    // Stop existing
    if (rainSourceRef.current) {
      try { rainSourceRef.current.stop() } catch {}
      rainSourceRef.current.disconnect()
      rainSourceRef.current = null
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    src.connect(rainGainRef.current)
    src.start()
    rainSourceRef.current = src
  }

  function stopRain() {
    if (rainSourceRef.current) {
      try { rainSourceRef.current.stop() } catch {}
      rainSourceRef.current.disconnect()
      rainSourceRef.current = null
    }
    const t0 = now()
    rainGainRef.current?.gain.cancelScheduledValues(t0)
    rainGainRef.current?.gain.linearRampToValueAtTime(0.0, t0 + 0.3)
  }

  // Apply mood palette
  function applyMood(targetMood: MoodKey, fast = false) {
    const ctx = ctxRef.current
    const oscA = oscARef.current
    const oscB = oscBRef.current
    const oscGain = oscGainRef.current
    const noiseGain = noiseGainRef.current
    const filter = filterRef.current
    const rainGain = rainGainRef.current
    if (!ctx || !oscA || !oscB || !oscGain || !noiseGain || !filter || !rainGain) return

    const t0 = now()
    const ramp = fast ? 0.3 : 1.2

    const palette = getPalette(targetMood)

    oscA.frequency.cancelScheduledValues(t0)
    oscB.frequency.cancelScheduledValues(t0)
    oscA.frequency.linearRampToValueAtTime(palette.freqA, t0 + ramp)
    oscB.frequency.linearRampToValueAtTime(palette.freqB, t0 + ramp)

    oscGain.gain.cancelScheduledValues(t0)
    noiseGain.gain.cancelScheduledValues(t0)
    oscGain.gain.linearRampToValueAtTime(palette.oscGain, t0 + ramp)
    noiseGain.gain.linearRampToValueAtTime(palette.noiseGain, t0 + ramp)

    filter.frequency.cancelScheduledValues(t0)
    filter.Q.cancelScheduledValues(t0)
    filter.frequency.linearRampToValueAtTime(palette.filterFreq, t0 + ramp)
    filter.Q.linearRampToValueAtTime(palette.filterQ, t0 + ramp)

    // Rain mix (fade in only if rainy)
    rainGain.gain.cancelScheduledValues(t0)
    const targetRain = targetMood === "rainy" ? palette.rainGain ?? 0.3 : 0.0
    rainGain.gain.linearRampToValueAtTime(targetRain, t0 + ramp)
  }

  // Mood palette mapping
  function getPalette(m: MoodKey) {
    switch (m) {
      case "sunny":
        return { freqA: 220, freqB: 440, oscGain: 0.15, noiseGain: 0.02, filterFreq: 3500, filterQ: 0.8, rainGain: 0 }
      case "rainy":
        return { freqA: 174, freqB: 261.6, oscGain: 0.08, noiseGain: 0.05, filterFreq: 1800, filterQ: 0.7, rainGain: 0.35 }
      case "cloudy":
        return { freqA: 196, freqB: 294, oscGain: 0.11, noiseGain: 0.04, filterFreq: 2200, filterQ: 0.9, rainGain: 0 }
      case "foggy":
        return { freqA: 174, freqB: 233, oscGain: 0.09, noiseGain: 0.05, filterFreq: 1200, filterQ: 1.0, rainGain: 0 }
      case "snowy":
        return { freqA: 392, freqB: 523.25, oscGain: 0.12, noiseGain: 0.03, filterFreq: 2800, filterQ: 0.6, rainGain: 0 }
      case "stormy":
        return { freqA: 98, freqB: 147, oscGain: 0.13, noiseGain: 0.07, filterFreq: 1600, filterQ: 1.2, rainGain: 0 }
      default:
        return { freqA: 220, freqB: 440, oscGain: 0.12, noiseGain: 0.03, filterFreq: 2400, filterQ: 0.8, rainGain: 0 }
    }
  }

  // React to mood changes
  useEffect(() => {
    if (!isReady) return
    applyMood(mood)
    // Manage rain source when switching to/from rainy
    ;(async () => {
      if (mood === "rainy" && isPlaying) {
        await ensureAudio()
        await ensureRainBuffer().catch(() => {})
        startRain()
      } else {
        stopRain()
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, isReady])

  // Start/stop
  async function play() {
    await ensureAudio()
    if (!ctxRef.current || !masterGainRef.current) return
    const t0 = now()
    masterGainRef.current.gain.cancelScheduledValues(t0)
    masterGainRef.current.gain.linearRampToValueAtTime(Math.max(volume, 0.0001), t0 + 0.3)
    setIsPlaying(true)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ambient-playing", "true")
      window.localStorage.setItem("ambient-consent", "true")
    }
    applyMood(mood, true)
    if (mood === "rainy") {
      try {
        await ensureRainBuffer()
        startRain()
      } catch {}
    }
  }

  function pause() {
    if (!masterGainRef.current) return
    const t0 = now()
    masterGainRef.current.gain.cancelScheduledValues(t0)
    masterGainRef.current.gain.linearRampToValueAtTime(0.0001, t0 + 0.3)
    setIsPlaying(false)
    if (typeof window !== "undefined") window.localStorage.setItem("ambient-playing", "false")
    stopRain()
  }

  // If user previously consented and isPlaying true, try to resume on first interaction
  useEffect(() => {
    if (!isPlaying) return
    ;(async () => {
      await ensureAudio()
      if (!masterGainRef.current) return
      masterGainRef.current.gain.value = Math.max(volume, 0.0001)
      applyMood(mood, true)
      if (mood === "rainy") {
        try {
          await ensureRainBuffer()
          startRain()
        } catch {}
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying])

  const label = useMemo(() => `${suggestion.title} — ${suggestion.artist}`, [suggestion])

  return (
    <div
      className={cn(
        "fixed z-40 bottom-4 left-1/2 -translate-x-1/2",
        "w-[min(720px,92vw)]",
        className
      )}
    >
      {show && (
        <Card className="bg-black/60 text-white border-white/10 shadow-2xl backdrop-blur-md px-3 py-2 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-white/80" />
              <div className="text-xs md:text-sm">
                <div className="font-medium leading-tight">
                  Now playing: <span className="opacity-90">{label}</span>
                </div>
                <a
                  href={suggestion.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] opacity-80 hover:opacity-100 underline underline-offset-2"
                >
                  Open full track <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/15 hover:bg-white/25 text-white border-white/20"
                onClick={() => (isPlaying ? pause() : void play())}
              >
                {isPlaying ? (
                  <span className="flex items-center gap-1"><Pause className="h-4 w-4" /> Pause</span>
                ) : (
                  <span className="flex items-center gap-1"><Play className="h-4 w-4" /> Play vibe</span>
                )}
              </Button>

              <div className="hidden md:flex items-center gap-2 w-36">
                {volume < 0.01 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                <Slider
                  aria-label="Volume"
                  value={[Math.round(volume * 100)]}
                  onValueChange={(v) => setVolume((v?.[0] ?? 60) / 100)}
                />
              </div>

              <Button
                size="sm"
                variant="ghost"
                className="text-white/80 hover:text-white"
                onClick={() => setShow(false)}
                aria-label="Hide player"
                title="Hide player"
              >
                ✕
              </Button>
            </div>
          </div>
        </Card>
      )}
      {!show && (
        <Button
          onClick={() => setShow(true)}
          className="bg-black/60 text-white border-white/10 shadow-xl backdrop-blur-md"
          variant="secondary"
        >
          <Music className="h-4 w-4 mr-2" />
          Player
        </Button>
      )}
    </div>
  )
}
