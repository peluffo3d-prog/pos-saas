"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Package, BarChart3, Menu, X, Home, Wallet,
  Download, Trash2, ChevronLeft, ChevronRight,
  Pencil, Check, Ban,
} from "lucide-react"
import {
  getCierres, cerrarCajaHoy, getTotalesMes, getTotalesHoy,
  getVentasHoy, eliminarCierre, editarCierre, editarVenta, eliminarVenta,
  getCantidadProductosBajos,
  type CierreCaja, type Venta, type MetodoPago, type DatosEditarCierre,
} from "@/lib/store"
import * as XLSX from "xlsx"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

// ─── Tipos locales ────────────────────────────────────────────────────────────

type EditVentaState = {
  id: number
  metodoPago: MetodoPago
  montoEfectivo: number
  montoTransferencia: number
  total: number
}

type EditCierreState = DatosEditarCierre & { id: number }

// ─── Componente ───────────────────────────────────────────────────────────────

export default function CajaPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [cierres, setCierres] = useState<CierreCaja[]>([])
  const [ventasHoy, setVentasHoy] = useState<Venta[]>([])
  const [mesActual, setMesActual] = useState(new Date().getMonth() + 1)
  const [anioActual, setAnioActual] = useState(new Date().getFullYear())
  const [totalesHoy, setTotalesHoy] = useState({ totalVentas: 0, totalGanancias: 0, cantidadVentas: 0 })
  const [totalesMes, setTotalesMes] = useState({
    totalVentas: 0, totalCostos: 0, totalGanancias: 0,
    totalEfectivo: 0, totalTransferencia: 0, cantidadVentas: 0, diasCerrados: 0,
  })
  const [toast, setToast] = useState<{ mensaje: string; error: boolean } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [stockBajos, setStockBajos] = useState(0)

  // Estado de edición de ventas del día
  const [editVenta, setEditVenta] = useState<EditVentaState | null>(null)

  // Estado de edición de cierre mensual
  const [editCierre, setEditCierre] = useState<EditCierreState | null>(null)

  const cargarDatos = useCallback(async () => {
    const [c, vHoy, totHoy, totMes, bajos] = await Promise.all([
      getCierres(),
      getVentasHoy(),
      getTotalesHoy(),
      getTotalesMes(mesActual, anioActual),
      getCantidadProductosBajos(),
    ])
    setCierres(c)
    setVentasHoy(vHoy)
    setTotalesHoy(totHoy)
    setStockBajos(bajos)
    setTotalesMes(totMes)
  }, [mesActual, anioActual])

  useEffect(() => {
    cargarDatos().then(() => setMounted(true))
  }, [cargarDatos])

  const mostrarToast = (mensaje: string, error = false) => {
    setToast({ mensaje, error })
    setTimeout(() => setToast(null), 3000)
  }

  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

  const cambiarMes = (delta: number) => {
    let nuevoMes = mesActual + delta
    let nuevoAnio = anioActual
    if (nuevoMes > 12) { nuevoMes = 1; nuevoAnio++ }
    else if (nuevoMes < 1) { nuevoMes = 12; nuevoAnio-- }
    setMesActual(nuevoMes)
    setAnioActual(nuevoAnio)
  }

  const cierresMesActual = cierres.filter((c) => {
    const [, mesStr, anioStr] = c.fecha.split("/")
    return parseInt(mesStr) === mesActual && parseInt(anioStr) === anioActual
  })

  // ─── Acciones ventas del día ─────────────────────────────────────────────────

  const handleEliminarVenta = async (id: number) => {
    await eliminarVenta(id)
    await cargarDatos()
    mostrarToast("Venta eliminada")
  }

  const abrirEditarVenta = (v: Venta) => {
    setEditVenta({
      id: v.id,
      metodoPago: v.metodoPago ?? "efectivo",
      montoEfectivo: v.montoEfectivo ?? v.totalVenta,
      montoTransferencia: v.montoTransferencia ?? 0,
      total: v.totalVenta,
    })
  }

  const handleMetodoPagoEditChange = (metodo: MetodoPago) => {
    if (!editVenta) return
    if (metodo === "efectivo") setEditVenta({ ...editVenta, metodoPago: metodo, montoEfectivo: editVenta.total, montoTransferencia: 0 })
    else if (metodo === "transferencia") setEditVenta({ ...editVenta, metodoPago: metodo, montoEfectivo: 0, montoTransferencia: editVenta.total })
    else setEditVenta({ ...editVenta, metodoPago: metodo, montoEfectivo: Math.floor(editVenta.total / 2), montoTransferencia: editVenta.total - Math.floor(editVenta.total / 2) })
  }

  const guardarEditarVenta = async () => {
    if (!editVenta) return
    if (editVenta.metodoPago === "mixto" && editVenta.montoEfectivo + editVenta.montoTransferencia !== editVenta.total) {
      mostrarToast("La suma de efectivo + transferencia debe ser igual al total", true)
      return
    }
    await editarVenta(editVenta.id, {
      metodoPago: editVenta.metodoPago,
      montoEfectivo: editVenta.montoEfectivo,
      montoTransferencia: editVenta.montoTransferencia,
    })
    setEditVenta(null)
    await cargarDatos()
    mostrarToast("Venta actualizada")
  }

  // ─── Acciones cierre de caja ──────────────────────────────────────────────────

  const handleCerrarCaja = async () => {
    const vHoy = await getVentasHoy()
    if (vHoy.length === 0) { mostrarToast("No hay ventas para cerrar hoy", true); return }
    setConfirmOpen(true)
  }

  const confirmarCierre = async () => {
    const resultado = await cerrarCajaHoy()
    if (resultado.success) {
      await cargarDatos()
      mostrarToast(resultado.mensaje)
    } else {
      mostrarToast(resultado.mensaje, true)
    }
    setConfirmOpen(false)
  }

  // ─── Acciones cierres mensuales ───────────────────────────────────────────────

  const handleEliminarCierre = async (id: number) => {
    await eliminarCierre(id)
    await cargarDatos()
    mostrarToast("Cierre eliminado")
  }

  const abrirEditarCierre = (c: CierreCaja) => {
    setEditCierre({
      id: c.id,
      totalVentas: c.totalVentas,
      totalCostos: c.totalCostos,
      totalGanancias: c.totalGanancias,
      efectivo: c.efectivo,
      transferencia: c.transferencia,
    })
  }

  const guardarEditarCierre = async () => {
    if (!editCierre) return
    await editarCierre(editCierre.id, {
      totalVentas: editCierre.totalVentas,
      totalCostos: editCierre.totalCostos,
      totalGanancias: editCierre.totalGanancias,
      efectivo: editCierre.efectivo,
      transferencia: editCierre.transferencia,
    })
    setEditCierre(null)
    await cargarDatos()
    mostrarToast("Cierre actualizado")
  }

  // ─── Excel ────────────────────────────────────────────────────────────────────

  const exportarExcel = () => {
    const datosExcel = cierresMesActual.map((c) => ({
      Fecha: c.fecha,
      "Cantidad Ventas": c.cantidadVentas,
      "Total Ventas": c.totalVentas,
      Costos: c.totalCostos,
      Ganancia: c.totalGanancias,
      Efectivo: c.efectivo,
      Transferencia: c.transferencia,
    }))
    datosExcel.push({
      Fecha: "TOTALES",
      "Cantidad Ventas": totalesMes.cantidadVentas,
      "Total Ventas": totalesMes.totalVentas,
      Costos: totalesMes.totalCostos,
      Ganancia: totalesMes.totalGanancias,
      Efectivo: totalesMes.totalEfectivo,
      Transferencia: totalesMes.totalTransferencia,
    })
    const ws = XLSX.utils.json_to_sheet(datosExcel)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Cierres")
    ws["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }]
    XLSX.writeFile(wb, `cierres_${meses[mesActual - 1]}_${anioActual}.xlsx`)
  }

  const datosGrafico = [
    { name: "Efectivo", value: totalesMes.totalEfectivo, color: "#22c55e" },
    { name: "Transferencia", value: totalesMes.totalTransferencia, color: "#3b82f6" },
  ].filter((d) => d.value > 0)

  const datosGanancias = [
    { name: "Ganancia", value: totalesMes.totalGanancias, color: "#22c55e" },
    { name: "Costo", value: totalesMes.totalCostos, color: "#6b7280" },
  ].filter((d) => d.value > 0)

  if (!mounted) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando...</p>
      </main>
    )
  }

  return (
    <main className="flex flex-col min-h-screen bg-background">

      {/* Menú */}
      <button onClick={() => setMenuOpen(!menuOpen)} className="absolute left-4 top-4 p-2 rounded-lg hover:bg-secondary transition-colors z-50">
        {menuOpen ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
      </button>
      {menuOpen && (
        <div className="absolute left-0 top-14 w-64 bg-card border border-border rounded-xl shadow-2xl z-40">
          <nav className="flex flex-col py-2">
            <a href="/" className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-secondary transition-colors"><Home className="h-5 w-5 text-muted-foreground" /><span className="font-medium">Inicio</span></a>
            <a href="/stock" className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-secondary transition-colors">
              <Package className="h-5 w-5 text-muted-foreground" /><span className="font-medium">Stock</span>
              {stockBajos > 0 && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">{stockBajos}</span>
              )}
            </a>
            <a href="/ventas" className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-secondary transition-colors"><BarChart3 className="h-5 w-5 text-muted-foreground" /><span className="font-medium">Ventas</span></a>
          </nav>
        </div>
      )}

      <div className="flex-1 px-4 py-16 max-w-2xl mx-auto w-full">

        {/* Encabezado */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Caja</h1>
          </div>
          {cierresMesActual.length > 0 && (
            <button onClick={exportarExcel} className="flex items-center gap-2 bg-secondary hover:bg-border text-foreground px-4 py-2 rounded-xl text-sm font-medium transition-colors">
              <Download className="w-4 h-4" />Excel
            </button>
          )}
        </div>

        {/* ── VENTAS DEL DÍA ── */}
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Hoy</p>

          {/* Totales del día */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{totalesHoy.cantidadVentas}</p>
              <p className="text-xs text-muted-foreground">Ventas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">${totalesHoy.totalVentas.toLocaleString("es-AR")}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">${totalesHoy.totalGanancias.toLocaleString("es-AR")}</p>
              <p className="text-xs text-muted-foreground">Ganancia</p>
            </div>
          </div>

          {/* Lista de ventas del día (editables) */}
          {ventasHoy.length > 0 && (
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {ventasHoy.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{v.producto} <span className="text-muted-foreground font-normal">x{v.cantidad}</span></p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-success font-medium">${v.totalVenta.toLocaleString("es-AR")}</span>
                      {v.metodoPago && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          v.metodoPago === "efectivo" ? "bg-success/20 text-success"
                          : v.metodoPago === "transferencia" ? "bg-info/20 text-info"
                          : "bg-warning/20 text-warning"
                        }`}>
                          {v.metodoPago === "mixto" ? `Mixto $${v.montoEfectivo?.toLocaleString("es-AR")}/$${v.montoTransferencia?.toLocaleString("es-AR")}` : v.metodoPago === "efectivo" ? "Efectivo" : "Transferencia"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button onClick={() => abrirEditarVenta(v)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-border rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleEliminarVenta(v.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-border rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleCerrarCaja}
            disabled={totalesHoy.cantidadVentas === 0}
            className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            CERRAR CAJA DEL DÍA
          </button>
        </div>

        {/* ── SELECTOR MES ── */}
        <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4 mb-6">
          <button onClick={() => cambiarMes(-1)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <p className="font-bold text-foreground">{meses[mesActual - 1]} {anioActual}</p>
          <button onClick={() => cambiarMes(1)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {cierresMesActual.length > 0 ? (
          <>
            {/* ── RESUMEN MENSUAL ── */}
            <div className="bg-card border border-border rounded-xl p-5 mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Resumen del Mes</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-secondary rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-foreground">${totalesMes.totalVentas.toLocaleString("es-AR")}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Ventas</p>
                </div>
                <div className="bg-success/10 border border-success/30 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-success">${totalesMes.totalGanancias.toLocaleString("es-AR")}</p>
                  <p className="text-xs text-success/70 mt-1">
                    Ganancia Neta ({totalesMes.totalVentas > 0 ? Math.round(totalesMes.totalGanancias / totalesMes.totalVentas * 100) : 0}%)
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><p className="text-lg font-bold text-foreground">{totalesMes.diasCerrados}</p><p className="text-xs text-muted-foreground">Días</p></div>
                <div><p className="text-lg font-bold text-foreground">{totalesMes.cantidadVentas}</p><p className="text-xs text-muted-foreground">Ventas</p></div>
                <div><p className="text-lg font-bold text-foreground">${totalesMes.totalCostos.toLocaleString("es-AR")}</p><p className="text-xs text-muted-foreground">Costos</p></div>
              </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {datosGrafico.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 text-center">Métodos de Pago</p>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={datosGrafico} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={2} dataKey="value">
                          {datosGrafico.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => [`$${v.toLocaleString("es-AR")}`, ""]} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-2">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-success" /><span className="text-xs text-muted-foreground">Efectivo</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-info" /><span className="text-xs text-muted-foreground">Transf.</span></div>
                  </div>
                </div>
              )}
              {datosGanancias.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 text-center">Ganancia vs Costo</p>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={datosGanancias} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={2} dataKey="value">
                          {datosGanancias.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => [`$${v.toLocaleString("es-AR")}`, ""]} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-2">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-success" /><span className="text-xs text-muted-foreground">Ganancia</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-muted-foreground" /><span className="text-xs text-muted-foreground">Costo</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* ── HISTORIAL DE CIERRES (editable) ── */}
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Historial del Mes</p>
              <div className="space-y-3">
                {cierresMesActual.map((cierre) => {
                  const isEditing = editCierre?.id === cierre.id
                  return (
                    <div key={cierre.id} className="bg-secondary rounded-xl p-4">
                      {isEditing ? (
                        /* Modo edición del cierre */
                        <div className="space-y-3">
                          <p className="font-semibold text-foreground mb-2">{cierre.fecha}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: "Total Ventas", key: "totalVentas" },
                              { label: "Costos", key: "totalCostos" },
                              { label: "Ganancia", key: "totalGanancias" },
                              { label: "Efectivo", key: "efectivo" },
                              { label: "Transferencia", key: "transferencia" },
                            ].map(({ label, key }) => (
                              <div key={key}>
                                <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                  <input
                                    type="number"
                                    value={(editCierre as any)[key]}
                                    onChange={(e) => setEditCierre({ ...editCierre!, [key]: Number(e.target.value) })}
                                    className="w-full pl-6 pr-2 py-2 bg-muted border border-border text-foreground rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button onClick={guardarEditarCierre} className="flex-1 flex items-center justify-center gap-2 bg-success text-success-foreground font-bold py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm">
                              <Check className="w-4 h-4" />Guardar
                            </button>
                            <button onClick={() => setEditCierre(null)} className="flex-1 flex items-center justify-center gap-2 bg-muted text-foreground font-bold py-2.5 rounded-xl hover:bg-border transition-colors text-sm">
                              <Ban className="w-4 h-4" />Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Vista normal del cierre */
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground">{cierre.fecha}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span>{cierre.cantidadVentas} ventas</span>
                              <span className="text-success">E: ${cierre.efectivo.toLocaleString("es-AR")}</span>
                              <span className="text-info">T: ${cierre.transferencia.toLocaleString("es-AR")}</span>
                            </div>
                          </div>
                          <div className="text-right mr-3">
                            <p className="font-bold text-foreground">${cierre.totalVentas.toLocaleString("es-AR")}</p>
                            <p className="text-xs text-success">+${cierre.totalGanancias.toLocaleString("es-AR")}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => abrirEditarCierre(cierre)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-border rounded-lg transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleEliminarCierre(cierre.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-border rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No hay cierres en {meses[mesActual - 1]} {anioActual}</p>
          </div>
        )}
      </div>

      {/* ── MODAL CONFIRMAR CIERRE ── */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setConfirmOpen(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-xl font-bold text-center text-foreground mb-2">Cerrar Caja</p>
            <p className="text-muted-foreground text-center mb-6">
              Vas a cerrar el día con {totalesHoy.cantidadVentas} ventas por ${totalesHoy.totalVentas.toLocaleString("es-AR")}. Las ventas del día se van a archivar.
            </p>
            <div className="flex gap-3">
              <button onClick={confirmarCierre} className="flex-1 bg-primary text-primary-foreground font-bold py-4 rounded-xl hover:opacity-90 transition-opacity">CONFIRMAR</button>
              <button onClick={() => setConfirmOpen(false)} className="flex-1 bg-secondary text-foreground font-bold py-4 rounded-xl hover:bg-border transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR VENTA ── */}
      {editVenta && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setEditVenta(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-lg font-bold text-foreground mb-1">Editar método de pago</p>
            <p className="text-success font-semibold mb-4">Total: ${editVenta.total.toLocaleString("es-AR")}</p>

            <div className="space-y-2 mb-4">
              {(["efectivo", "transferencia", "mixto"] as MetodoPago[]).map((m) => (
                <button
                  key={m}
                  onClick={() => handleMetodoPagoEditChange(m)}
                  className={`w-full p-3 rounded-xl border-2 text-left font-medium transition-all text-sm ${
                    editVenta.metodoPago === m
                      ? m === "efectivo" ? "border-success bg-success/10 text-success"
                        : m === "transferencia" ? "border-info bg-info/10 text-info"
                        : "border-warning bg-warning/10 text-warning"
                      : "border-border text-foreground hover:border-muted-foreground/50"
                  }`}
                >
                  {m === "efectivo" ? "Efectivo" : m === "transferencia" ? "Transferencia" : "Mixto"}
                </button>
              ))}
            </div>

            {editVenta.metodoPago === "mixto" && (
              <div className="space-y-3 mb-4 p-4 bg-secondary rounded-xl">
                {[
                  { label: "Efectivo", value: editVenta.montoEfectivo, key: "montoEfectivo" },
                  { label: "Transferencia", value: editVenta.montoTransferencia, key: "montoTransferencia" },
                ].map(({ label, value, key }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => setEditVenta({ ...editVenta, [key]: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-3 bg-muted border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-success"
                      />
                    </div>
                  </div>
                ))}
                {editVenta.montoEfectivo + editVenta.montoTransferencia !== editVenta.total && (
                  <p className="text-destructive text-xs text-center">La suma debe ser ${editVenta.total.toLocaleString("es-AR")}</p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={guardarEditarVenta} className="flex-1 bg-success text-success-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity">
                GUARDAR
              </button>
              <button onClick={() => setEditVenta(null)} className="flex-1 bg-secondary text-foreground font-bold py-3 rounded-xl hover:bg-border transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-2xl z-50 font-semibold ${toast.error ? "bg-destructive text-destructive-foreground" : "bg-success text-success-foreground"}`}>
          {toast.mensaje}
        </div>
      )}
    </main>
  )
}
