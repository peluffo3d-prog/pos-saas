"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import QRCode from "react-qr-code"
import type { MetodoPago, DatosPago } from "@/lib/store"
import { Loader2, Settings } from "lucide-react"

type Props = {
  total: number
  metodoInicial: MetodoPago
  procesando: boolean
  mpLink?: string
  onCancel: () => void
  onConfirm: (datos: DatosPago, recibido: number) => void
}

const BILLETES = [1000, 2000, 5000, 10000, 20000, 50000]

const METODOS: { id: MetodoPago; label: string; key: string }[] = [
  { id: "efectivo",      label: "Efectivo",      key: "F2" },
  { id: "transferencia", label: "Transfer.",      key: "F3" },
  { id: "mercadopago",   label: "Mercado Pago",   key: "F4" },
  { id: "mixto",         label: "Mixto",          key: "F5" },
]

export function PaymentDialog({ total, metodoInicial, procesando, mpLink, onCancel, onConfirm }: Props) {
  const [metodo, setMetodo]          = useState<MetodoPago>(metodoInicial)
  const [recibido, setRecibido]      = useState<number>(total)
  const [montoTransfer, setTransfer] = useState<number>(0)
  const recibidoRef = useRef<HTMLInputElement>(null)

  const resetMontos = (m: MetodoPago) => {
    if (m === "efectivo") { setRecibido(total); setTransfer(0) }
    else if (m === "transferencia" || m === "mercadopago") { setRecibido(0); setTransfer(total) }
    else { const mitad = Math.floor(total / 2); setRecibido(mitad); setTransfer(total - mitad) }
  }

  useEffect(() => {
    setMetodo(metodoInicial)
    resetMontos(metodoInicial)
    requestAnimationFrame(() => recibidoRef.current?.focus())
  }, [metodoInicial, total]) // eslint-disable-line react-hooks/exhaustive-deps

  const vuelto = useMemo(
    () => (metodo === "efectivo" ? Math.max(0, recibido - total) : 0),
    [metodo, recibido, total],
  )

  const sumaMixtoOk = useMemo(
    () => metodo !== "mixto" || recibido + montoTransfer === total,
    [metodo, recibido, montoTransfer, total],
  )

  const puedeConfirmar = useMemo(() => {
    if (procesando) return false
    if (metodo === "efectivo") return recibido >= total
    if (metodo === "transferencia" || metodo === "mercadopago") return true
    return sumaMixtoOk && recibido + montoTransfer > 0
  }, [metodo, recibido, montoTransfer, total, sumaMixtoOk, procesando])

  const confirmar = () => {
    if (!puedeConfirmar) return
    const datos: DatosPago = {
      metodoPago: metodo,
      montoEfectivo:
        metodo === "transferencia" || metodo === "mercadopago" ? 0
        : metodo === "mixto" ? recibido
        : Math.min(recibido, total),
      montoTransferencia:
        metodo === "efectivo" ? 0
        : metodo === "mixto" ? montoTransfer
        : total,
    }
    onConfirm(datos, recibido)
  }

  const cambiarMetodo = (m: MetodoPago) => {
    setMetodo(m)
    resetMontos(m)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onCancel() }
      else if (e.key === "Enter") { e.preventDefault(); if (puedeConfirmar) confirmar() }
      else if (e.key === "F2") { e.preventDefault(); cambiarMetodo("efectivo") }
      else if (e.key === "F3") { e.preventDefault(); cambiarMetodo("transferencia") }
      else if (e.key === "F4") { e.preventDefault(); cambiarMetodo("mercadopago") }
      else if (e.key === "F5") { e.preventDefault(); cambiarMetodo("mixto") }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [puedeConfirmar, total]) // eslint-disable-line react-hooks/exhaustive-deps

  const billetesUtil = BILLETES.filter((b) => b >= total).slice(0, 3)

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-card border-2 border-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[95vh]">
        <header className="p-5 border-b border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Total a cobrar</p>
          <p className="text-4xl font-bold text-accent">${total.toLocaleString("es-AR")}</p>
        </header>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Métodos de pago — 2x2 */}
          <div className="grid grid-cols-2 gap-2">
            {METODOS.map(({ id, label, key }) => (
              <button
                key={id}
                onClick={() => cambiarMetodo(id)}
                className={`h-14 rounded-xl border-2 font-bold text-sm transition-all flex flex-col items-center justify-center gap-0.5 ${
                  metodo === id
                    ? id === "mercadopago"
                      ? "border-[#009ee3] bg-[#009ee3]/10 text-[#009ee3]"
                      : "border-accent bg-accent/10 text-accent"
                    : "border-border hover:border-accent/40 text-foreground"
                }`}
              >
                <span className="text-[9px] font-mono opacity-40">{key}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* QR Mercado Pago */}
          {metodo === "mercadopago" && (
            <div className="flex flex-col items-center py-3">
              {mpLink ? (
                <>
                  <div className="bg-white p-4 rounded-2xl shadow-sm mb-3">
                    <QRCode value={mpLink} size={180} />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">
                    ${total.toLocaleString("es-AR")}
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    El cliente escanea con la app de Mercado Pago
                  </p>
                </>
              ) : (
                <div className="w-full bg-secondary border border-border rounded-2xl p-5 text-center">
                  <div className="w-12 h-12 bg-[#009ee3]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Settings className="w-5 h-5 text-[#009ee3]" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">Link de MP no configurado</p>
                  <p className="text-xs text-muted-foreground">
                    Ir a <strong>Configuración → Mercado Pago</strong> y pegá tu link de cobro
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Campo efectivo recibido */}
          {metodo !== "transferencia" && metodo !== "mercadopago" && (
            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-1.5">
                {metodo === "mixto" ? "Efectivo recibido" : "Monto recibido"}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xl font-bold">$</span>
                <input
                  ref={recibidoRef}
                  type="number"
                  inputMode="numeric"
                  value={recibido || ""}
                  onChange={(e) => setRecibido(Number(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="w-full h-16 pl-10 pr-4 bg-secondary border-2 border-border rounded-xl text-3xl font-bold text-foreground focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {metodo === "efectivo" && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {billetesUtil.map((b) => (
                    <button
                      key={b}
                      onClick={() => setRecibido(b)}
                      className={`h-11 rounded-xl border-2 font-bold text-sm transition-all ${
                        recibido === b ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/40"
                      }`}
                    >
                      ${b.toLocaleString("es-AR")}
                    </button>
                  ))}
                  <button
                    onClick={() => setRecibido(total)}
                    className={`h-11 rounded-xl border-2 font-bold text-sm col-span-2 transition-all ${
                      recibido === total ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/40"
                    }`}
                  >
                    Justo (${total.toLocaleString("es-AR")})
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Campo transferencia (mixto) */}
          {metodo === "mixto" && (
            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-1.5">Transferencia</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xl font-bold">$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={montoTransfer || ""}
                  onChange={(e) => setTransfer(Number(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="w-full h-14 pl-10 pr-4 bg-secondary border-2 border-border rounded-xl text-2xl font-bold focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              {!sumaMixtoOk && (
                <p className="text-destructive text-sm font-semibold mt-1">
                  Suma debe ser ${total.toLocaleString("es-AR")} (faltan ${(total - recibido - montoTransfer).toLocaleString("es-AR")})
                </p>
              )}
            </div>
          )}

          {/* Vuelto */}
          {metodo === "efectivo" && vuelto > 0 && (
            <div className="bg-accent/10 border-2 border-accent/30 rounded-xl p-4 flex items-baseline justify-between">
              <span className="text-sm font-bold text-accent/80 uppercase tracking-wide">Vuelto</span>
              <span className="text-3xl font-bold text-accent">${vuelto.toLocaleString("es-AR")}</span>
            </div>
          )}
        </div>

        <footer className="p-5 border-t border-border flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-14 rounded-xl border-2 border-border font-bold text-sm hover:bg-secondary transition-colors"
          >
            Cancelar (Esc)
          </button>
          <button
            onClick={confirmar}
            disabled={!puedeConfirmar}
            className="flex-[2] h-14 rounded-xl bg-accent text-accent-foreground font-bold text-lg shadow-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            {procesando ? <Loader2 className="w-5 h-5 animate-spin" /> : "CONFIRMAR (Enter)"}
          </button>
        </footer>
      </div>
    </div>
  )
}
