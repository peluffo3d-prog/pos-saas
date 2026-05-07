import { createClient } from "@/lib/supabase/client"
import { type CategoriaKiosco, CATALOGO_KIOSCO } from "@/lib/catalogos/kiosco"

export interface StockItem {
  id: number
  producto: string
  cantidad: number
  precioCosto: number
  precioVenta: number
  fecha: string
  imagenUrl?: string
  categoria?: CategoriaKiosco
}

export type MetodoPago = "efectivo" | "transferencia" | "mixto"

export interface Venta {
  id: number
  producto: string
  cantidad: number
  totalVenta: number
  costo: number
  ganancia: number
  fecha: string
  metodoPago?: MetodoPago
  montoEfectivo?: number
  montoTransferencia?: number
}

export interface CierreCaja {
  id: number
  fecha: string
  totalVentas: number
  totalCostos: number
  totalGanancias: number
  cantidadVentas: number
  efectivo: number
  transferencia: number
}

export interface DatosPago {
  metodoPago: MetodoPago
  montoEfectivo?: number
  montoTransferencia?: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function supabase() {
  return createClient()
}

async function getTenantId(): Promise<string | null> {
  const db = supabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return null

  const { data } = await db
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single()

  return data?.tenant_id ?? null
}

function toDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}, ${d.toLocaleTimeString("es-AR")}`
}

function todayDateStr(): string {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`
}

export async function getCantidadProductosBajos(umbral = 5): Promise<number> {
  const items = await getStock()
  return items.filter((p) => p.cantidad <= umbral).length
}

export async function getNombreComercio(): Promise<string> {
  const tenantId = await getTenantId()
  if (!tenantId) return ""

  const { data } = await supabase()
    .from("tenants")
    .select("nombre")
    .eq("id", tenantId)
    .single()

  return data?.nombre ?? ""
}

// ─── Tenant / Fiscal ─────────────────────────────────────────────────────────

export interface TenantInfo {
  id: string
  nombre: string
  cuit?: string
  condicionIva?: string
  domicilio?: string
  puntoVenta: number
  ultimoNumeroComprobante: number
}

export async function getTenantInfo(): Promise<TenantInfo | null> {
  const tenantId = await getTenantId()
  if (!tenantId) return null

  const { data } = await supabase()
    .from("tenants")
    .select("id, nombre, cuit, condicion_iva, domicilio, punto_venta, ultimo_numero_comprobante")
    .eq("id", tenantId)
    .single()

  if (!data) return null
  return {
    id: data.id,
    nombre: data.nombre,
    cuit: data.cuit ?? undefined,
    condicionIva: data.condicion_iva ?? undefined,
    domicilio: data.domicilio ?? undefined,
    puntoVenta: data.punto_venta ?? 1,
    ultimoNumeroComprobante: data.ultimo_numero_comprobante ?? 0,
  }
}

export async function actualizarTenant(datos: {
  nombre?: string
  cuit?: string
  condicionIva?: string
  domicilio?: string
  puntoVenta?: number
}): Promise<void> {
  const tenantId = await getTenantId()
  if (!tenantId) return

  await supabase()
    .from("tenants")
    .update({
      ...(datos.nombre !== undefined && { nombre: datos.nombre }),
      ...(datos.cuit !== undefined && { cuit: datos.cuit }),
      ...(datos.condicionIva !== undefined && { condicion_iva: datos.condicionIva }),
      ...(datos.domicilio !== undefined && { domicilio: datos.domicilio }),
      ...(datos.puntoVenta !== undefined && { punto_venta: datos.puntoVenta }),
    })
    .eq("id", tenantId)
}

export async function siguienteNumeroComprobante(): Promise<{ numero: string; tipo: string }> {
  const tenantId = await getTenantId()
  if (!tenantId) return { numero: "0001-00000001", tipo: "Comprobante C" }

  const { data } = await supabase()
    .from("tenants")
    .select("punto_venta, ultimo_numero_comprobante, condicion_iva")
    .eq("id", tenantId)
    .single()

  const puntoVenta = data?.punto_venta ?? 1
  const nuevoNumero = (data?.ultimo_numero_comprobante ?? 0) + 1

  await supabase()
    .from("tenants")
    .update({ ultimo_numero_comprobante: nuevoNumero })
    .eq("id", tenantId)

  const pv = String(puntoVenta).padStart(4, "0")
  const num = String(nuevoNumero).padStart(8, "0")
  const condicion = data?.condicion_iva ?? "monotributista"
  const tipo = condicion === "responsable_inscripto" ? "Comprobante B" : "Comprobante C"

  return { numero: `${pv}-${num}`, tipo }
}

// ─── Stock ──────────────────────────────────────────────────────────────────

export async function getStock(): Promise<StockItem[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []

  const { data } = await supabase()
    .from("stock")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  return (data ?? []).map((r) => ({
    id: r.id,
    producto: r.producto,
    cantidad: r.cantidad,
    precioCosto: r.precio_costo,
    precioVenta: r.precio_venta,
    fecha: toDate(r.updated_at ?? r.created_at),
    imagenUrl: r.imagen_url ?? undefined,
    categoria: r.categoria ?? undefined,
  }))
}

export async function subirImagenProducto(id: number, file: File): Promise<string | null> {
  const tenantId = await getTenantId()
  if (!tenantId) return null

  const ext = file.name.split(".").pop() ?? "jpg"
  const path = `${tenantId}/${id}.${ext}`

  const { error } = await supabase()
    .storage
    .from("product-images")
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) return null

  const { data } = supabase()
    .storage
    .from("product-images")
    .getPublicUrl(path)

  return data.publicUrl
}

export async function actualizarImagenProducto(id: number, imagenUrl: string): Promise<void> {
  const tenantId = await getTenantId()
  if (!tenantId) return

  await supabase()
    .from("stock")
    .update({ imagen_url: imagenUrl, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId)
}

export async function agregarProductoStock(
  item: Omit<StockItem, "id" | "fecha">
): Promise<StockItem[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []
  const db = supabase()

  // Buscar si ya existe el producto (case-insensitive)
  const { data: existente } = await db
    .from("stock")
    .select("id, cantidad")
    .eq("tenant_id", tenantId)
    .ilike("producto", item.producto)
    .single()

  if (existente) {
    await db
      .from("stock")
      .update({
        cantidad: existente.cantidad + item.cantidad,
        precio_costo: item.precioCosto,
        precio_venta: item.precioVenta,
        ...(item.categoria !== undefined && { categoria: item.categoria }),
        ...(item.imagenUrl !== undefined && { imagen_url: item.imagenUrl }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existente.id)
  } else {
    await db.from("stock").insert({
      tenant_id: tenantId,
      producto: item.producto,
      cantidad: item.cantidad,
      precio_costo: item.precioCosto,
      precio_venta: item.precioVenta,
      categoria: item.categoria ?? null,
      imagen_url: item.imagenUrl ?? null,
    })
  }

  return getStock()
}

export async function precargarCatalogoKiosco(
  categorias: CategoriaKiosco[]
): Promise<void> {
  const tenantId = await getTenantId()
  if (!tenantId) return

  const productos = CATALOGO_KIOSCO.filter((p) => categorias.includes(p.categoria))
  if (productos.length === 0) return

  await supabase()
    .from("stock")
    .insert(
      productos.map((p) => ({
        tenant_id: tenantId,
        producto: p.producto,
        cantidad: p.cantidad_inicial,
        precio_costo: p.precio_costo,
        precio_venta: p.precio_venta,
        categoria: p.categoria,
      }))
    )
}

export async function eliminarProductoStock(id: number): Promise<StockItem[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []

  await supabase().from("stock").delete().eq("id", id).eq("tenant_id", tenantId)
  return getStock()
}

export async function ajustarCantidadStock(id: number, nuevaCantidad: number): Promise<void> {
  const tenantId = await getTenantId()
  if (!tenantId) return

  await supabase()
    .from("stock")
    .update({ cantidad: nuevaCantidad, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId)
}

export async function buscarProductos(query: string): Promise<StockItem[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []

  const { data } = await supabase()
    .from("stock")
    .select("*")
    .eq("tenant_id", tenantId)
    .ilike("producto", `%${query}%`)
    .order("producto")

  return (data ?? []).map((r) => ({
    id: r.id,
    producto: r.producto,
    cantidad: r.cantidad,
    precioCosto: r.precio_costo,
    precioVenta: r.precio_venta,
    fecha: toDate(r.updated_at ?? r.created_at),
    imagenUrl: r.imagen_url ?? undefined,
    categoria: r.categoria ?? undefined,
  }))
}

// ─── Ventas ─────────────────────────────────────────────────────────────────

export async function getVentas(): Promise<Venta[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []

  const { data } = await supabase()
    .from("ventas")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("fecha", { ascending: false })

  return (data ?? []).map((r) => ({
    id: r.id,
    producto: r.producto,
    cantidad: r.cantidad,
    totalVenta: r.total_venta,
    costo: r.costo,
    ganancia: r.ganancia,
    fecha: toDate(r.fecha),
    metodoPago: r.metodo_pago,
    montoEfectivo: r.monto_efectivo,
    montoTransferencia: r.monto_transferencia,
  }))
}

export async function getVentasHoy(): Promise<Venta[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []

  const hoy = todayDateStr()

  const { data } = await supabase()
    .from("ventas")
    .select("*")
    .eq("tenant_id", tenantId)
    .gte("fecha", `${hoy}T00:00:00`)
    .lte("fecha", `${hoy}T23:59:59`)
    .order("fecha", { ascending: false })

  return (data ?? []).map((r) => ({
    id: r.id,
    producto: r.producto,
    cantidad: r.cantidad,
    totalVenta: r.total_venta,
    costo: r.costo,
    ganancia: r.ganancia,
    fecha: toDate(r.fecha),
    metodoPago: r.metodo_pago,
    montoEfectivo: r.monto_efectivo,
    montoTransferencia: r.monto_transferencia,
  }))
}

export async function getTotalesHoy() {
  const ventasHoy = await getVentasHoy()
  return {
    totalVentas: ventasHoy.reduce((acc, v) => acc + v.totalVenta, 0),
    totalCostos: ventasHoy.reduce((acc, v) => acc + v.costo, 0),
    totalGanancias: ventasHoy.reduce((acc, v) => acc + v.ganancia, 0),
    cantidadVentas: ventasHoy.length,
  }
}

export async function eliminarVenta(id: number): Promise<void> {
  const tenantId = await getTenantId()
  if (!tenantId) return

  await supabase().from("ventas").delete().eq("id", id).eq("tenant_id", tenantId)
}

export interface DatosEditarVenta {
  metodoPago: MetodoPago
  montoEfectivo: number
  montoTransferencia: number
}

export async function editarVenta(id: number, datos: DatosEditarVenta): Promise<void> {
  const tenantId = await getTenantId()
  if (!tenantId) return

  await supabase()
    .from("ventas")
    .update({
      metodo_pago: datos.metodoPago,
      monto_efectivo: datos.montoEfectivo,
      monto_transferencia: datos.montoTransferencia,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId)
}

export async function realizarVenta(
  productoId: number,
  cantidadVender: number,
  datosPago: DatosPago
): Promise<{ success: boolean; mensaje: string }> {
  const tenantId = await getTenantId()
  if (!tenantId) return { success: false, mensaje: "No autenticado" }
  const db = supabase()

  // Leer producto actual
  const { data: producto } = await db
    .from("stock")
    .select("*")
    .eq("id", productoId)
    .eq("tenant_id", tenantId)
    .single()

  if (!producto) return { success: false, mensaje: "Producto no encontrado" }
  if (producto.cantidad < cantidadVender) {
    return { success: false, mensaje: `Stock insuficiente. Disponible: ${producto.cantidad}` }
  }

  const nuevaCantidad = producto.cantidad - cantidadVender

  // Descontar stock (eliminar si llega a 0)
  if (nuevaCantidad === 0) {
    await db.from("stock").delete().eq("id", productoId)
  } else {
    await db
      .from("stock")
      .update({ cantidad: nuevaCantidad, updated_at: new Date().toISOString() })
      .eq("id", productoId)
  }

  // Registrar venta
  const totalVenta = producto.precio_venta * cantidadVender
  const costoTotal = producto.precio_costo * cantidadVender

  await db.from("ventas").insert({
    tenant_id: tenantId,
    producto: producto.producto,
    cantidad: cantidadVender,
    total_venta: totalVenta,
    costo: costoTotal,
    ganancia: totalVenta - costoTotal,
    metodo_pago: datosPago.metodoPago,
    monto_efectivo: datosPago.montoEfectivo ?? 0,
    monto_transferencia: datosPago.montoTransferencia ?? 0,
    fecha: new Date().toISOString(),
  })

  return { success: true, mensaje: `Venta realizada: ${cantidadVender}x ${producto.producto}` }
}

// ─── Cierre de caja ──────────────────────────────────────────────────────────

export async function getCierres(): Promise<CierreCaja[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []

  const { data } = await supabase()
    .from("cierres_caja")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("fecha", { ascending: false })

  return (data ?? []).map((r) => ({
    id: r.id,
    fecha: r.fecha.split("-").reverse().join("/"),
    totalVentas: r.total_ventas,
    totalCostos: r.total_costos,
    totalGanancias: r.total_ganancias,
    cantidadVentas: r.cantidad_ventas,
    efectivo: r.efectivo,
    transferencia: r.transferencia,
  }))
}

export async function cerrarCajaHoy(): Promise<{ success: boolean; mensaje: string; cierre?: CierreCaja }> {
  const tenantId = await getTenantId()
  if (!tenantId) return { success: false, mensaje: "No autenticado" }
  const db = supabase()

  const ventasHoy = await getVentasHoy()
  if (ventasHoy.length === 0) return { success: false, mensaje: "No hay ventas para cerrar hoy" }

  const hoy = todayDateStr()

  const { data: yaExiste } = await db
    .from("cierres_caja")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("fecha", hoy)
    .single()

  if (yaExiste) return { success: false, mensaje: "Ya se cerró la caja hoy" }

  const totalVentas = ventasHoy.reduce((acc, v) => acc + v.totalVenta, 0)
  const totalCostos = ventasHoy.reduce((acc, v) => acc + v.costo, 0)
  const totalGanancias = ventasHoy.reduce((acc, v) => acc + v.ganancia, 0)

  let efectivo = 0
  let transferencia = 0
  ventasHoy.forEach((v) => {
    if (v.metodoPago === "efectivo") efectivo += v.totalVenta
    else if (v.metodoPago === "transferencia") transferencia += v.totalVenta
    else if (v.metodoPago === "mixto") {
      efectivo += v.montoEfectivo ?? 0
      transferencia += v.montoTransferencia ?? 0
    }
  })

  const { data: nuevoCierre, error } = await db
    .from("cierres_caja")
    .insert({
      tenant_id: tenantId,
      fecha: hoy,
      total_ventas: totalVentas,
      total_costos: totalCostos,
      total_ganancias: totalGanancias,
      cantidad_ventas: ventasHoy.length,
      efectivo,
      transferencia,
    })
    .select()
    .single()

  if (error) return { success: false, mensaje: "Error al cerrar la caja" }

  // Borrar ventas del día — la caja queda en cero para mañana
  await db
    .from("ventas")
    .delete()
    .eq("tenant_id", tenantId)
    .gte("fecha", `${hoy}T00:00:00`)
    .lte("fecha", `${hoy}T23:59:59`)

  return {
    success: true,
    mensaje: "Caja cerrada exitosamente",
    cierre: {
      id: nuevoCierre.id,
      fecha: hoy.split("-").reverse().join("/"),
      totalVentas,
      totalCostos,
      totalGanancias,
      cantidadVentas: ventasHoy.length,
      efectivo,
      transferencia,
    },
  }
}

export async function getCierresMes(mes: number, anio: number): Promise<CierreCaja[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []

  const desde = `${anio}-${String(mes).padStart(2, "0")}-01`
  const hasta = `${anio}-${String(mes).padStart(2, "0")}-31`

  const { data } = await supabase()
    .from("cierres_caja")
    .select("*")
    .eq("tenant_id", tenantId)
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: false })

  return (data ?? []).map((r) => ({
    id: r.id,
    fecha: r.fecha.split("-").reverse().join("/"),
    totalVentas: r.total_ventas,
    totalCostos: r.total_costos,
    totalGanancias: r.total_ganancias,
    cantidadVentas: r.cantidad_ventas,
    efectivo: r.efectivo,
    transferencia: r.transferencia,
  }))
}

export async function getTotalesMes(mes: number, anio: number) {
  const cierresMes = await getCierresMes(mes, anio)
  return {
    totalVentas: cierresMes.reduce((acc, c) => acc + c.totalVentas, 0),
    totalCostos: cierresMes.reduce((acc, c) => acc + c.totalCostos, 0),
    totalGanancias: cierresMes.reduce((acc, c) => acc + c.totalGanancias, 0),
    totalEfectivo: cierresMes.reduce((acc, c) => acc + c.efectivo, 0),
    totalTransferencia: cierresMes.reduce((acc, c) => acc + c.transferencia, 0),
    cantidadVentas: cierresMes.reduce((acc, c) => acc + c.cantidadVentas, 0),
    diasCerrados: cierresMes.length,
  }
}

export async function eliminarCierre(id: number): Promise<CierreCaja[]> {
  const tenantId = await getTenantId()
  if (!tenantId) return []

  await supabase().from("cierres_caja").delete().eq("id", id).eq("tenant_id", tenantId)
  return getCierres()
}

export interface DatosEditarCierre {
  totalVentas: number
  totalCostos: number
  totalGanancias: number
  efectivo: number
  transferencia: number
}

export async function editarCierre(id: number, datos: DatosEditarCierre): Promise<void> {
  const tenantId = await getTenantId()
  if (!tenantId) return

  await supabase()
    .from("cierres_caja")
    .update({
      total_ventas: datos.totalVentas,
      total_costos: datos.totalCostos,
      total_ganancias: datos.totalGanancias,
      efectivo: datos.efectivo,
      transferencia: datos.transferencia,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId)
}
