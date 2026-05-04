import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const eq = l.indexOf("=")
      return [l.slice(0, eq).trim(), l.slice(eq + 1).trim()]
    })
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error("missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const sb = createClient(url, serviceKey, { db: { schema: "shotgrade" } })
const sbStorage = createClient(url, serviceKey)

console.log("=== 1) shotgrade.shots rows (latest 5) ===")
const { data: rows, error: rowsErr } = await sb
  .from("shots")
  .select("id, user_id, image_url, grade, created_at")
  .order("created_at", { ascending: false })
  .limit(5)

if (rowsErr) {
  console.error("query failed:", rowsErr.message)
  process.exit(1)
}
if (!rows?.length) {
  console.log("(no rows — saves never reached DB)")
  process.exit(0)
}
console.table(
  rows.map((r) => ({
    id: r.id.slice(0, 8),
    user: r.user_id.slice(0, 8),
    grade: r.grade,
    image_url: r.image_url,
  }))
)

console.log("\n=== 2) Storage shot-images bucket ===")
const { data: buckets, error: bucketsErr } = await sbStorage.storage.listBuckets()
if (bucketsErr) console.error("listBuckets error:", bucketsErr.message)
else {
  const target = buckets?.find((b) => b.name === "shot-images")
  if (!target) console.log("⚠ bucket 'shot-images' DOES NOT EXIST")
  else console.log("bucket:", { name: target.name, public: target.public })
}

console.log("\n=== 3) Per-row file existence + URL format ===")
for (const row of rows) {
  const m = row.image_url.match(/\/object\/(public|sign)\/shot-images\/([^?]+)/)
  if (!m) {
    console.log(`row ${row.id.slice(0, 8)}: ⚠ URL doesn't match expected pattern`)
    console.log(`  url: ${row.image_url}`)
    continue
  }
  const [, kind, encodedPath] = m
  const path = decodeURIComponent(encodedPath)

  const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ""
  const file = path.includes("/") ? path.slice(path.lastIndexOf("/") + 1) : path
  const { data: list, error: listErr } = await sbStorage.storage
    .from("shot-images")
    .list(dir, { limit: 1000 })
  const exists = !listErr && list?.some((f) => f.name === file)

  let publicHttp = null
  try {
    const r = await fetch(row.image_url, { method: "HEAD" })
    publicHttp = r.status
  } catch (e) {
    publicHttp = `fetch error: ${e.message}`
  }

  const { data: signed } = await sbStorage.storage
    .from("shot-images")
    .createSignedUrl(path, 60)
  let signedHttp = null
  if (signed?.signedUrl) {
    try {
      const r = await fetch(signed.signedUrl, { method: "HEAD" })
      signedHttp = r.status
    } catch (e) {
      signedHttp = `fetch error: ${e.message}`
    }
  }

  console.log(`row ${row.id.slice(0, 8)}:`)
  console.log(`  url-kind: ${kind}`)
  console.log(`  path: ${path}`)
  console.log(`  file exists in bucket: ${exists ? "YES" : "NO"}`)
  console.log(`  HEAD public url: ${publicHttp}`)
  console.log(`  HEAD signed url: ${signedHttp}`)
}
