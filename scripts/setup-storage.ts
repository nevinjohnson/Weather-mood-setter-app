import { createClient } from "@supabase/supabase-js"

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    return
  }
  const supabase = createClient(url, key)
  // Create bucket if not exists
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = (buckets || []).some(b => b.id === "crush-photos")
  if (!exists) {
    const { error } = await supabase.storage.createBucket("crush-photos", { public: true })
    if (error) throw error
    console.log("Created bucket crush-photos (public)")
  } else {
    console.log("Bucket crush-photos already exists")
  }
}

main().catch((e) => {
  console.error(e)
})
