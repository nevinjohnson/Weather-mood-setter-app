import { getSupabaseServer } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { clientId, mood, weatherMain, tempC, city } = body || {}
    if (!clientId || !mood) {
      return Response.json({ error: "Missing clientId or mood" }, { status: 400 })
    }
    const supabase = getSupabaseServer()
    const { error } = await supabase
      .from("mood_logs")
      .insert({
        client_id: clientId,
        mood,
        weather_main: weatherMain ?? null,
        temp_c: typeof tempC === "number" ? tempC : null,
        city: city ?? null,
      })
    if (error) throw error
    return Response.json({ ok: true })
  } catch (e: any) {
    return Response.json({ error: e.message || "Failed to log mood" }, { status: 500 })
  }
}
