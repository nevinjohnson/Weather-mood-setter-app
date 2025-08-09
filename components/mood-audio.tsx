"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"
import { ExternalLink, Music, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { cn } from "@/lib/utils"
import { type MoodKey } from "@/lib/moods"
import { AmbientPlayer } from "@/components/ambient-player"

type Suggestion = { title: string; artist: string; url: string }

function trackForMood(mood: MoodKey) {
  switch (mood) {
    case "sunny":
      return "/audio/sunny.mp3"
    case "rainy":
      return "/audio/rainy.mp3"
    case "cloudy":
      return "/audio/cloudy.mp3"
    case "foggy":
      return "/audio/foggy.mp3"
    case "snowy":
      return "/audio/snowy.mp3"
    case "stormy":
      return "/audio/stormy.mp3"
    default:
      return "/audio/sunny.mp3"
  }
}

export function MoodAudioPlayer({
  mood,
  suggestion,
  className,
}: {
  mood: MoodKey
  suggestion: Suggestion
  className?: string
}) {
  // State/refs (always created in the same order)
  const [fallbackSynth, setFallbackSynth] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState<number>(() => {
    const saved =
      typeof window !== "undefined"
        ? Number(window.localStorage.getItem("mood-audio-volume") || "0.7")
        : 0.7
    return isNaN(saved) ? 0.7 : saved
  })
  const [hidden, setHidden] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const readyRef = useRef(false)

  const label = useMemo(() => `${suggestion.title} — ${suggestion.artist}`, [suggestion])

  // Create and wire the HTMLAudio element (skip entirely if using synth fallback)
  useEffect(() => {
    if (fallbackSynth) return

    const el = new Audio()
    el.loop = true
    el.preload = "auto"
    el.crossOrigin = "anonymous"
    audioRef.current = el

    // Restore play state
    const savedPlay = typeof window !== "undefined" ? window.localStorage.getItem("mood-audio-playing") : null
    if (savedPlay === "true") setIsPlaying(true)

    const onCanPlay = () => {
      readyRef.current = true
      setError(null)
    }
    const onError = () => {
      setError("Audio failed to load. Switching to ambient synth.")
      setFallbackSynth(true)
    }

    el.addEventListener("canplay", onCanPlay)
    el.addEventListener("error", onError)

    // Initial source
    el.src = trackForMood(mood)
    el.load()
    el.volume = volume

    // Try to auto-start after first user gesture if previously playing
    const tryStart = () => {
      if (isPlaying) void el.play().catch(() => {})
      window.removeEventListener("pointerdown", tryStart, { capture: true } as any)
    }
    window.addEventListener("pointerdown", tryStart, { capture: true } as any)

    return () => {
      el.pause()
      el.removeEventListener("canplay", onCanPlay)
      el.removeEventListener("error", onError)
      window.removeEventListener("pointerdown", tryStart, { capture: true } as any)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallbackSynth])

  // Update volume (guard when in synth fallback)
  useEffect(() => {
    if (fallbackSynth) return
    if (audioRef.current) audioRef.current.volume = volume
    if (typeof window !== "undefined") window.localStorage.setItem("mood-audio-volume", String(volume))
  }, [volume, fallbackSynth])

  // Change track on mood change (guard when in synth fallback)
  useEffect(() => {
    if (fallbackSynth) return
    const el = audioRef.current
    if (!el) return
    const nextSrc = trackForMood(mood)
    // endsWith check can be brittle if el.src is absolute; compare by pathname instead:
    try {
      const srcURL = new URL(el.src, window.location.href)
      if (srcURL.pathname === nextSrc) return
    } catch {
      if (el.src.endsWith(nextSrc)) return
    }

    readyRef.current = false
    el.src = nextSrc
    el.load()

    const resume = () => {
      if (isPlaying) {
        el.play().catch(() => {
          setError("Playback blocked. Switching to ambient synth.")
          setFallbackSynth(true)
        })
      }
      el.removeEventListener("canplay", resume)
    }
    el.addEventListener("canplay", resume)
  }, [mood, isPlaying, fallbackSynth])

  async function play() {
    if (fallbackSynth) {
      // AmbientPlayer manages its own play state; nothing to do here
      setIsPlaying(true)
      return
    }
    const el = audioRef.current
    if (!el) return
    setError(null)
    try {
      await el.play()
      setIsPlaying(true)
      if (typeof window !== "undefined") window.localStorage.setItem("mood-audio-playing", "true")
    } catch (e: any) {
      if (e?.name === "NotAllowedError") {
        setError("Playback blocked by browser. Switching to ambient synth.")
        setFallbackSynth(true)
        return
      }
      setError("Tap again to allow audio, or check device volume.")
    }
  }

  function pause() {
    if (!fallbackSynth) {
      const el = audioRef.current
      if (el) el.pause()
      if (typeof window !== "undefined") window.localStorage.setItem("mood-audio-playing", "false")
    }
    setIsPlaying(false)
  }

  // Render UI: either synth fallback or the file-backed audio
  if (fallbackSynth) {
    return <AmbientPlayer mood={mood} suggestion={suggestion} className={className} />
  }

  return (
    <div className={cn("fixed z-40 bottom-4 left-1/2 -translate-x-1/2 w-[min(760px,92vw)]", className)}>
      {!hidden ? (
        <Card className="bg-black/65 text-white border-white/10 shadow-2xl backdrop-blur-xl px-3 py-2 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Music className="h-4 w-4 text-white/80" />
              <div className="min-w-0">
                <div className="text-xs md:text-sm truncate">
                  <span className="opacity-90">Now vibing:</span> <span className="font-medium">{label}</span>
                </div>
                <a
                  href={suggestion.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] opacity-80 hover:opacity-100 underline underline-offset-2"
                >
                  Open full track <ExternalLink className="h-3 w-3" />
                </a>
                {error && <div className="text-[11px] text-rose-200 mt-1">{error}</div>}
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
                  <span className="flex items-center gap-1">
                    <Pause className="h-4 w-4" /> Pause
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Play className="h-4 w-4" /> Play
                  </span>
                )}
              </Button>

              <div className="hidden md:flex items-center gap-2 w-36">
                {volume < 0.01 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                <Slider aria-label="Volume" value={[Math.round(volume * 100)]} onValueChange={(v) => setVolume((v?.[0] ?? 70) / 100)} />
              </div>

              <Button
                size="sm"
                variant="ghost"
                className="text-white/80 hover:text-white"
                onClick={() => setHidden(true)}
                aria-label="Hide player"
                title="Hide player"
              >
                ✕
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Button onClick={() => setHidden(false)} className="bg-black/60 text-white border-white/10 shadow-xl backdrop-blur-md" variant="secondary">
          <Music className="h-4 w-4 mr-2" /> Player
        </Button>
      )}
    </div>
  )
}
