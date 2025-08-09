"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { Cloud, CloudFog, CloudRain, Snowflake, Sun, Zap, Heart, MapPin, Music, Quote, Camera, UploadCloud, LocateFixed, AlertTriangle, RefreshCw, Wand2 } from 'lucide-react'
import Image from "next/image"
import { MoodBackground } from "@/components/mood-background"
import { type MoodKey, getMoodForWeather, getMoodMeta, isRomanticMood } from "@/lib/moods"
import { MoodAudioPlayer } from "@/components/mood-audio"
import { playlists, type Track } from "@/lib/playlists"

type WeatherData = {
  city: string
  country: string
  tempC: number
  tempF: number
  description: string
  main: string
  icon: string | null
}

type Crush = {
  name: string
  photoUrl: string | null
}

const DEFAULT_CRUSH: Crush = { name: "", photoUrl: null }

function getClientId(): string {
  try {
    const key = "weather-mood-client-id"
    const existing = window.localStorage.getItem(key)
    if (existing) return existing
    const id = crypto.randomUUID()
    window.localStorage.setItem(key, id)
    return id
  } catch {
    return Math.random().toString(36).slice(2)
  }
}

function owMainForMood(m: MoodKey) {
  switch (m) {
    case "sunny": return "Clear"
    case "rainy": return "Rain"
    case "cloudy": return "Clouds"
    case "foggy": return "Mist"
    case "snowy": return "Snow"
    case "stormy": return "Thunderstorm"
    default: return "Clear"
  }
}

export default function Page() {
  const [askingLocation, setAskingLocation] = useState(true)
  const [cityInput, setCityInput] = useState("")
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [mood, setMood] = useState<MoodKey>("sunny")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [crush, setCrush] = useState<Crush>(DEFAULT_CRUSH)
  const [hasCrush, setHasCrush] = useState(false)
  const [saved, setSaved] = useState(false)
  const [usingDemo, setUsingDemo] = useState(false)

  // Escape Mode (manual vibe)
  const [escapeMode, setEscapeMode] = useState(false)
  const [manualMood, setManualMood] = useState<MoodKey>("rainy")

  const clientIdRef = useRef<string>("")

  useEffect(() => {
    clientIdRef.current = getClientId()
    void fetchCrush()
  }, [])

  // Keep UI mood in sync when Escape Mode is active
  useEffect(() => {
    if (escapeMode) {
      setMood(manualMood)
      // Ensure a pleasant synthetic "weather" when no live data is present
      setAskingLocation(false)
      setUsingDemo(false)
      setWeather({
        city: "Escape",
        country: "",
        tempC: 22,
        tempF: Math.round(22 * 9/5 + 32),
        description: getMoodMeta(manualMood).subtitle,
        main: owMainForMood(manualMood),
        icon: null,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escapeMode, manualMood])

  const moodMeta = useMemo(() => getMoodMeta(mood), [mood])
  const currentPlaylist: Track[] = useMemo(() => playlists[mood], [mood])

  async function fetchCrush() {
    try {
      const res = await fetch(`/api/crush?clientId=${encodeURIComponent(clientIdRef.current)}`, { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      if (data && data.crush) {
        setCrush({ name: data.crush.name ?? "", photoUrl: data.crush.photo_url ?? null })
        setHasCrush(!!data.crush.name || !!data.crush.photo_url)
      }
    } catch {}
  }

  async function useMyLocation() {
    setError(null)
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError("Location only works over HTTPS. Enter a city or try Escape Mode.")
      return
    }
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported. Please enter your city or try Escape Mode.")
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/weather", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || "Failed to fetch weather")
          applyWeather(data)
          setAskingLocation(false)
          setEscapeMode(false)
        } catch (e: any) {
          setError(e.message || "Unable to fetch weather.")
        } finally {
          setLoading(false)
        }
      },
      (err) => {
        setLoading(false)
        setError(err.message || "Location permission denied. Please enter your city or try Escape Mode.")
      },
      { enableHighAccuracy: true, maximumAge: 120000, timeout: 15000 }
    )
  }

  async function submitCity(demo = false) {
    if (!demo && !cityInput.trim()) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demo ? { demo: true, city: cityInput.trim() || undefined } : { city: cityInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch weather")
      applyWeather(data)
      setAskingLocation(false)
      setEscapeMode(false)
    } catch (e: any) {
      setError(e.message || "Unable to fetch weather.")
    } finally {
      setLoading(false)
    }
  }

  function applyWeather(data: any) {
    const w: WeatherData = {
      city: data.city,
      country: data.country,
      tempC: data.tempC,
      tempF: data.tempF,
      description: data.description,
      main: data.main,
      icon: data.icon ?? null,
    }
    setWeather(w)
    const m = getMoodForWeather(data.main)
    setMood(m)
    void fetch("/api/log-mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: clientIdRef.current,
        mood: m,
        weatherMain: w.main,
        tempC: w.tempC,
        city: w.city,
      }),
    }).then(() => setSaved(true)).catch(() => {})
    setUsingDemo(!!data.demo)
  }

  async function refreshWeather() {
    setError(null)
    setLoading(true)
    try {
      if (escapeMode) {
        // Just re-apply the manual mood to refresh texts/playlist if needed
        setMood(manualMood)
        setTimeout(() => setLoading(false), 300)
        return
      }
      if (weather?.city) {
        const res = await fetch("/api/weather", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city: weather.city }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to fetch weather")
        applyWeather(data)
      } else if (cityInput.trim()) {
        await submitCity(false)
      } else {
        setAskingLocation(true)
        return
      }
    } catch (e: any) {
      setError(e.message || "Unable to fetch weather.")
    } finally {
      setLoading(false)
    }
  }

  function MoodIcon({ size = 28 }: { size?: number }) {
    switch (mood) {
      case "sunny": return <Sun size={size} className="text-yellow-400 drop-shadow" />
      case "rainy": return <CloudRain size={size} className="text-blue-300" />
      case "cloudy": return <Cloud size={size} className="text-slate-300" />
      case "foggy": return <CloudFog size={size} className="text-gray-300" />
      case "snowy": return <Snowflake size={size} className="text-cyan-200" />
      case "stormy": return <Zap size={size} className="text-yellow-200" />
      default: return <Sun size={size} />
    }
  }

  const romantic = useMemo(() => isRomanticMood(mood), [mood])

  const romanticLine = useMemo(() => {
    const name = crush.name?.trim()
    if (!name) return "It's a perfect day to text someone who makes your heart do little cartwheels."
    const messages = [
      `Rain check? More like ${name} check. You. Me. Cozy vibes.`,
      `${name}, I forecast 100% chance of cuddles and hot cocoa.`,
      `Fog outside, butterflies inside. Thinking of ${name}.`,
      `Weather alert: strong feelings for ${name}.`,
    ]
    return messages[Math.floor(Math.random() * messages.length)]
  }, [crush.name, mood])

  const MoodChip = ({ k, label, icon }: { k: MoodKey; label: string; icon: React.ReactNode }) => (
    <button
      type="button"
      className={`rounded-full border px-3 py-1.5 text-sm flex items-center gap-2 transition-colors ${
        manualMood === k ? "bg-primary text-primary-foreground border-primary" : "bg-white/60 hover:bg-white/80"
      }`}
      onClick={() => setManualMood(k)}
      aria-pressed={manualMood === k}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <main className="relative min-h-[100dvh] w-full overflow-hidden">
      <MoodBackground mood={mood} />
      <div className="relative z-10 flex flex-col items-center justify-start gap-6 px-4 py-6 md:py-10">
        <div className="flex items-center gap-3 bg-black/20 backdrop-blur-sm rounded-full px-4 py-2 text-white shadow-lg border border-white/10">
          <MoodIcon size={22} />
          <span className="font-medium tracking-wide">Weather Mood</span>
          <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-white/20">beta</Badge>
          {usingDemo && <Badge variant="secondary" className="ml-2 bg-amber-200/60 text-amber-900 border-amber-300/60">demo</Badge>}
          {escapeMode && <Badge variant="secondary" className="ml-2 bg-purple-200/70 text-purple-900 border-purple-300/60">escape</Badge>}
        </div>

        {/* Escape Mode chooser */}
        <Card className="w-full max-w-4xl bg-white/70 backdrop-blur-md border-white/40 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Wand2 className="text-primary" />
              <h2 className="text-xl font-semibold">Choose your vibe</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Slip into an atmosphere. Pick a weather mood and drift away with a matching playlist.
            </p>

            <div className="flex flex-wrap gap-2">
              <MoodChip k="sunny" label="Sunny" icon={<Sun className="h-4 w-4 text-yellow-500" />} />
              <MoodChip k="rainy" label="Rainy" icon={<CloudRain className="h-4 w-4 text-blue-500" />} />
              <MoodChip k="cloudy" label="Cloudy" icon={<Cloud className="h-4 w-4 text-slate-500" />} />
              <MoodChip k="foggy" label="Foggy" icon={<CloudFog className="h-4 w-4 text-gray-500" />} />
              <MoodChip k="snowy" label="Snowy" icon={<Snowflake className="h-4 w-4 text-cyan-500" />} />
              <MoodChip k="stormy" label="Stormy" icon={<Zap className="h-4 w-4 text-yellow-400" />} />
            </div>

            <div className="mt-4 flex items-center gap-2">
              {!escapeMode ? (
                <Button onClick={() => setEscapeMode(true)}>
                  Start escape
                </Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={() => setEscapeMode(false)}>
                    Exit escape
                  </Button>
                  <Button variant="ghost" onClick={() => setManualMood(manualMood)}>
                    Recenter
                  </Button>
                </>
              )}
              <span className="text-xs text-muted-foreground">
                Tip: In Rainy vibe, you’ll hear a gentle rain bed for extra coziness.
              </span>
            </div>

            {/* Playlist preview */}
            <div className="mt-6 rounded-xl border bg-white/60 backdrop-blur p-4">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Music className="h-4 w-4" /> Playlist for {manualMood}
              </div>
              <ul className="grid sm:grid-cols-2 gap-2">
                {playlists[manualMood].map((t, i) => (
                  <li key={i}>
                    <a href={t.url} target="_blank" rel="noreferrer" className="group flex items-center gap-2">
                      <span className="text-xs w-6 h-6 inline-flex items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                        {i + 1}
                      </span>
                      <span className="font-medium group-hover:underline">{t.title}</span>
                      <span className="text-xs text-muted-foreground">— {t.artist}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Location card (only shown when not in Escape Mode and no weather yet) */}
        {!escapeMode && askingLocation && (
          <Card className="w-full max-w-xl bg-white/70 backdrop-blur-md border-white/40 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <LocateFixed className="text-primary" />
                <h2 className="text-xl font-semibold">Set your location</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Use your location or enter a city to set today&apos;s vibe. We only log moods anonymously.
              </p>
              <div className="grid gap-3">
                <div className="flex items-center gap-2">
                  <Button onClick={useMyLocation} disabled={loading} className="flex-1">
                    {loading ? "Getting location..." : "Use my location"}
                  </Button>
                  <span className="text-xs text-muted-foreground">or</span>
                  <form
                    className="flex items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      void submitCity(false)
                    }}
                  >
                    <Label htmlFor="city" className="sr-only">City</Label>
                    <Input id="city" placeholder="Enter city name" value={cityInput} onChange={(e) => setCityInput(e.target.value)} />
                    <Button type="submit" variant="secondary" disabled={loading}>Go</Button>
                  </form>
                </div>
                {error && (
                  <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p>{error}</p>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => submitCity(true)}>Try demo data</Button>
                        <a className="text-xs underline opacity-80" href="/api/weather?diagnostics=1" target="_blank" rel="noreferrer">Check API key</a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main scene card */}
        {!askingLocation && weather && (
          <div className="w-full max-w-4xl">
            <Card className="bg-white/70 backdrop-blur-md border-white/40 shadow-2xl overflow-hidden">
              <CardContent className="p-0">
                <div className="grid md:grid-cols-[1.2fr_1fr]">
                  <div className="p-6 md:p-8">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <MapPin className="text-primary/80" />
                        <div>
                          <div className="text-lg font-semibold">
                            {escapeMode ? "Escape" : `${weather.city}, ${weather.country}`}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">{weather.description}</div>
                        </div>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className="bg-primary/10 text-primary border-primary/20">{moodMeta.label}</Badge>
                          </TooltipTrigger>
                          <TooltipContent>{moodMeta.subtitle}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="mt-6 flex items-end gap-4">
                      <div className="text-6xl md:text-7xl font-bold tracking-tight">{escapeMode ? "" : Math.round(weather.tempC) + "°C"}</div>
                      {!escapeMode && <div className="text-muted-foreground mb-2">{Math.round(weather.tempF)}°F</div>}
                      <div className="ml-auto"><MoodIcon size={44} /></div>
                    </div>

                    <div className="mt-6 rounded-xl border bg-white/60 backdrop-blur p-4">
                      <p className="text-lg leading-relaxed">
                        {escapeMode ? `Welcome to your ${manualMood} escape. ${moodMeta.message}` : romantic ? romanticLine : moodMeta.message}
                      </p>
                      {romantic && hasCrush && !escapeMode && (
                        <div className="mt-4 flex items-center gap-3">
                          <div className="relative h-12 w-12 rounded-full overflow-hidden ring-2 ring-rose-300 shadow">
                            {crush.photoUrl ? (
                              <Image src={crush.photoUrl || "/placeholder.svg"} alt="Crush photo" fill className="object-cover" />
                            ) : (
                              <Image src="/placeholder-48xk7.png" alt="Crush placeholder" fill className="object-cover" />
                            )}
                            <Heart className="absolute -bottom-1 -right-1 h-5 w-5 text-rose-500 drop-shadow" />
                          </div>
                          <div className="text-sm">
                            <div className="font-medium">{crush.name || "Your crush"}</div>
                            <div className="text-muted-foreground">Perfect weather to send a sweet note.</div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border bg-white/60 backdrop-blur p-4">
                        <div className="flex items-center gap-2 text-sm font-medium mb-2"><Music className="h-4 w-4" /> {escapeMode ? "Escape playlist" : "Mood track"}</div>
                        {escapeMode ? (
                          <ul className="space-y-2">
                            {currentPlaylist.map((t, i) => (
                              <li key={i}>
                                <a href={t.url} target="_blank" rel="noreferrer" className="group">
                                  <div className="font-semibold group-hover:underline">{t.title}</div>
                                  <div className="text-xs text-muted-foreground">{t.artist}</div>
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <a href={moodMeta.suggestion.url} target="_blank" rel="noreferrer" className="block group">
                            <div className="font-semibold group-hover:underline">{moodMeta.suggestion.title}</div>
                            <div className="text-xs text-muted-foreground">{moodMeta.suggestion.artist}</div>
                          </a>
                        )}
                      </div>
                      <div className="rounded-xl border bg-white/60 backdrop-blur p-4">
                        <div className="flex items-center gap-2 text-sm font-medium mb-2"><Quote className="h-4 w-4" /> Quote</div>
                        <p className="text-sm italic leading-relaxed">&ldquo;{moodMeta.quote.text}&rdquo;</p>
                        <div className="text-xs text-muted-foreground mt-1">— {moodMeta.quote.author}</div>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center gap-3 flex-wrap">
                      <CrushDialog
                        defaultCrush={crush}
                        onSaved={(c) => {
                          setCrush(c)
                          setHasCrush(!!(c.name || c.photoUrl))
                        }}
                      />
                      {!escapeMode && (
                        <Button variant="ghost" onClick={() => { setAskingLocation(true); setError(null) }}>
                          Change location
                        </Button>
                      )}
                      <Button variant="ghost" onClick={() => void refreshWeather()} disabled={loading} className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        {loading ? "Refreshing..." : "Refresh"}
                      </Button>
                      <div className="ml-auto flex items-center gap-2">
                        {saved ? (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">Mood saved</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-muted">Logging mood...</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="relative min-h-[260px] hidden md:block">
                    <div className="absolute inset-0">
                      <div className="absolute inset-0 bg-gradient-to-l from-black/10 to-transparent" />
                      <MoodBackground mood={mood} variant="side" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <footer className="mt-8 text-xs text-white/80">
          Pro tip: turn on Escape Mode, press Play, and just breathe for 5 minutes.
        </footer>
        {/* For immersive audio, feed the effective mood (escape or live) */}
        <MoodAudioPlayer mood={mood} suggestion={moodMeta.suggestion} />
      </div>
    </main>
  )
}

function CrushDialog({
  defaultCrush = { name: "", photoUrl: null },
  onSaved = () => {},
}: {
  defaultCrush?: Crush
  onSaved?: (c: Crush) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(defaultCrush.name)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(defaultCrush.name)
  }, [defaultCrush.name])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2">
          <Heart className="h-4 w-4 text-rose-500" />
          {defaultCrush.name || defaultCrush.photoUrl ? "Update crush" : "Add your crush"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add your crush (optional)</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="crush-name">Name</Label>
            <Input id="crush-name" placeholder="e.g., Alex" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="crush-photo">Photo</Label>
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 rounded-full overflow-hidden ring-2 ring-rose-300">
                {file ? (
                  <img src={URL.createObjectURL(file) || "/placeholder.svg"} alt="Preview" className="h-full w-full object-cover" />
                ) : defaultCrush.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={defaultCrush.photoUrl || "/placeholder.svg"} alt="Crush" className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/avatar-placeholder.png" alt="Placeholder" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <Input id="crush-photo" type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0] || null; setFile(f) }} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Camera className="h-3 w-3" /> Square photos work best.</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <Separator />
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={async () => {
              setSubmitting(true); setError(null)
              try {
                const form = new FormData()
                form.append("clientId", getClientId())
                form.append("name", name)
                if (file) form.append("photo", file)
                const res = await fetch("/api/crush", { method: "POST", body: form })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error || "Failed to save crush")
                onSaved({ name: data.crush.name, photoUrl: data.crush.photo_url || null })
                setOpen(false)
              } catch (e: any) {
                setError(e.message || "Failed to save crush")
              } finally {
                setSubmitting(false)
              }
            }}
            disabled={submitting}
            className="gap-2"
          >
            <UploadCloud className="h-4 w-4" />
            {submitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
