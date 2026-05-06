"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Minus, Plus, Trash2, X, Loader2, Printer, MessageCircle } from "lucide-react"
import { buscarProductos, realizarVenta, getTotalesHoy, getNombreComercio, type StockItem, type MetodoPago, type DatosPago } from "@/lib/store"
import { AppShell } from "@/components/app-shell"

type CarritoItem = {
  producto: StockItem
  cantidad: number
}

export default function Home() {
  const [query, setQuery] = useState("")
  const [resultados, setResultados] = useState<StockItem[]>([])
  const [carrito, setCarrito] = useState<CarritoItem[]>([])
  const [toast, setToast] = useState<{ mensaje: string; error: boolean } | null>(null)
  const [ventasHoy, setVentasHoy] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [productoSeleccionado, setProductoSeleccionado] = useState<StockItem | null>(null)
  const [cantidadModal, setCantidadModal] = useState(1)
  const [modalPagoOpen, setModalPagoOpen] = useState(false)
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo")
  const [montoEfectivo, setMontoEfectivo] = useState(0)
  const [montoTransferencia, setMontoTransferencia] = useState(0)
  const [modalTicketOpen, setModalTicketOpen] = useState(false)
  const [ticketData, setTicketData] = useState<{ items: CarritoItem[]; total: number; metodo: MetodoPago; efectivo: number; transferencia: number; fecha: string } | null>(null)
  const [nombreComercio, setNombreComercio] = useState("")

  const refreshTotales = useCallback(async () => {
    const totales = await getTotalesHoy()
    setVentasHoy(totales.totalVentas)
  }, [])

  useEffect(() => {
    Promise.all([
      refreshTotales(),
      getNombreComercio().then(setNombreComercio),
    ]).then(() => setMounted(true))
  }, [refreshTotales])

  useEffect(() => {
    if (!query.trim()) { setResultados([]); return }
    const timer = setTimeout(async () => {
      const productos = await buscarProductos(query)
      setResultados(productos)
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  const mostrarToast = (mensaje: string, error = false) => {
    setToast({ mensaje, error })
    setTimeout(() => setToast(null), 2800)
  }

  const abrirModal = (producto: StockItem) => {
    setProductoSeleccionado(producto)
    setCantidadModal(1)
    setModalOpen(true)
    setQuery("")
    setResultados([])
  }

  const cerrarModal = () => { setModalOpen(false); setProductoSeleccionado(null) }

  const setPreset = (n: number) => {
    if (!productoSeleccionado) return
    const qty = Math.min(n, productoSeleccionado.cantidad)
    setCantidadModal(qty)
    confirmarAgregar(qty)
  }

  const spinCantidad = (delta: number) => {
    if (!productoSeleccionado) return
    setCantidadModal((prev) => Math.max(1, Math.min(prev + delta, productoSeleccionado.cantidad)))
  }

  const confirmarAgregar = (cantidadOverride?: number) => {
    if (!productoSeleccionado) return
    const cantidad = cantidadOverride ?? cantidadModal
    const enCarrito = carrito.find((item) => item.producto.id === productoSeleccionado.id)
    const cantidadActual = enCarrito ? enCarrito.cantidad : 0

    if (cantidadActual + cantidad > productoSeleccionado.cantidad) {
      mostrarToast(`Stock insuficiente. Hay ${productoSeleccionado.cantidad}, ya tenés ${cantidadActual} en carrito`, true)
      return
    }

    setCarrito((prev) => {
      const existe = prev.find((item) => item.producto.id === productoSeleccionado.id)
      if (existe) {
        return prev.map((item) =>
          item.producto.id === productoSeleccionado.id
            ? { ...item, cantidad: item.cantidad + cantidad }
            : item
        )
      }
      return [...prev, { producto: productoSeleccionado, cantidad }]
    })

    mostrarToast(`${productoSeleccionado.producto} x${cantidad} agregado`)
    cerrarModal()
  }

  const actualizarCantidadCarrito = (id: number, delta: number) => {
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.producto.id === id) {
          const nuevaCantidad = Math.max(1, Math.min(item.cantidad + delta, item.producto.cantidad))
          return { ...item, cantidad: nuevaCantidad }
        }
        return item
      })
    )
  }

  const eliminarDelCarrito = (id: number) => {
    setCarrito((prev) => prev.filter((item) => item.producto.id !== id))
  }

  const totalCarrito = carrito.reduce((acc, item) => acc + item.producto.precioVenta * item.cantidad, 0)

  const abrirModalPago = () => {
    setMetodoPago("efectivo")
    setMontoEfectivo(totalCarrito)
    setMontoTransferencia(0)
    setModalPagoOpen(true)
  }

  const handleMetodoPagoChange = (metodo: MetodoPago) => {
    setMetodoPago(metodo)
    if (metodo === "efectivo") { setMontoEfectivo(totalCarrito); setMontoTransferencia(0) }
    else if (metodo === "transferencia") { setMontoEfectivo(0); setMontoTransferencia(totalCarrito) }
    else { const mitad = Math.floor(totalCarrito / 2); setMontoEfectivo(mitad); setMontoTransferencia(totalCarrito - mitad) }
  }

  const handleMontoEfectivoChange = (valor: number) => {
    const efectivo = Math.min(Math.max(0, valor), totalCarrito)
    setMontoEfectivo(efectivo)
    setMontoTransferencia(totalCarrito - efectivo)
  }

  const handleMontoTransferenciaChange = (valor: number) => {
    const transferencia = Math.min(Math.max(0, valor), totalCarrito)
    setMontoTransferencia(transferencia)
    setMontoEfectivo(totalCarrito - transferencia)
  }

  const finalizarVenta = async () => {
    const datosPago: DatosPago = {
      metodoPago,
      montoEfectivo: metodoPago === "transferencia" ? 0 : montoEfectivo,
      montoTransferencia: metodoPago === "efectivo" ? 0 : montoTransferencia,
    }

    const itemsVendidos = [...carrito]
    const errores: string[] = []
    for (const item of carrito) {
      const resultado = await realizarVenta(item.producto.id, item.cantidad, datosPago)
      if (!resultado.success) errores.push(resultado.mensaje)
    }

    if (errores.length > 0) {
      mostrarToast(errores.join(", "), true)
      return
    }

    await refreshTotales()
    setModalPagoOpen(false)
    setTicketData({
      items: itemsVendidos,
      total: totalCarrito,
      metodo: metodoPago,
      efectivo: metodoPago === "transferencia" ? 0 : montoEfectivo,
      transferencia: metodoPago === "efectivo" ? 0 : montoTransferencia,
      fecha: new Date().toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    })
    setModalTicketOpen(true)
    setCarrito([])
  }

  const generarTextoTicket = () => {
    if (!ticketData) return ""
    const linea = "─".repeat(28)
    const items = ticketData.items.map((i) =>
      `${i.producto.producto} x${i.cantidad}  $${(i.producto.precioVenta * i.cantidad).toLocaleString("es-AR")}`
    ).join("\n")
    const metodoPagoTexto =
      ticketData.metodo === "efectivo" ? "Efectivo" :
      ticketData.metodo === "transferencia" ? "Transferencia" :
      `Mixto: Ef $${ticketData.efectivo.toLocaleString("es-AR")} / Tr $${ticketData.transferencia.toLocaleString("es-AR")}`
    return `${nombreComercio || "Mi Comercio"}\n${ticketData.fecha}\n${linea}\n${items}\n${linea}\nTOTAL: $${ticketData.total.toLocaleString("es-AR")}\nPago: ${metodoPagoTexto}\n${linea}\nGracias por su compra!`
  }

  const handleImprimir = () => window.print()

  const handleWhatsApp = () => {
    const texto = generarTextoTicket()
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank")
  }

  const getBadgeStock = (cantidad: number) => {
    if (cantidad <= 0) return { clase: "bg-destructive/20 text-destructive", texto: "Agotado" }
    if (cantidad <= 5) return { clase: "bg-warning/20 text-warning", texto: "Bajo" }
    return { clase: "bg-accent/20 text-accent", texto: "OK" }
  }

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    )
  }

  return (
    <AppShell>
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          <h1 className="font-display font-bold text-foreground text-lg">Punto de Venta</h1>
          <div className="bg-accent/10 border border-accent/20 rounded-xl px-3 py-1.5 text-center min-w-[80px]">
            <p className="text-[10px] uppercase text-accent/70 font-bold tracking-widest leading-none mb-0.5">Hoy</p>
            <p className="text-sm font-bold text-accent leading-tight">${ventasHoy.toLocaleString("es-AR")}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-xl mx-auto w-full">
        {/* Search */}
        <div className="relative mb-4">
          <div className={`flex items-center rounded-xl border bg-card px-4 py-3.5 gap-3 transition-all ${query ? "border-accent shadow-[0_0_0_3px_oklch(0.83_0.17_163/0.12)]" : "border-border hover:border-muted-foreground/30"}`}>
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 border-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
              placeholder="Buscar producto por nombre..."
              autoComplete="off"
            />
            {query && (
              <button onClick={() => { setQuery(""); setResultados([]) }} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results dropdown */}
          {resultados.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-xl overflow-hidden shadow-2xl z-50">
              {resultados.map((producto) => {
                const badge = getBadgeStock(producto.cantidad)
                const sinStock = producto.cantidad <= 0
                const enCarrito = carrito.find((c) => c.producto.id === producto.id)
                return (
                  <button
                    key={producto.id}
                    onClick={() => !sinStock && abrirModal(producto)}
                    disabled={sinStock}
                    className={`w-full p-4 border-b border-border last:border-b-0 flex justify-between items-center text-left transition-colors ${sinStock ? "opacity-40 cursor-not-allowed" : "hover:bg-secondary"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground text-sm flex items-center gap-2 flex-wrap">
                        {producto.producto}
                        {enCarrito && (
                          <span className="bg-accent/20 text-accent text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {enCarrito.cantidad} en carrito
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        Stock: {producto.cantidad}
                        <span className={`px-1.5 py-0.5 rounded-full font-semibold text-[10px] ${badge.clase}`}>{badge.texto}</span>
                      </div>
                    </div>
                    <div className="text-accent font-bold ml-4 shrink-0 text-sm">${producto.precioVenta.toLocaleString("es-AR")}</div>
                  </button>
                )
              })}
            </div>
          )}

          {query && resultados.length === 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-xl p-4 text-center text-muted-foreground text-sm shadow-2xl z-50">
              Sin resultados para &quot;{query}&quot;
            </div>
          )}
        </div>

        {/* Empty state */}
        {carrito.length === 0 && !query && (
          <div className="text-center py-14">
            <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm">Buscá un producto para empezar a vender</p>
          </div>
        )}

        {/* Cart */}
        {carrito.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Carrito</p>
              <span className="text-xs text-muted-foreground">{carrito.length} {carrito.length === 1 ? "producto" : "productos"}</span>
            </div>
            <div className="divide-y divide-border">
              {carrito.map((item) => (
                <div key={item.producto.id} className="flex items-center p-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{item.producto.producto}</p>
                    <p className="text-xs text-muted-foreground">${item.producto.precioVenta.toLocaleString("es-AR")} c/u</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => actualizarCantidadCarrito(item.producto.id, -1)} className="w-7 h-7 bg-secondary rounded-lg flex items-center justify-center hover:bg-border transition-colors active:scale-95">
                      <Minus className="w-3.5 h-3.5 text-foreground" />
                    </button>
                    <span className="w-5 text-center font-bold text-foreground text-sm">{item.cantidad}</span>
                    <button onClick={() => actualizarCantidadCarrito(item.producto.id, 1)} className="w-7 h-7 bg-secondary rounded-lg flex items-center justify-center hover:bg-border transition-colors active:scale-95">
                      <Plus className="w-3.5 h-3.5 text-foreground" />
                    </button>
                    <p className="font-bold text-accent w-[60px] text-right text-sm">${(item.producto.precioVenta * item.cantidad).toLocaleString("es-AR")}</p>
                    <button onClick={() => eliminarDelCarrito(item.producto.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border bg-accent/5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-muted-foreground">Total a cobrar</p>
                <p className="text-2xl font-bold text-accent">${totalCarrito.toLocaleString("es-AR")}</p>
              </div>
              <button
                onClick={abrirModalPago}
                className="w-full bg-accent text-accent-foreground font-bold py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_0_20px_oklch(0.83_0.17_163/0.3)] text-sm"
              >
                COBRAR ${totalCarrito.toLocaleString("es-AR")}
              </button>
              <button
                onClick={() => setCarrito([])}
                className="w-full border border-border text-muted-foreground font-medium py-2.5 rounded-xl mt-2 hover:bg-secondary transition-colors text-sm"
              >
                Limpiar carrito
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal cantidad */}
      {modalOpen && productoSeleccionado && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && cerrarModal()}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <p className="font-display text-lg font-bold text-foreground mb-1">{productoSeleccionado.producto}</p>
            <p className="text-accent font-bold text-xl mb-5">${productoSeleccionado.precioVenta.toLocaleString("es-AR")}</p>
            <div className="grid grid-cols-5 gap-2 mb-5">
              {[1, 2, 3, 5, 10].map((n) => (
                <button key={n} onClick={() => setPreset(n)} disabled={n > productoSeleccionado.cantidad} className="py-2.5 border border-border rounded-xl font-bold text-foreground text-sm hover:border-accent hover:bg-accent/10 hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95">
                  {n}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-center gap-5 mb-5">
              <button onClick={() => spinCantidad(-1)} className="w-12 h-12 bg-secondary text-foreground rounded-xl text-xl font-bold hover:bg-border transition-colors active:scale-95">−</button>
              <span className="text-4xl font-bold text-foreground min-w-[60px] text-center">{cantidadModal}</span>
              <button onClick={() => spinCantidad(1)} className="w-12 h-12 bg-secondary text-foreground rounded-xl text-xl font-bold hover:bg-border transition-colors active:scale-95">+</button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => confirmarAgregar()} className="flex-1 bg-accent text-accent-foreground font-bold py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-sm">AGREGAR</button>
              <button onClick={cerrarModal} className="flex-1 bg-secondary text-foreground font-medium py-3.5 rounded-xl hover:bg-border transition-colors text-sm">Cancelar</button>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-3">Stock disponible: {productoSeleccionado.cantidad} unidades</p>
          </div>
        </div>
      )}

      {/* Modal pago */}
      {modalPagoOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setModalPagoOpen(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <p className="font-display text-lg font-bold text-foreground mb-1">Método de Pago</p>
            <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 text-center mb-4">
              <p className="text-[10px] uppercase text-accent/70 font-bold tracking-widest">Total</p>
              <p className="text-2xl font-bold text-accent">${totalCarrito.toLocaleString("es-AR")}</p>
            </div>
            <div className="space-y-2 mb-4">
              {(["efectivo", "transferencia", "mixto"] as MetodoPago[]).map((m) => (
                <button
                  key={m}
                  onClick={() => handleMetodoPagoChange(m)}
                  className={`w-full p-3.5 rounded-xl border-2 text-left font-semibold text-sm transition-all ${
                    metodoPago === m
                      ? m === "efectivo" ? "border-accent bg-accent/10 text-accent"
                        : m === "transferencia" ? "border-info bg-info/10 text-info"
                        : "border-warning bg-warning/10 text-warning"
                      : "border-border text-foreground hover:border-muted-foreground/40 hover:bg-secondary"
                  }`}
                >
                  {m === "efectivo" ? "💵 Efectivo" : m === "transferencia" ? "📱 Transferencia" : "💳 Mixto"}
                </button>
              ))}
            </div>
            {metodoPago === "mixto" && (
              <div className="space-y-3 mb-4 p-4 bg-secondary rounded-xl">
                {[
                  { label: "Efectivo", value: montoEfectivo, onChange: handleMontoEfectivoChange },
                  { label: "Transferencia", value: montoTransferencia, onChange: handleMontoTransferenciaChange },
                ].map(({ label, value, onChange }) => (
                  <div key={label}>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full pl-7 pr-4 py-2.5 bg-muted border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-sm" />
                    </div>
                  </div>
                ))}
                {montoEfectivo + montoTransferencia !== totalCarrito && (
                  <p className="text-destructive text-xs text-center">La suma debe ser ${totalCarrito.toLocaleString("es-AR")}</p>
                )}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={finalizarVenta} disabled={metodoPago === "mixto" && montoEfectivo + montoTransferencia !== totalCarrito} className="flex-1 bg-accent text-accent-foreground font-bold py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm">
                CONFIRMAR
              </button>
              <button onClick={() => setModalPagoOpen(false)} className="flex-1 bg-secondary text-foreground font-medium py-3.5 rounded-xl hover:bg-border transition-colors text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ticket */}
      {modalTicketOpen && ticketData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <p className="font-display text-lg font-bold text-center text-foreground mb-0.5">Ticket de venta</p>
            <p className="text-xs text-muted-foreground text-center mb-4">{ticketData.fecha}</p>
            <div className="bg-secondary rounded-xl p-4 font-mono text-sm text-foreground mb-4 space-y-1">
              <p className="font-bold text-center mb-2">{nombreComercio || "Mi Comercio"}</p>
              <div className="border-t border-border my-2" />
              {ticketData.items.map((item) => (
                <div key={item.producto.id} className="flex justify-between gap-2">
                  <span className="truncate">{item.producto.producto} x{item.cantidad}</span>
                  <span className="font-semibold shrink-0">${(item.producto.precioVenta * item.cantidad).toLocaleString("es-AR")}</span>
                </div>
              ))}
              <div className="border-t border-border my-2" />
              <div className="flex justify-between font-bold text-accent">
                <span>TOTAL</span>
                <span>${ticketData.total.toLocaleString("es-AR")}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Pago:{" "}
                {ticketData.metodo === "efectivo" ? "Efectivo" :
                 ticketData.metodo === "transferencia" ? "Transferencia" :
                 `Mixto — Ef $${ticketData.efectivo.toLocaleString("es-AR")} / Tr $${ticketData.transferencia.toLocaleString("es-AR")}`}
              </p>
            </div>
            <div className="flex gap-3 mb-3">
              <button onClick={handleImprimir} className="flex-1 flex items-center justify-center gap-2 border border-border text-foreground font-semibold py-3 rounded-xl hover:bg-secondary transition-colors text-sm">
                <Printer className="w-4 h-4" />Imprimir
              </button>
              <button onClick={handleWhatsApp} className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity text-sm">
                <MessageCircle className="w-4 h-4" />WhatsApp
              </button>
            </div>
            <button onClick={() => setModalTicketOpen(false)} className="w-full border border-border text-muted-foreground font-medium py-3 rounded-xl hover:bg-secondary transition-colors text-sm">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Div oculto para impresión */}
      {ticketData && (
        <div id="ticket-impresion" style={{ display: "none" }}>
          <p style={{ fontWeight: "bold", textAlign: "center", fontSize: "15px" }}>{nombreComercio || "Mi Comercio"}</p>
          <p style={{ textAlign: "center", marginBottom: "8px" }}>{ticketData.fecha}</p>
          <p>{"─".repeat(28)}</p>
          {ticketData.items.map((item) => (
            <div key={item.producto.id} style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{item.producto.producto} x{item.cantidad}</span>
              <span>${(item.producto.precioVenta * item.cantidad).toLocaleString("es-AR")}</span>
            </div>
          ))}
          <p>{"─".repeat(28)}</p>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
            <span>TOTAL</span><span>${ticketData.total.toLocaleString("es-AR")}</span>
          </div>
          <p style={{ marginTop: "4px", fontSize: "12px" }}>
            Pago:{" "}
            {ticketData.metodo === "efectivo" ? "Efectivo" :
             ticketData.metodo === "transferencia" ? "Transferencia" :
             `Mixto — Ef $${ticketData.efectivo.toLocaleString("es-AR")} / Tr $${ticketData.transferencia.toLocaleString("es-AR")}`}
          </p>
          <p style={{ textAlign: "center", marginTop: "12px" }}>Gracias por su compra!</p>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 right-4 px-4 py-3 rounded-xl shadow-2xl z-50 font-semibold text-sm max-w-[280px] border ${toast.error ? "bg-card text-foreground border-destructive" : "bg-card text-foreground border-accent"}`}>
          {toast.mensaje}
        </div>
      )}
    </AppShell>
  )
}
