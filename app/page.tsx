"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Search, X, Loader2, Printer, MessageCircle, Minus, Plus, Trash2 } from "lucide-react"
import {
  getStock, realizarVenta, getTotalesHoy, getNombreComercio,
  getTenantInfo, siguienteNumeroComprobante,
  type StockItem, type MetodoPago, type DatosPago, type TenantInfo,
} from "@/lib/store"
import { AppShell } from "@/components/app-shell"
import { ProductGrid } from "@/components/pos/product-grid"
import { Cart, type CarritoItem } from "@/components/pos/cart"
import { PaymentDialog } from "@/components/pos/payment-dialog"
import { CategoryTabs, type CategoriaActiva } from "@/components/pos/category-tabs"

const SCAN_GAP_MS = 35

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return "Buenos días"
  if (h < 19) return "Buenas tardes"
  return "Buenas noches"
}

const getFecha = () =>
  new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })

export default function Home() {
  const [query, setQuery]                 = useState("")
  const [catalogo, setCatalogo]           = useState<StockItem[]>([])
  const [carrito, setCarrito]             = useState<CarritoItem[]>([])
  const [categoriaActiva, setCategoria]   = useState<CategoriaActiva>("Todas")
  const [ventasHoy, setVentasHoy]         = useState(0)
  const [nombreComercio, setNombre]       = useState("")
  const [tenantInfo, setTenantInfo]       = useState<TenantInfo | null>(null)
  const [mounted, setMounted]             = useState(false)
  const [procesando, setProcesando]       = useState(false)
  const [toast, setToast]                 = useState<{ msg: string; ok: boolean } | null>(null)

  // Modales
  const [carritoOpen, setCarritoOpen]     = useState(false)
  const [modalPagoOpen, setModalPago]     = useState(false)
  const [metodoPagoInicial, setMetodoI]   = useState<MetodoPago>("efectivo")
  const [modalTicket, setModalTicket]     = useState<{
    items: CarritoItem[]; total: number; metodo: MetodoPago
    efectivo: number; transferencia: number; fecha: string
    numeroComprobante: string; tipoComprobante: string; vuelto: number
  } | null>(null)

  const searchRef   = useRef<HTMLInputElement>(null)
  const lastKeyTime = useRef<number>(0)
  const isScanning  = useRef<boolean>(false)

  const focusSearch = useCallback(() => {
    requestAnimationFrame(() => searchRef.current?.focus())
  }, [])

  const refreshTotales = useCallback(async () => {
    const t = await getTotalesHoy()
    setVentasHoy(t.totalVentas)
  }, [])

  const refreshCatalogo = useCallback(async () => {
    const data = await getStock()
    setCatalogo(data)
  }, [])

  useEffect(() => {
    Promise.all([
      refreshTotales(),
      refreshCatalogo(),
      getNombreComercio().then(setNombre),
      getTenantInfo().then(setTenantInfo),
    ]).then(() => { setMounted(true); focusSearch() })
  }, [refreshTotales, refreshCatalogo, focusSearch])

  const toast_ = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 2800)
  }, [])

  // Grilla filtrada cliente-side — sin red, instantáneo
  const productosFiltrados = useMemo(() => {
    const base = query.trim()
      ? catalogo.filter((p) => p.producto.toLowerCase().includes(query.toLowerCase()))
      : catalogo
    if (categoriaActiva === "Todas") return base
    return base.filter((p) => (p.categoria ?? "Otros") === categoriaActiva)
  }, [catalogo, query, categoriaActiva])

  // Top 12 más vendidos (proxy: más stock = más movimiento)
  const favoritos = useMemo(
    () => [...catalogo].filter((p) => p.cantidad > 0).sort((a, b) => b.cantidad - a.cantidad).slice(0, 12),
    [catalogo],
  )

  // ─── Carrito ────────────────────────────────────────────────────────────────

  const agregarAlCarrito = useCallback(
    (producto: StockItem, cantidad = 1) => {
      if (producto.cantidad <= 0) { toast_(`${producto.producto} sin stock`, false); return }
      setCarrito((prev) => {
        const existe  = prev.find((it) => it.producto.id === producto.id)
        const actual  = existe?.cantidad ?? 0
        if (actual + cantidad > producto.cantidad) {
          toast_(`Stock máx: ${producto.cantidad}`, false)
          return prev
        }
        if (existe) return prev.map((it) => it.producto.id === producto.id ? { ...it, cantidad: it.cantidad + cantidad } : it)
        return [...prev, { producto, cantidad }]
      })
      toast_(`${producto.producto} agregado`)
    },
    [toast_],
  )

  const cambiarCantidad = useCallback((id: number, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((it) => {
          if (it.producto.id !== id) return it
          const nueva = Math.min(Math.max(it.cantidad + delta, 0), it.producto.cantidad)
          return { ...it, cantidad: nueva }
        })
        .filter((it) => it.cantidad > 0),
    )
  }, [])

  const eliminarItem   = useCallback((id: number) => setCarrito((prev) => prev.filter((it) => it.producto.id !== id)), [])
  const limpiarCarrito = useCallback(() => setCarrito([]), [])

  const totalCarrito = useMemo(
    () => carrito.reduce((a, i) => a + i.producto.precioVenta * i.cantidad, 0),
    [carrito],
  )

  // ─── Pago ───────────────────────────────────────────────────────────────────

  const abrirCobro = useCallback(
    (metodo: MetodoPago = "efectivo") => {
      if (carrito.length === 0) { toast_("Carrito vacío", false); return }
      setMetodoI(metodo)
      setCarritoOpen(false)
      setModalPago(true)
    },
    [carrito.length, toast_],
  )

  const finalizarVenta = useCallback(
    async (datosPago: DatosPago, recibido: number) => {
      if (procesando) return
      setProcesando(true)
      const itemsVendidos = [...carrito]
      const errores: string[] = []

      for (const item of carrito) {
        const r = await realizarVenta(item.producto.id, item.cantidad, datosPago)
        if (!r.success) errores.push(r.mensaje)
      }

      if (errores.length > 0) {
        setProcesando(false)
        toast_(errores[0], false)
        return
      }

      const [, , comprobante] = await Promise.all([
        refreshTotales(),
        refreshCatalogo(),
        siguienteNumeroComprobante(),
      ])

      const vuelto = datosPago.metodoPago === "efectivo" ? Math.max(0, recibido - totalCarrito) : 0

      setCarrito([])
      setModalPago(false)
      setModalTicket({
        items: itemsVendidos,
        total: totalCarrito,
        metodo: datosPago.metodoPago,
        efectivo: datosPago.montoEfectivo ?? 0,
        transferencia: datosPago.montoTransferencia ?? 0,
        fecha: new Date().toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        numeroComprobante: comprobante.numero,
        tipoComprobante: comprobante.tipo,
        vuelto,
      })
      setProcesando(false)
      focusSearch()
    },
    [carrito, totalCarrito, procesando, refreshTotales, refreshCatalogo, siguienteNumeroComprobante, toast_, focusSearch],
  )

  // ─── Barcode scanner ────────────────────────────────────────────────────────

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = performance.now()
    if (now - lastKeyTime.current < SCAN_GAP_MS) isScanning.current = true
    lastKeyTime.current = now

    if (e.key === "Enter") {
      e.preventDefault()
      const q = query.trim()
      if (!q) return
      const exacto =
        productosFiltrados.find((p) => p.producto.toLowerCase() === q.toLowerCase()) ??
        (productosFiltrados.length === 1 ? productosFiltrados[0] : null)
      if (exacto) {
        agregarAlCarrito(exacto, 1)
        setQuery("")
      } else if (isScanning.current) {
        toast_(`Sin match: ${q}`, false)
        setQuery("")
      }
      isScanning.current = false
      focusSearch()
    }
  }

  // ─── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modalPagoOpen) return
      if (e.key === "F2") { e.preventDefault(); abrirCobro("efectivo") }
      else if (e.key === "F3") { e.preventDefault(); abrirCobro("transferencia") }
      else if (e.key === "F4") { e.preventDefault(); abrirCobro("mixto") }
      else if (e.key === "Escape") {
        if (query) { setQuery(""); return }
        if (carrito.length > 0) { setCarrito((p) => p.slice(0, -1)); toast_("Último ítem removido") }
        focusSearch()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [modalPagoOpen, query, carrito.length, abrirCobro, toast_, focusSearch])

  useEffect(() => {
    if (mounted && !modalPagoOpen) focusSearch()
  }, [mounted, modalPagoOpen, focusSearch])

  // ─── Texto para ticket WhatsApp / impresión ──────────────────────────────────

  const textoTicket = () => {
    if (!modalTicket) return ""
    const l = "─".repeat(32)
    const comercio = nombreComercio || "Mi Comercio"
    const cuitLine = tenantInfo?.cuit ? `CUIT: ${tenantInfo.cuit}` : ""
    const domicilio = tenantInfo?.domicilio ?? ""
    const condicion = tenantInfo?.condicionIva === "responsable_inscripto" ? "Resp. Inscripto"
      : tenantInfo?.condicionIva === "excento" ? "Exento de IVA" : "Monotributista"
    const items = modalTicket.items.map((i) =>
      `${i.producto.producto} x${i.cantidad}  $${(i.producto.precioVenta * i.cantidad).toLocaleString("es-AR")}`
    ).join("\n")
    const pago = modalTicket.metodo === "efectivo" ? "Efectivo"
      : modalTicket.metodo === "transferencia" ? "Transferencia"
      : `Mixto: Ef $${modalTicket.efectivo.toLocaleString("es-AR")} / Tr $${modalTicket.transferencia.toLocaleString("es-AR")}`
    const header = [comercio, domicilio, cuitLine, condicion].filter(Boolean).join("\n")
    const vueltoLine = modalTicket.vuelto > 0 ? `\nVuelto: $${modalTicket.vuelto.toLocaleString("es-AR")}` : ""
    return `${header}\n${l}\n${modalTicket.tipoComprobante}\nN° ${modalTicket.numeroComprobante}\n${modalTicket.fecha}\n${l}\n${items}\n${l}\nTOTAL: $${modalTicket.total.toLocaleString("es-AR")}\nPago: ${pago}${vueltoLine}\n${l}\nGracias por su compra!`
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <div className="flex flex-col lg:flex-row min-h-[calc(100svh-4rem)]">

        {/* ─── Columna izquierda: productos ─────────────────────────── */}
        <section className="flex-1 flex flex-col min-w-0">

          {/* Hero verde — solo mobile */}
          <div className="lg:hidden bg-accent px-5 pt-8 pb-10">
            <p className="text-accent-foreground/70 text-sm mb-1 capitalize">{getFecha()}</p>
            <h1 className="font-display font-bold text-accent-foreground text-xl mb-4">
              {getGreeting()}, {nombreComercio || "Mi Comercio"} 👋
            </h1>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-accent-foreground/70 text-xs font-semibold uppercase tracking-wider mb-1">Vendido hoy</p>
                <p className="text-accent-foreground font-bold text-3xl tracking-tight">${ventasHoy.toLocaleString("es-AR")}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl select-none">💰</div>
            </div>
          </div>

          {/* Header sticky */}
          <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
            {/* Desktop: nombre + vendido hoy */}
            <div className="hidden lg:flex items-center justify-between mb-3">
              <h1 className="font-bold text-lg text-foreground truncate">{nombreComercio || "Punto de Venta"}</h1>
              <div className="bg-accent/10 border border-accent/20 rounded-xl px-3 py-1.5 text-right">
                <p className="text-[9px] uppercase font-bold tracking-widest text-accent/80 leading-none">Hoy</p>
                <p className="text-base font-bold text-accent leading-tight">${ventasHoy.toLocaleString("es-AR")}</p>
              </div>
            </div>

            {/* Barra de búsqueda */}
            <div className={`flex items-center rounded-xl border-2 bg-card px-4 h-12 gap-3 transition-all ${
              query ? "border-accent shadow-[0_0_0_3px_oklch(0.49_0.12_165/0.10)]" : "border-border"
            }`}>
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Buscar / escanear código de barras"
                autoComplete="off"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
              />
              {query && (
                <button onClick={() => { setQuery(""); focusSearch() }} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </header>

          {/* Category tabs */}
          <div className="px-4 pt-3 pb-1">
            <CategoryTabs activa={categoriaActiva} onChange={(c) => { setCategoria(c); focusSearch() }} />
          </div>

          {/* Favoritos — solo cuando no hay búsqueda y categoría = Todas */}
          {!query && favoritos.length > 0 && categoriaActiva === "Todas" && (
            <div className="px-4 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Favoritos</p>
              <ProductGrid productos={favoritos} onSelect={(p) => agregarAlCarrito(p, 1)} compact />
            </div>
          )}

          {/* Grid principal */}
          <div className="px-4 py-3 flex-1 pb-36 lg:pb-6">
            {query && productosFiltrados.length > 0 && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                {productosFiltrados.length} resultado{productosFiltrados.length !== 1 ? "s" : ""}
              </p>
            )}
            {!query && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Catálogo</p>
            )}

            {catalogo.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">📦</div>
                <p className="font-semibold text-sm text-foreground mb-1">No hay productos cargados</p>
                <a href="/stock" className="text-accent font-semibold text-sm underline">Ir a Stock →</a>
              </div>
            ) : productosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                {query ? `Sin resultados para "${query}"` : `No hay productos en esta categoría`}
              </div>
            ) : (
              <ProductGrid productos={productosFiltrados} onSelect={(p) => agregarAlCarrito(p, 1)} />
            )}
          </div>
        </section>

        {/* ─── Columna derecha: carrito desktop ─────────────────────── */}
        <aside className="hidden lg:flex lg:w-[400px] xl:w-[440px] border-l border-border bg-card flex-col sticky top-0 h-[calc(100svh-4rem)] overflow-hidden">
          <Cart
            items={carrito}
            total={totalCarrito}
            onChangeQty={cambiarCantidad}
            onRemove={eliminarItem}
            onClear={limpiarCarrito}
            onCobrar={() => abrirCobro("efectivo")}
          />
        </aside>
      </div>

      {/* ─── Botón flotante carrito (mobile) ────────────────────────── */}
      {carrito.length > 0 && (
        <div className="lg:hidden fixed bottom-20 left-4 right-4 z-30">
          <button
            onClick={() => setCarritoOpen(true)}
            className="w-full bg-accent text-accent-foreground font-bold py-4 rounded-2xl shadow-lg flex items-center justify-between px-5 hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <span>{carrito.reduce((a, i) => a + i.cantidad, 0)} productos</span>
            <span className="text-lg">${totalCarrito.toLocaleString("es-AR")}</span>
          </button>
        </div>
      )}

      {/* ─── Bottom sheet carrito (mobile) ──────────────────────────── */}
      {carritoOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end z-50"
          onClick={(e) => e.target === e.currentTarget && setCarritoOpen(false)}
        >
          <div className="bg-card border-t border-border w-full rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border shrink-0">
              <h2 className="font-bold text-foreground">Tu carrito</h2>
              <button onClick={() => setCarritoOpen(false)} className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-muted-foreground hover:bg-border">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border px-4">
              {carrito.map((it) => (
                <div key={it.producto.id} className="flex items-center py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{it.producto.producto}</p>
                    <p className="text-xs text-muted-foreground">${it.producto.precioVenta.toLocaleString("es-AR")} c/u</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => cambiarCantidad(it.producto.id, -1)} className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center active:scale-95">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center font-bold text-sm">{it.cantidad}</span>
                    <button onClick={() => cambiarCantidad(it.producto.id, 1)} className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center active:scale-95">
                      <Plus className="w-3 h-3" />
                    </button>
                    <p className="font-bold text-sm text-accent w-[60px] text-right">${(it.producto.precioVenta * it.cantidad).toLocaleString("es-AR")}</p>
                    <button onClick={() => eliminarItem(it.producto.id)} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-4 border-t border-border bg-secondary/40 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-foreground">${totalCarrito.toLocaleString("es-AR")}</p>
              </div>
              <button onClick={() => abrirCobro("efectivo")} className="w-full bg-accent text-accent-foreground font-bold py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all text-base mb-2">
                COBRAR ${totalCarrito.toLocaleString("es-AR")}
              </button>
              <button onClick={() => { limpiarCarrito(); setCarritoOpen(false) }} className="w-full border border-border text-muted-foreground font-medium py-3 rounded-2xl hover:bg-secondary transition-colors text-sm">
                Limpiar carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Payment dialog ───────────────────────────────────────────── */}
      {modalPagoOpen && (
        <PaymentDialog
          total={totalCarrito}
          metodoInicial={metodoPagoInicial}
          procesando={procesando}
          mpLink={tenantInfo?.mercadoPagoLink}
          onCancel={() => { setModalPago(false); focusSearch() }}
          onConfirm={finalizarVenta}
        />
      )}

      {/* ─── Modal ticket / comprobante ──────────────────────────────── */}
      {modalTicket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex flex-col items-center mb-5">
              <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center mb-3 text-2xl">✅</div>
              <p className="font-display text-lg font-bold text-foreground">¡Venta registrada!</p>
              {modalTicket.vuelto > 0 && (
                <div className="mt-2 bg-accent/10 border border-accent/30 rounded-xl px-4 py-2 text-center">
                  <p className="text-xs text-accent/80 font-semibold uppercase tracking-wide">Vuelto</p>
                  <p className="text-2xl font-bold text-accent">${modalTicket.vuelto.toLocaleString("es-AR")}</p>
                </div>
              )}
            </div>

            {/* Comprobante */}
            <div className="bg-secondary rounded-xl p-4 font-mono text-xs text-foreground mb-4 space-y-1">
              <p className="font-bold text-center text-sm">{nombreComercio || "Mi Comercio"}</p>
              {tenantInfo?.domicilio && <p className="text-center text-muted-foreground">{tenantInfo.domicilio}</p>}
              {tenantInfo?.cuit && <p className="text-center text-muted-foreground">CUIT: {tenantInfo.cuit}</p>}
              <p className="text-center text-muted-foreground">
                {tenantInfo?.condicionIva === "responsable_inscripto" ? "Responsable Inscripto"
                  : tenantInfo?.condicionIva === "excento" ? "Exento de IVA" : "Monotributista"}
              </p>
              <div className="border-t border-border my-2" />
              <p className="text-center font-bold text-sm">{modalTicket.tipoComprobante}</p>
              <p className="text-center text-muted-foreground">N° {modalTicket.numeroComprobante}</p>
              <p className="text-center text-muted-foreground">{modalTicket.fecha}</p>
              <div className="border-t border-border my-2" />
              {modalTicket.items.map((item) => (
                <div key={item.producto.id} className="flex justify-between gap-2">
                  <span className="truncate">{item.producto.producto} x{item.cantidad}</span>
                  <span className="font-semibold shrink-0">${(item.producto.precioVenta * item.cantidad).toLocaleString("es-AR")}</span>
                </div>
              ))}
              <div className="border-t border-border my-2" />
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL</span>
                <span>${modalTicket.total.toLocaleString("es-AR")}</span>
              </div>
              <p className="text-muted-foreground mt-1">
                Pago: {modalTicket.metodo === "efectivo" ? "Efectivo"
                  : modalTicket.metodo === "transferencia" ? "Transferencia"
                  : `Mixto — Ef $${modalTicket.efectivo.toLocaleString("es-AR")} / Tr $${modalTicket.transferencia.toLocaleString("es-AR")}`}
              </p>
            </div>

            <div className="flex gap-3 mb-3">
              <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 border border-border text-foreground font-semibold py-3 rounded-xl hover:bg-secondary transition-colors text-sm">
                <Printer className="w-4 h-4" /> Imprimir
              </button>
              <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(textoTicket())}`, "_blank")}
                className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold py-3 rounded-xl hover:opacity-90 text-sm"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </button>
            </div>
            <button onClick={() => { setModalTicket(null); focusSearch() }} className="w-full border border-border text-muted-foreground font-medium py-3 rounded-xl hover:bg-secondary transition-colors text-sm">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Ticket oculto para impresión */}
      {modalTicket && (
        <div id="ticket-impresion" style={{ display: "none" }}>
          <p style={{ fontWeight: "bold", textAlign: "center", fontSize: "15px" }}>{nombreComercio || "Mi Comercio"}</p>
          {tenantInfo?.domicilio && <p style={{ textAlign: "center", fontSize: "12px" }}>{tenantInfo.domicilio}</p>}
          {tenantInfo?.cuit && <p style={{ textAlign: "center", fontSize: "12px" }}>CUIT: {tenantInfo.cuit}</p>}
          <p style={{ textAlign: "center", fontSize: "12px", marginBottom: "6px" }}>
            {tenantInfo?.condicionIva === "responsable_inscripto" ? "Responsable Inscripto"
              : tenantInfo?.condicionIva === "excento" ? "Exento de IVA" : "Monotributista"}
          </p>
          <p>{"─".repeat(32)}</p>
          <p style={{ fontWeight: "bold", textAlign: "center" }}>{modalTicket.tipoComprobante}</p>
          <p style={{ textAlign: "center" }}>N° {modalTicket.numeroComprobante}</p>
          <p style={{ textAlign: "center", marginBottom: "6px" }}>{modalTicket.fecha}</p>
          <p>{"─".repeat(32)}</p>
          {modalTicket.items.map((item) => (
            <div key={item.producto.id} style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{item.producto.producto} x{item.cantidad}</span>
              <span>${(item.producto.precioVenta * item.cantidad).toLocaleString("es-AR")}</span>
            </div>
          ))}
          <p>{"─".repeat(32)}</p>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
            <span>TOTAL</span><span>${modalTicket.total.toLocaleString("es-AR")}</span>
          </div>
          {modalTicket.vuelto > 0 && (
            <p style={{ marginTop: "4px" }}>Vuelto: ${modalTicket.vuelto.toLocaleString("es-AR")}</p>
          )}
          <p style={{ textAlign: "center", marginTop: "12px" }}>Gracias por su compra!</p>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-28 lg:bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl shadow-2xl z-[60] font-semibold text-sm border-2 max-w-[90vw] whitespace-nowrap ${
          toast.ok ? "bg-accent text-accent-foreground border-accent" : "bg-destructive text-destructive-foreground border-destructive"
        }`} role="status">
          {toast.msg}
        </div>
      )}
    </AppShell>
  )
}
