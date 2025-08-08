export const dynamic = "force-dynamic"

type ReqBody = {
  city?: string
  lat?: number
  lon?: number
  demo?: boolean
}

function toF(c: number) {
  return c * 9 / 5 + 32
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getDemoWeather(opts?: { city?: string; reason?: "missing-api-key" | "invalid-api-key" | "forced" }) {
  const city = opts?.city || "San Francisco"
  // Weighted to frequently showcase romantic moods (rainy/foggy)
  const demos = [
    { main: "Rain", description: "light rain", tempC: 18, country: "US" },
    { main: "Mist", description: "misty", tempC: 16, country: "US" },
    { main: "Clouds", description: "broken clouds", tempC: 21, country: "US" },
    { main: "Clear", description: "clear sky", tempC: 27, country: "US" },
    { main: "Snow", description: "snow showers", tempC: -1, country: "US" },
    { main: "Thunderstorm", description: "thunder and lightning", tempC: 24, country: "US" },
  ]
  const weighted = [0, 0, 1, 2, 3, 4, 5, 1, 0] // a little bias to rainy/foggy
    .map(() => pick(demos))
  const sel = pick(weighted)
  return {
    city,
    country: sel.country,
    tempC: sel.tempC,
    tempF: toF(sel.tempC),
    description: sel.description,
    main: sel.main,
    icon: null as string | null,
    demo: true,
    fallbackReason: opts?.reason || "forced",
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get("diagnostics") === "1") {
    const key = process.env.OPENWEATHER_API_KEY || ""
    const keyPreview = key ? `${key.slice(0, 4)}...${key.slice(-3)}` : null
    return Response.json({ hasKey: !!key, keyPreview })
  }
  return Response.json({ ok: true })
}

export async function POST(req: Request) {
  try {
    const { city, lat, lon, demo } = (await req.json()) as ReqBody
    const apiKey = process.env.OPENWEATHER_API_KEY

    // Explicit or implicit demo mode if no key
    if (demo === true || !apiKey) {
      return Response.json(getDemoWeather({ city, reason: !apiKey ? "missing-api-key" : "forced" }))
    }

    let url = ""
    const params = new URLSearchParams({ appid: apiKey, units: "metric" })
    if (typeof lat === "number" && typeof lon === "number") {
      params.set("lat", String(lat))
      params.set("lon", String(lon))
      url = `https://api.openweathermap.org/data/2.5/weather?${params.toString()}`
    } else if (city) {
      params.set("q", city)
      url = `https://api.openweathermap.org/data/2.5/weather?${params.toString()}`
    } else {
      return Response.json({ error: "Provide either { lat, lon } or { city }." }, { status: 400 })
    }

    const r = await fetch(url, { cache: "no-store" })
    const json = await r.json()

    if (!r.ok) {
      const msg = json?.message || "Failed to fetch weather"
      // If the key is invalid, transparently fall back to demo data so UX doesn’t break.
      if (r.status === 401 && String(msg).toLowerCase().includes("invalid")) {
        return Response.json(getDemoWeather({ city, reason: "invalid-api-key" }))
      }
      return Response.json({ error: msg }, { status: r.status })
    }

    const main = json?.weather?.[0]?.main ?? "Clear"
    const description = json?.weather?.[0]?.description ?? "clear sky"
    const icon = json?.weather?.[0]?.icon ?? null
    const tempC = typeof json?.main?.temp === "number" ? json.main.temp : 20
    const cityName = json?.name ?? city ?? "Your City"
    const country = json?.sys?.country ?? ""

    return Response.json({
      city: cityName,
      country,
      tempC,
      tempF: toF(tempC),
      description,
      main,
      icon,
    })
  } catch (e: any) {
    // Network or unexpected error → return demo to keep UX smooth
    return Response.json(getDemoWeather({ reason: "forced" }))
  }
}
