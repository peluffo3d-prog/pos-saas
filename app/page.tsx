"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Package, BarChart3, Minus, Plus, Trash2, Menu, X, Wallet, LogOut } from "lucide-react"
import { buscarProductos, realizarVenta, getTotalesHoy, type StockItem, type MetodoPago, type DatosPago } from "@/lib/store"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

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
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [productoSeleccionado, setProductoSeleccionado] = useState<StockItem | null>(null)
  const [cantidadModal, setCantidadModal] = useState(1)
  const [modalPagoOpen, setModalPagoOpen] = useState(false)
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo")
  const [montoEfectivo, setMontoEfectivo] = useState(0)
  const [montoTransferencia, setMontoTransferencia] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  const refreshTotales = useCallback(async () => {
    const totales = await getTotalesHoy()
    setVentasHoy(totales.totalVentas)
  }, [])

  useEffect(() => {
    refreshTotales().then(() => setMounted(true))
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
    const metodoPagoTexto = metodoPago === "efectivo" ? "Efectivo" : metodoPago === "transferencia" ? "Transferencia" : "Mixto"
    mostrarToast(`Venta realizada: $${totalCarrito.toLocaleString("es-AR")} - ${metodoPagoTexto}`)
    setCarrito([])
    setModalPagoOpen(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const getBadgeStock = (cantidad: number) => {
    if (cantidad <= 0) return { clase: "bg-destructive/20 text-destructive", texto: "Agotado" }
    if (cantidad <= 5) return { clase: "bg-warning/20 text-warning", texto: "Bajo" }
    return { clase: "bg-success/20 text-success", texto: "OK" }
  }

  if (!mounted) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando...</p>
      </main>
    )
  }

  return (
    <main className="flex flex-col min-h-screen bg-background">
      {/* Menu hamburguesa */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="absolute left-4 top-4 p-2 rounded-lg hover:bg-secondary transition-colors z-50"
        aria-label="Abrir menu"
      >
        {menuOpen ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
      </button>

      {menuOpen && (
        <div className="absolute left-0 top-14 w-64 bg-card border border-border rounded-xl shadow-2xl z-40">
          <nav className="flex flex-col py-2">
            <a href="/stock" className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-secondary transition-colors">
              <Package className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Stock</span>
            </a>
            <a href="/ventas" className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-secondary transition-colors">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Ventas</span>
            </a>
            <a href="/caja" className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-secondary transition-colors">
              <Wallet className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Caja</span>
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-secondary transition-colors w-full text-left"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Cerrar sesión</span>
            </button>
          </nav>
        </div>
      )}

      {/* Badge ventas hoy */}
      <div className="absolute right-4 top-4 bg-success text-success-foreground rounded-xl px-4 py-2 text-center min-w-[90px] shadow-lg">
        <p className="text-xs uppercase opacity-80 tracking-wide">Hoy</p>
        <p className="text-lg font-bold">${ventasHoy.toLocaleString("es-AR")}</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl relative">
          <div className="flex items-center rounded-xl border border-border bg-card px-5 py-4 shadow-lg transition-all hover:border-muted-foreground/30 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 border-none bg-transparent px-4 text-base text-foreground placeholder-muted-foreground outline-none"
              placeholder="Buscar productos..."
              autoComplete="off"
            />
          </div>

          {resultados.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-xl max-h-80 overflow-y-auto shadow-2xl z-50">
              {resultados.map((producto) => {
                const badge = getBadgeStock(producto.cantidad)
                const sinStock = producto.cantidad <= 0
                const enCarrito = carrito.find((c) => c.producto.id === producto.id)
                return (
                  <div
                    key={producto.id}
                    onClick={() => !sinStock && abrirModal(producto)}
                    className={`p-4 border-b border-border last:border-b-0 flex justify-between items-center cursor-pointer transition-colors ${sinStock ? "opacity-50 cursor-not-allowed" : "hover:bg-secondary"}`}
                  >
                    <div>
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        {producto.producto}
                        {enCarrito && (
                          <span className="bg-info text-info-foreground text-xs px-2 py-0.5 rounded-full font-bold">
                            {enCarrito.cantidad} en carrito
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                        Stock: {producto.cantidad}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badge.clase}`}>{badge.texto}</span>
                      </div>
                    </div>
                    <div className="text-success font-bold text-lg">${producto.precioVenta.toLocaleString("es-AR")}</div>
                  </div>
                )
              })}
            </div>
          )}

          {query && resultados.length === 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-xl p-4 text-center text-muted-foreground shadow-2xl z-50">
              Sin resultados
            </div>
          )}
        </div>

        {carrito.length > 0 && (
          <div className="w-full max-w-xl mt-6 bg-card border border-border rounded-xl p-5 shadow-lg">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Carrito</p>
            {carrito.map((item) => (
              <div key={item.producto.id} className="flex items-center justify-between p-4 bg-secondary rounded-xl mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{item.producto.producto}</p>
                  <p className="text-sm text-muted-foreground">${item.producto.precioVenta.toLocaleString("es-AR")} c/u</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => actualizarCantidadCarrito(item.producto.id, -1)} className="w-8 h-8 bg-muted border border-border rounded-lg flex items-center justify-center hover:bg-border transition-colors">
                    <Minus className="w-4 h-4 text-foreground" />
                  </button>
                  <span className="w-6 text-center font-bold text-foreground">{item.cantidad}</span>
                  <button onClick={() => actualizarCantidadCarrito(item.producto.id, 1)} className="w-8 h-8 bg-muted border border-border rounded-lg flex items-center justify-center hover:bg-border transition-colors">
                    <Plus className="w-4 h-4 text-foreground" />
                  </button>
                  <button onClick={() => eliminarDelCarrito(item.producto.id)} className="text-muted-foreground hover:text-destructive p-1 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            <div className="bg-success/10 border border-success/30 rounded-xl p-4 text-center mt-4">
              <p className="text-xs uppercase text-success font-semibold mb-1 tracking-wide">Total a cobrar</p>
              <p className="text-3xl font-bold text-success">${totalCarrito.toLocaleString("es-AR")}</p>
            </div>
            <button onClick={abrirModalPago} className="w-full bg-success text-success-foreground font-bold py-4 rounded-xl mt-4 hover:opacity-90 transition-opacity">
              VENDER
            </button>
            <button onClick={() => setCarrito([])} className="w-full border border-border text-muted-foreground font-medium py-3 rounded-xl mt-2 hover:bg-secondary transition-colors">
              Limpiar carrito
            </button>
          </div>
        )}
      </div>

      {/* Modal de cantidad */}
      {modalOpen && productoSeleccionado && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && cerrarModal()}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-xl font-bold text-center text-foreground mb-1">{productoSeleccionado.producto}</p>
            <p className="text-success font-semibold text-center mb-5">${productoSeleccionado.precioVenta.toLocaleString("es-AR")}</p>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[1, 2, 3, 5, 10].map((n) => (
                <button key={n} onClick={() => setPreset(n)} disabled={n > productoSeleccionado.cantidad} className="py-3 border border-border rounded-lg font-bold text-foreground hover:border-accent hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  {n}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 mb-4">
              <button onClick={() => spinCantidad(-1)} className="w-12 h-12 bg-secondary text-foreground rounded-xl text-2xl font-bold hover:bg-border transition-colors">-</button>
              <span className="text-3xl font-bold min-w-[60px] text-center text-foreground">{cantidadModal}</span>
              <button onClick={() => spinCantidad(1)} className="w-12 h-12 bg-secondary text-foreground rounded-xl text-2xl font-bold hover:bg-border transition-colors">+</button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => confirmarAgregar()} className="flex-1 bg-success text-success-foreground font-bold py-4 rounded-xl hover:opacity-90 transition-opacity">AGREGAR</button>
              <button onClick={cerrarModal} className="flex-1 bg-secondary text-foreground font-bold py-4 rounded-xl hover:bg-border transition-colors">Cancelar</button>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-4">Stock disponible: {productoSeleccionado.cantidad} unidades</p>
          </div>
        </div>
      )}

      {/* Modal de pago */}
      {modalPagoOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setModalPagoOpen(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-xl font-bold text-center text-foreground mb-4">Metodo de Pago</p>
            <div className="bg-success/10 border border-success/30 rounded-xl p-4 text-center mb-4">
              <p className="text-xs uppercase text-success font-semibold tracking-wide">Total</p>
              <p className="text-2xl font-bold text-success">${totalCarrito.toLocaleString("es-AR")}</p>
            </div>
            <div className="space-y-2 mb-4">
              {(["efectivo", "transferencia", "mixto"] as MetodoPago[]).map((m) => (
                <button
                  key={m}
                  onClick={() => handleMetodoPagoChange(m)}
                  className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all ${
                    metodoPago === m
                      ? m === "efectivo" ? "border-success bg-success/10 text-success"
                        : m === "transferencia" ? "border-info bg-info/10 text-info"
                        : "border-warning bg-warning/10 text-warning"
                      : "border-border text-foreground hover:border-muted-foreground/50"
                  }`}
                >
                  {m === "efectivo" ? "Efectivo" : m === "transferencia" ? "Transferencia" : "Mixto (Efectivo + Transferencia)"}
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
                    <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full pl-8 pr-4 py-3 bg-muted border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-success" />
                    </div>
                  </div>
                ))}
                {montoEfectivo + montoTransferencia !== totalCarrito && (
                  <p className="text-destructive text-sm text-center">La suma debe ser igual al total (${totalCarrito.toLocaleString("es-AR")})</p>
                )}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={finalizarVenta} disabled={metodoPago === "mixto" && montoEfectivo + montoTransferencia !== totalCarrito} className="flex-1 bg-success text-success-foreground font-bold py-4 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
                CONFIRMAR
              </button>
              <button onClick={() => setModalPagoOpen(false)} className="flex-1 bg-secondary text-foreground font-bold py-4 rounded-xl hover:bg-border transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl shadow-2xl z-50 font-semibold ${toast.error ? "bg-card text-foreground border border-destructive" : "bg-card text-foreground border border-success"}`}>
          {toast.mensaje}
        </div>
      )}
    </main>
  )
}
