"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { ShoppingCart, Loader2 } from "lucide-react"
import { entrarComoDemo } from "@/lib/demo"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError("Email o contraseña incorrectos")
      setLoading(false)
      return
    }
    router.push("/")
    router.refresh()
  }

  const handleDemo = async () => {
    setDemoLoading(true)
    setError(null)
    const { ok, error } = await entrarComoDemo()
    if (!ok) {
      setError(error ?? "Error al entrar al demo")
      setDemoLoading(false)
      return
    }
    router.push("/")
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,oklch(0.83_0.17_163/0.07),transparent)]" />

      <div className="w-full max-w-sm relative">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mb-5 shadow-[0_0_40px_oklch(0.83_0.17_163/0.4)]">
            <ShoppingCart className="h-8 w-8 text-accent-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Bienvenido</h1>
          <p className="text-muted-foreground text-sm mt-1">Ingresá a tu comercio</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-2 tracking-widest">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-border bg-secondary text-foreground rounded-xl px-4 py-3 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all placeholder:text-muted-foreground/50 text-sm"
                placeholder="tu@comercio.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-2 tracking-widest">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-border bg-secondary text-foreground rounded-xl px-4 py-3 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all placeholder:text-muted-foreground/50 text-sm"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-destructive text-sm text-center bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-accent-foreground font-bold py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_oklch(0.83_0.17_163/0.25)] text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ingresando...
                </span>
              ) : "INGRESAR"}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-xs text-muted-foreground">o continuá sin cuenta</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDemo}
            disabled={demoLoading}
            className="w-full border border-border text-foreground font-semibold py-3.5 rounded-xl hover:bg-secondary active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
          >
            {demoLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando demo...
              </span>
            ) : "✦ Probar sin cuenta →"}
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          ¿No tenés cuenta?{" "}
          <a href="/signup" className="text-accent font-semibold hover:underline">
            Registrate
          </a>
        </p>
      </div>
    </main>
  )
}
