import { getSupabaseServer } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get("clientId")
    if (!clientId) return Response.json({ error: "Missing clientId" }, { status: 400 })
    const supabase = getSupabaseServer()
    const { data, error } = await supabase.from("crushes").select("*").eq("client_id", clientId).maybeSingle()
    if (error) throw error
    return Response.json({ crush: data })
  } catch (e: any) {
    return Response.json({ error: e.message || "Failed to fetch crush" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseServer()
    const form = await req.formData()
    const clientId = form.get("clientId")
    const name = form.get("name")
    if (!clientId || typeof clientId !== "string") {
      return Response.json({ error: "Missing clientId" }, { status: 400 })
    }
    if (typeof name !== "string") {
      return Response.json({ error: "Invalid name" }, { status: 400 })
    }
    let photo_url: string | null = null

    const file = form.get("photo") as File | null
    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const ext = (file.type?.split("/")?.[1] || "jpg").toLowerCase()
      const path = `${clientId}/${Date.now()}.${ext}`
      const { data: uploaded, error: uploadError } = await supabase.storage
        .from("crush-photos")
        .upload(path, bytes, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        })
      if (uploadError) throw uploadError
      const { data: pub } = supabase.storage.from("crush-photos").getPublicUrl(uploaded.path)
      photo_url = pub.publicUrl
    }

    // Upsert by client_id
    const { data, error } = await supabase.from("crushes").upsert({
      client_id: clientId,
      name,
      photo_url: photo_url ?? undefined,
      updated_at: new Date().toISOString(),
    }, { onConflict: "client_id" }).select("*").single()
    if (error) throw error
    return Response.json({ crush: data })
  } catch (e: any) {
    return Response.json({ error: e.message || "Failed to save crush" }, { status: 500 })
  }
}
