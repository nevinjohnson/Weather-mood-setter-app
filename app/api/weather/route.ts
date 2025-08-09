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
  const city = opts?.city || "Demo City"
  const demos = [
    { main: "Rain", description: "light rain", tempC: 18, country: "GB" },
    { main: "Mist", description: "misty", tempC: 16, country: "IN" },
    { main: "Clouds", description: "broken clouds", tempC: 21, country: "DE" },
    { main: "Clear", description: "clear sky", tempC: 27, country: "ES" },
    { main: "Snow", description: "snow showers", tempC: -1, country: "CA" },
    { main: "Thunderstorm", description: "thunder and lightning", tempC: 24, country: "BR" },
  ]
  const sel = pick(demos)
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

// ---------- Open-Meteo fallback (no API key required) ----------
type MeteoSearch = {
  results?: Array<{ name: string; country_code?: string; latitude: number; longitude: number }>
}

type MeteoCurrent = {
  latitude: number
  longitude: number
  current?: { temperature_2m?: number; weather_code?: number }
  current_weather?: { temperature?: number; weathercode?: number } // legacy shape
}

function mapMeteoCodeToMain(code: number): { main: string; description: string } {
  // Based on WMO weather interpretation codes used by Open-Meteo
  // https://open-meteo.com/en/docs
  if (code === 0) return { main: "Clear", description: "clear sky" }
  if ([1, 2, 3].includes(code)) return { main: "Clouds", description: "partly cloudy" }
  if ([45, 48].includes(code)) return { main: "Mist", description: "foggy" }
  if ([51, 53, 55, 56, 57].includes(code)) return { main: "Drizzle", description: "light drizzle" }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { main: "Rain", description: "rain showers" }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { main: "Snow", description: "snow" }
  if ([95, 96, 99].includes(code)) return { main: "Thunderstorm", description: "thunderstorm" }
  return { main: "Clouds", description: "overcast" }
}

async function meteoByLatLon(lat: number, lon: number) {
  const url = new URL("https://api.open-meteo.com/v1/forecast")
  url.searchParams.set("latitude", String(lat))
  url.searchParams.set("longitude", String(lon))
  url.searchParams.set("current_weather", "true")
  url.searchParams.set("temperature_unit", "celsius")
  const r = await fetch(url.toString(), { cache: "no-store" })
  if (!r.ok) throw new Error("Open-Meteo forecast failed")
  const json = (await r.json()) as MeteoCurrent

  // Support both current and current_weather shapes
  const tempC = typeof json.current?.temperature_2m === "number"
    ? json.current!.temperature_2m!
    : typeof (json as any).current_weather?.temperature === "number"
      ? (json as any).current_weather.temperature
      : null

  const code = typeof json.current?.weather_code === "number"
    ? json.current!.weather_code!
    : typeof (json as any).current_weather?.weathercode === "number"
      ? (json as any).current_weather.weathercode
      : null

  if (tempC === null || code === null) throw new Error("Open-Meteo returned incomplete data")

  const { main, description } = mapMeteoCodeToMain(code)
  return {
    tempC,
    main,
    description,
  }
}

async function geocodeCityMeteo(city: string) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search")
  url.searchParams.set("name", city)
  url.searchParams.set("count", "1")
  url.searchParams.set("language", "en")
  url.searchParams.set("format", "json")
  const r = await fetch(url.toString(), { cache: "no-store" })
  if (!r.ok) throw new Error("City geocoding failed")
  const json = (await r.json()) as MeteoSearch
  const first = json.results?.[0]
  if (!first) throw new Error("City not found")
  return first
}

async function fallbackFromOpenMeteo(input: { city?: string; lat?: number; lon?: number }) {
  let cityName = input.city
  let country = ""
  let lat = input.lat
  let lon = input.lon

  if ((typeof lat !== "number" || typeof lon !== "number")) {
    if (!cityName) throw new Error("Provide either coordinates or a city")
    const geo = await geocodeCityMeteo(cityName)
    lat = geo.latitude
    lon = geo.longitude
    country = geo.country_code || ""
    cityName = geo.name || cityName
  }

  const current = await meteoByLatLon(lat!, lon!)
  return {
    city: cityName || "Your City",
    country,
    tempC: current.tempC,
    tempF: toF(current.tempC),
    description: current.description,
    main: current.main,
    icon: null as string | null,
    provider: "open-meteo" as const,
    fallbackReason: "openweather-401",
  }
}

// ---------------------------------------------------------------

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

    if (demo) {
      return Response.json(getDemoWeather({ city, reason: "forced" }))
    }

    const apiKey = process.env.OPENWEATHER_API_KEY

    // If no key is configured at all, try provider fallback first; if that also fails, message clearly.
    if (!apiKey) {
      try {
        const meteo = await fallbackFromOpenMeteo({ city, lat, lon })
        return Response.json(meteo)
      } catch {
        return Response.json(
          { error: "Server is missing OPENWEATHER_API_KEY and fallback failed. Add the key or try demo data." },
          { status: 500 }
        )
      }
    }

    // Build OpenWeather URL
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
      const status = r.status
      const msg = json?.message || "Failed to fetch weather"
      // If invalid key or unauthorized, transparently fall back to Open-Meteo
      if (status === 401 || /invalid api key/i.test(String(msg))) {
        try {
          const meteo = await fallbackFromOpenMeteo({ city, lat, lon })
          return Response.json(meteo)
        } catch {
          // As a last resort, pass through the original error
          return Response.json({ error: msg }, { status })
        }
      }
      // Other errors: pass through
      return Response.json({ error: msg }, { status })
    }

    // Success with OpenWeather
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
      provider: "openweather" as const,
    })
  } catch (e: any) {
    return Response.json({ error: e.message || "Unexpected server error" }, { status: 500 })
  }
}
