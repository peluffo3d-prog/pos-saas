"use client"

import { useEffect, useRef, useState } from "react"
import { X, Loader2, ScanLine, AlertCircle } from "lucide-react"

interface ProductoEncontrado {
  nombre: string
  imagenUrl?: string
  categoria?: string
}

interface Props {
  onEncontrado: (producto: ProductoEncontrado) => void
  onCerrar: () => void
}

export function BarcodeScanner({ onEncontrado, onCerrar }: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<any>(null)
  const [estado, setEstado] = useState<"iniciando" | "escaneando" | "buscando" | "error">("iniciando")
  const [errorMsg, setErrorMsg] = useState("")
  const procesandoRef = useRef(false)

  useEffect(() => {
    let montado = true

    const iniciar = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode")
        if (!divRef.current || !montado) return

        const scanner = new Html5Qrcode("barcode-scanner-div")
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 120 } },
          async (codigo) => {
            if (procesandoRef.current) return
            procesandoRef.current = true
            setEstado("buscando")

            try {
              const res = await fetch(
                `https://world.openfoodfacts.org/api/v2/product/${codigo}.json?fields=product_name,product_name_es,image_front_url,categories_tags`
              )
              const data = await res.json()

              if (data.status === 1 && data.product) {
                const p = data.product
                const nombre =
                  p.product_name_es?.trim() ||
                  p.product_name?.trim() ||
                  ""

                if (!nombre) {
                  setEstado("escaneando")
                  procesandoRef.current = false
                  return
                }

                const mapCategoria = (tags: string[] = []): string => {
                  const s = tags.join(" ").toLowerCase()
                  if (s.includes("bebida") || s.includes("drink") || s.includes("agua") || s.includes("juice") || s.includes("soda")) return "Bebidas"
                  if (s.includes("cigarro") || s.includes("tabaco") || s.includes("cigarette")) return "Cigarrillos"
                  if (s.includes("alfajor")) return "Alfajores"
                  if (s.includes("golosina") || s.includes("candy") || s.includes("chocolate") || s.includes("caramel") || s.includes("gummy")) return "Golosinas"
                  if (s.includes("snack") || s.includes("chip") || s.includes("crisp") || s.includes("galleta") || s.includes("cracker")) return "Snacks"
                  return "Otros"
                }

                await scanner.stop()
                onEncontrado({
                  nombre,
                  imagenUrl: p.image_front_url ?? undefined,
                  categoria: mapCategoria(p.categories_tags),
                })
              } else {
                // Código no encontrado en Open Food Facts
                setEstado("escaneando")
                procesandoRef.current = false
              }
            } catch {
              setEstado("escaneando")
              procesandoRef.current = false
            }
          },
          () => {} // error de frame, ignorar
        )

        if (montado) setEstado("escaneando")
      } catch (e: any) {
        if (montado) {
          setEstado("error")
          setErrorMsg(e?.message?.includes("permission")
            ? "Permiso de cámara denegado. Habilitalo en la configuración del navegador."
            : "No se pudo acceder a la cámara.")
        }
      }
    }

    iniciar()

    return () => {
      montado = false
      scannerRef.current?.stop().catch(() => {})
    }
  }, [])

  const cerrar = () => {
    scannerRef.current?.stop().catch(() => {})
    onCerrar()
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-safe pt-6 pb-4">
        <div>
          <p className="text-white font-bold text-base">Escanear producto</p>
          <p className="text-white/50 text-xs mt-0.5">
            {estado === "iniciando" && "Iniciando cámara..."}
            {estado === "escaneando" && "Apuntá al código de barras"}
            {estado === "buscando" && "Buscando producto..."}
            {estado === "error" && "Error de cámara"}
          </p>
        </div>
        <button
          onClick={cerrar}
          className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Viewfinder */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {estado === "error" ? (
            <div className="bg-white/10 rounded-3xl p-8 text-center">
              <AlertCircle className="w-12 h-12 text-white/50 mx-auto mb-3" />
              <p className="text-white text-sm">{errorMsg}</p>
              <button
                onClick={cerrar}
                className="mt-4 bg-white/20 text-white px-6 py-2.5 rounded-xl text-sm font-semibold"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <div className="relative">
              {/* Cámara */}
              <div
                id="barcode-scanner-div"
                ref={divRef}
                className="w-full rounded-3xl overflow-hidden bg-black"
                style={{ minHeight: 280 }}
              />

              {/* Overlay con guías */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center rounded-3xl">
                {/* Esquinas */}
                <div className="absolute inset-8">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-accent rounded-tl-lg" style={{ borderWidth: "3px" }} />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-accent rounded-tr-lg" style={{ borderWidth: "3px" }} />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-accent rounded-bl-lg" style={{ borderWidth: "3px" }} />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-accent rounded-br-lg" style={{ borderWidth: "3px" }} />
                </div>

                {/* Línea de escaneo animada */}
                {estado === "escaneando" && (
                  <div className="absolute inset-x-8 h-0.5 bg-accent/80 animate-scan-line" />
                )}

                {/* Spinner buscando */}
                {(estado === "iniciando" || estado === "buscando") && (
                  <div className="bg-black/60 rounded-2xl px-6 py-4 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-accent animate-spin" />
                    <p className="text-white text-sm font-medium">
                      {estado === "iniciando" ? "Iniciando..." : "Buscando en base de datos..."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {estado === "escaneando" && (
            <div className="mt-5 flex items-center justify-center gap-2">
              <ScanLine className="w-4 h-4 text-white/40" />
              <p className="text-white/40 text-xs">
                Si el producto no está en la base de datos, podés cargarlo manualmente
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Safe area bottom */}
      <div className="h-10" />
    </div>
  )
}
