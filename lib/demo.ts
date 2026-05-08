import { createClient } from "@/lib/supabase/client"
import { CATALOGO_KIOSCO } from "@/lib/catalogos/kiosco"

const DEMO_EMAIL = "demo@possaas.app"
const DEMO_PASS  = "DemoPos2026!"

// Open Food Facts CDN path: EAN 7790895000119 → 779/089/500/0119
function eanToImageUrl(ean: string): string | null {
  if (!ean || ean.length < 8) return null
  const p = ean.padStart(13, "0")
  return `https://images.openfoodfacts.org/images/products/${p.slice(0,3)}/${p.slice(3,6)}/${p.slice(6,9)}/${p.slice(9)}/front_es.400.jpg`
}

export async function entrarComoDemo(): Promise<{ ok: boolean; error?: string }> {
  const db = createClient()

  // 1 — Login
  const { error: loginErr } = await db.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASS })

  if (loginErr) {
    const { error: signupErr } = await db.auth.signUp({ email: DEMO_EMAIL, password: DEMO_PASS })
    if (signupErr && !signupErr.message.toLowerCase().includes("already")) {
      return { ok: false, error: signupErr.message }
    }
    const { error: reloginErr } = await db.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASS })
    if (reloginErr) return { ok: false, error: reloginErr.message }
  }

  // 2 — Usuario
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { ok: false, error: "No se pudo obtener el usuario" }

  // 3 — Tenant existente?
  const { data: existing } = await db
    .from("tenant_users").select("tenant_id").eq("user_id", user.id).single()

  let tenantId: string

  if (existing?.tenant_id) {
    tenantId = existing.tenant_id

    // Si ya tiene stock completo no hacemos nada
    const { count } = await db
      .from("stock").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId)
    if ((count ?? 0) >= 50) return { ok: true }

    // Stock incompleto — limpiar y resembrar
    await db.from("stock").delete().eq("tenant_id", tenantId)
  } else {
    // 4 — Crear tenant demo via RPC (bypasea RLS)
    const { data: newId, error: rpcErr } = await db
      .rpc("create_tenant_for_user", { p_nombre: "Kiosco La Esquina", p_email: DEMO_EMAIL })
    if (rpcErr || !newId) return { ok: false, error: "Error creando tenant: " + rpcErr?.message }
    tenantId = newId

    // Datos del comercio demo
    await db.from("tenants").update({
      domicilio: "Av. San Martín 1250, Morón",
      condicion_iva: "monotributista",
      punto_venta: 1,
    }).eq("id", tenantId)
  }

  // 5 — Insertar catálogo completo con fotos
  const items = CATALOGO_KIOSCO.map((p) => ({
    tenant_id:    tenantId,
    producto:     p.producto,
    cantidad:     p.cantidad_inicial,
    precio_costo: p.precio_costo,
    precio_venta: p.precio_venta,
    categoria:    p.categoria,
    imagen_url:   eanToImageUrl(p.ean),
  }))

  // Batches de 50 para no saturar el request
  for (let i = 0; i < items.length; i += 50) {
    await db.from("stock").insert(items.slice(i, i + 50))
  }

  return { ok: true }
}
