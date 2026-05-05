"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Download, Trash2, ChevronLeft, ChevronRight,
  Pencil, Check, Ban, Loader2,
} from "lucide-react"
import {
  getCierres, cerrarCajaHoy, getTotalesMes, getTotalesHoy,
  getVentasHoy, eliminarCierre, editarCierre, editarVenta, eliminarVenta,
  type CierreCaja, type Venta, type MetodoPago, type DatosEditarCierre,
} from "@/lib/store"
import * as XLSX from "xlsx"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { AppShell } from "@/components/app-shell"

type EditVentaState = {
  id: number
  metodoPago: MetodoPago
  montoEfectivo: number
  montoTransferencia: number
  total: number
}

type EditCierreState = DatosEditarCierre & { id: number }

export default function CajaPage() {
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
  const [editVenta, setEditVenta] = useState<EditVentaState | null>(null)
  const [editCierre, setEditCierre] = useState<EditCierreState | null>(null)

  const cargarDatos = useCallback(async () => {
    const [c, vHoy, totHoy, totMes] = await Promise.all([
      getCierres(),
      getVentasHoy(),
      getTotalesHoy(),
      getTotalesMes(mesActual, anioActual),
    ])
    setCierres(c)
    setVentasHoy(vHoy)
    setTotalesHoy(totHoy)
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

  // ── Ventas del día ────────────────────────────────────────────────────────────

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

  // ── Cierre de caja ────────────────────────────────────────────────────────────

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

  // ── Cierres mensuales ─────────────────────────────────────────────────────────

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
    { name: "Efectivo", value: totalesMes.totalEfectivo, color: "oklch(0.83 0.17 163)" },
    { name: "Transferencia", value: totalesMes.totalTransferencia, color: "oklch(0.65 0.15 230)" },
  ].filter((d) => d.value > 0)

  const datosGanancias = [
    { name: "Ganancia", value: totalesMes.totalGanancias, color: "oklch(0.83 0.17 163)" },
    { name: "Costo", value: totalesMes.totalCostos, color: "oklch(0.30 0.008 265)" },
  ].filter((d) => d.value > 0)

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    )
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <h1 className="font-display font-bold text-foreground text-lg">Caja</h1>
          {cierresMesActual.length > 0 && (
            <button onClick={exportarExcel} className="flex items-center gap-1.5 bg-secondary hover:bg-border text-foreground px-3 py-2 rounded-xl text-xs font-semibold transition-colors">
              <Download className="w-3.5 h-3.5" />Excel
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto w-full">

        {/* ── KPIs hoy ── */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Hoy</p>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-secondary rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{totalesHoy.cantidadVentas}</p>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wide mt-1">Ventas</p>
            </div>
            <div className="bg-secondary rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-foreground">${totalesHoy.totalVentas.toLocaleString("es-AR")}</p>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wide mt-1">Total</p>
            </div>
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-accent">${totalesHoy.totalGanancias.toLocaleString("es-AR")}</p>
              <p className="text-[10px] uppercase text-accent/60 font-semibold tracking-wide mt-1">Ganancia</p>
            </div>
          </div>

          {/* Ventas del día (editables) */}
          {ventasHoy.length > 0 && (
            <div className="space-y-2 mb-4 max-h-56 overflow-y-auto">
              {ventasHoy.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 bg-secondary rounded-xl gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">
                      {v.producto} <span className="text-muted-foreground font-normal">x{v.cantidad}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-accent font-medium">${v.totalVenta.toLocaleString("es-AR")}</span>
                      {v.metodoPago && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                          v.metodoPago === "efectivo" ? "bg-accent/20 text-accent"
                          : v.metodoPago === "transferencia" ? "bg-info/20 text-info"
                          : "bg-warning/20 text-warning"
                        }`}>
                          {v.metodoPago === "mixto"
                            ? `Mixto $${v.montoEfectivo?.toLocaleString("es-AR")}/$${v.montoTransferencia?.toLocaleString("es-AR")}`
                            : v.metodoPago === "efectivo" ? "Efectivo" : "Transferencia"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => abrirEditarVenta(v)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-border rounded-lg transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleEliminarVenta(v.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-border rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleCerrarCaja}
            disabled={totalesHoy.cantidadVentas === 0}
            className="w-full bg-accent text-accent-foreground font-bold py-4 rounded-xl hover:opacity-90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_oklch(0.83_0.17_163/0.25)] text-sm"
          >
            CERRAR CAJA DEL DÍA
          </button>
        </div>

        {/* ── Selector mes ── */}
        <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 mb-4">
          <button onClick={() => cambiarMes(-1)} className="p-2 hover:bg-secondary rounded-lg transition-colors active:scale-95">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <p className="font-display font-bold text-foreground">{meses[mesActual - 1]} {anioActual}</p>
          <button onClick={() => cambiarMes(1)} className="p-2 hover:bg-secondary rounded-lg transition-colors active:scale-95">
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {cierresMesActual.length > 0 ? (
          <>
            {/* ── Resumen mensual ── */}
            <div className="bg-card border border-border rounded-2xl p-5 mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Resumen del Mes</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-secondary rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">${totalesMes.totalVentas.toLocaleString("es-AR")}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide mt-1">Total Ventas</p>
                </div>
                <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-accent">${totalesMes.totalGanancias.toLocaleString("es-AR")}</p>
                  <p className="text-[10px] text-accent/60 uppercase font-semibold tracking-wide mt-1">
                    Ganancia {totalesMes.totalVentas > 0 ? `(${Math.round(totalesMes.totalGanancias / totalesMes.totalVentas * 100)}%)` : ""}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-lg font-bold text-foreground">{totalesMes.diasCerrados}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide mt-0.5">Días</p>
                </div>
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-lg font-bold text-foreground">{totalesMes.cantidadVentas}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide mt-0.5">Ventas</p>
                </div>
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-lg font-bold text-foreground">${totalesMes.totalCostos.toLocaleString("es-AR")}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide mt-0.5">Costos</p>
                </div>
              </div>
            </div>

            {/* Gráficos */}
            {(datosGrafico.length > 0 || datosGanancias.length > 0) && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {datosGrafico.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 text-center">Métodos de Pago</p>
                    <div className="h-28">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={datosGrafico} cx="50%" cy="50%" innerRadius={28} outerRadius={46} paddingAngle={3} dataKey="value">
                            {datosGrafico.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip
                            formatter={(v: number) => [`$${v.toLocaleString("es-AR")}`, ""]}
                            contentStyle={{ backgroundColor: "oklch(0.13 0.010 265)", border: "1px solid oklch(0.21 0.008 265)", borderRadius: "10px", color: "oklch(0.96 0.002 265)", fontSize: "12px" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-3 mt-1">
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-accent" /><span className="text-[10px] text-muted-foreground">Efectivo</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-info" /><span className="text-[10px] text-muted-foreground">Transf.</span></div>
                    </div>
                  </div>
                )}
                {datosGanancias.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 text-center">Ganancia vs Costo</p>
                    <div className="h-28">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={datosGanancias} cx="50%" cy="50%" innerRadius={28} outerRadius={46} paddingAngle={3} dataKey="value">
                            {datosGanancias.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip
                            formatter={(v: number) => [`$${v.toLocaleString("es-AR")}`, ""]}
                            contentStyle={{ backgroundColor: "oklch(0.13 0.010 265)", border: "1px solid oklch(0.21 0.008 265)", borderRadius: "10px", color: "oklch(0.96 0.002 265)", fontSize: "12px" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-3 mt-1">
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-accent" /><span className="text-[10px] text-muted-foreground">Ganancia</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-muted" /><span className="text-[10px] text-muted-foreground">Costo</span></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Historial del mes (editable) ── */}
            <div className="bg-card border border-border rounded-2xl p-5 mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Historial del Mes</p>
              <div className="space-y-3">
                {cierresMesActual.map((cierre) => {
                  const isEditing = editCierre?.id === cierre.id
                  return (
                    <div key={cierre.id} className="bg-secondary rounded-xl p-4">
                      {isEditing ? (
                        <div className="space-y-3">
                          <p className="font-semibold text-foreground text-sm mb-2">{cierre.fecha}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: "Total Ventas", key: "totalVentas" },
                              { label: "Costos", key: "totalCostos" },
                              { label: "Ganancia", key: "totalGanancias" },
                              { label: "Efectivo", key: "efectivo" },
                              { label: "Transferencia", key: "transferencia" },
                            ].map(({ label, key }) => (
                              <div key={key}>
                                <label className="block text-[10px] text-muted-foreground mb-1 font-semibold uppercase tracking-wide">{label}</label>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                                  <input
                                    type="number"
                                    value={(editCierre as any)[key]}
                                    onChange={(e) => setEditCierre({ ...editCierre!, [key]: Number(e.target.value) })}
                                    className="w-full pl-5 pr-2 py-2 bg-muted border border-border text-foreground rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button onClick={guardarEditarCierre} className="flex-1 flex items-center justify-center gap-1.5 bg-accent text-accent-foreground font-bold py-2.5 rounded-xl hover:opacity-90 transition-opacity text-xs">
                              <Check className="w-3.5 h-3.5" />Guardar
                            </button>
                            <button onClick={() => setEditCierre(null)} className="flex-1 flex items-center justify-center gap-1.5 bg-muted text-foreground font-bold py-2.5 rounded-xl hover:bg-border transition-colors text-xs">
                              <Ban className="w-3.5 h-3.5" />Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground text-sm">{cierre.fecha}</p>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                              <span>{cierre.cantidadVentas} ventas</span>
                              <span className="text-accent">E: ${cierre.efectivo.toLocaleString("es-AR")}</span>
                              <span className="text-info">T: ${cierre.transferencia.toLocaleString("es-AR")}</span>
                            </div>
                          </div>
                          <div className="text-right mr-2 shrink-0">
                            <p className="font-bold text-foreground text-sm">${cierre.totalVentas.toLocaleString("es-AR")}</p>
                            <p className="text-xs text-accent">+${cierre.totalGanancias.toLocaleString("es-AR")}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => abrirEditarCierre(cierre)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-border rounded-lg transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleEliminarCierre(cierre.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-border rounded-lg transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
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
          <div className="bg-card border border-border rounded-2xl p-10 text-center mb-4">
            <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Download className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm">No hay cierres en {meses[mesActual - 1]} {anioActual}</p>
          </div>
        )}
      </div>

      {/* Modal confirmar cierre */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setConfirmOpen(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <p className="font-display text-xl font-bold text-center text-foreground mb-2">Cerrar Caja</p>
            <p className="text-muted-foreground text-center text-sm mb-6">
              Vas a cerrar el día con <span className="text-foreground font-semibold">{totalesHoy.cantidadVentas} ventas</span> por <span className="text-accent font-bold">${totalesHoy.totalVentas.toLocaleString("es-AR")}</span>. Las ventas del día se van a archivar.
            </p>
            <div className="flex gap-3">
              <button onClick={confirmarCierre} className="flex-1 bg-accent text-accent-foreground font-bold py-4 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-sm">CONFIRMAR</button>
              <button onClick={() => setConfirmOpen(false)} className="flex-1 bg-secondary text-foreground font-medium py-4 rounded-xl hover:bg-border transition-colors text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar venta */}
      {editVenta && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setEditVenta(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <p className="font-display text-lg font-bold text-foreground mb-1">Editar método de pago</p>
            <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-2.5 text-center mb-4">
              <p className="text-[10px] uppercase text-accent/70 font-bold tracking-widest">Total</p>
              <p className="text-xl font-bold text-accent">${editVenta.total.toLocaleString("es-AR")}</p>
            </div>

            <div className="space-y-2 mb-4">
              {(["efectivo", "transferencia", "mixto"] as MetodoPago[]).map((m) => (
                <button
                  key={m}
                  onClick={() => handleMetodoPagoEditChange(m)}
                  className={`w-full p-3 rounded-xl border-2 text-left font-semibold text-sm transition-all ${
                    editVenta.metodoPago === m
                      ? m === "efectivo" ? "border-accent bg-accent/10 text-accent"
                        : m === "transferencia" ? "border-info bg-info/10 text-info"
                        : "border-warning bg-warning/10 text-warning"
                      : "border-border text-foreground hover:border-muted-foreground/40 hover:bg-secondary"
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
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => setEditVenta({ ...editVenta, [key]: Number(e.target.value) })}
                        className="w-full pl-8 pr-4 py-2.5 bg-muted border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-sm"
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
              <button onClick={guardarEditarVenta} className="flex-1 bg-accent text-accent-foreground font-bold py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-sm">GUARDAR</button>
              <button onClick={() => setEditVenta(null)} className="flex-1 bg-secondary text-foreground font-medium py-3 rounded-xl hover:bg-border transition-colors text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 right-4 px-4 py-3 rounded-xl shadow-2xl z-50 font-semibold text-sm border ${toast.error ? "bg-card text-foreground border-destructive" : "bg-card text-foreground border-accent"}`}>
          {toast.mensaje}
        </div>
      )}
    </AppShell>
  )
}
