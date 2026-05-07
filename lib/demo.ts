import { createClient } from "@/lib/supabase/client"

const DEMO_EMAIL = "demo@possaas.app"
const DEMO_PASS = "DemoPos2026!"

const DEMO_STOCK = [
  { producto:"Coca Cola 500ml",      cantidad:24, precio_costo:800,  precio_venta:1400 },
  { producto:"Agua mineral 500ml",   cantidad:30, precio_costo:350,  precio_venta:700  },
  { producto:"Alfajor triple",       cantidad:48, precio_costo:380,  precio_venta:700  },
  { producto:"Papas fritas 90g",     cantidad:20, precio_costo:550,  precio_venta:950  },
  { producto:"Chocolatín",           cantidad:60, precio_costo:180,  precio_venta:380  },
  { producto:"Cigarrillos Marlboro", cantidad:15, precio_costo:2200, precio_venta:3200 },
  { producto:"Sprite 1.5L",          cantidad:12, precio_costo:1100, precio_venta:1800 },
  { producto:"Sandwichito de miga",  cantidad:8,  precio_costo:900,  precio_venta:1600 },
]

export async function entrarComoDemo(): Promise<{ ok: boolean; error?: string }> {
  const db = createClient()

  // 1. Intentar login con la cuenta demo
  const { error: loginErr } = await db.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASS,
  })

  if (loginErr) {
    // 2. Si no existe, intentar crearla
    const { error: signupErr } = await db.auth.signUp({
      email: DEMO_EMAIL,
      password: DEMO_PASS,
    })

    // Si el signup falla por razón distinta a "ya existe", retornar error
    if (signupErr && !signupErr.message.toLowerCase().includes("already")) {
      return { ok: false, error: signupErr.message }
    }

    // Volver a loguearse (ya sea que se creó o ya existía)
    const { error: reloginErr } = await db.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASS,
    })
    if (reloginErr) return { ok: false, error: reloginErr.message }
  }

  // 3. Verificar si ya tiene tenant
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { ok: false, error: "No se pudo obtener el usuario" }

  const { data: existing } = await db
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single()

  if (existing?.tenant_id) return { ok: true }

  // 4. Crear tenant demo via RPC (bypasea RLS)
  const { data: tenantId, error: rpcErr } = await db
    .rpc("create_tenant_for_user", { p_nombre: "Comercio Demo", p_email: DEMO_EMAIL })

  if (rpcErr || !tenantId) {
    return { ok: false, error: "Error creando tenant demo: " + rpcErr?.message }
  }

  // 5. Poblar con stock de ejemplo
  await db.from("stock").insert(
    DEMO_STOCK.map((item) => ({ ...item, tenant_id: tenantId }))
  )

  return { ok: true }
}
