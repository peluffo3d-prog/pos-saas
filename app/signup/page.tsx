"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { ShoppingCart, Loader2 } from "lucide-react"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push("/onboarding")
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
          <h1 className="font-display text-3xl font-bold text-foreground">Crear cuenta</h1>
          <p className="text-muted-foreground text-sm mt-1">Registrá tu comercio</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSignup} className="space-y-4">
            {[
              { label: "Email", value: email, setter: setEmail, type: "email", placeholder: "tu@comercio.com", autoComplete: "email" },
              { label: "Contraseña", value: password, setter: setPassword, type: "password", placeholder: "Mínimo 6 caracteres", autoComplete: "new-password" },
              { label: "Confirmar contraseña", value: confirmPassword, setter: setConfirmPassword, type: "password", placeholder: "••••••••", autoComplete: "new-password" },
            ].map(({ label, value, setter, type, placeholder, autoComplete }) => (
              <div key={label}>
                <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-2 tracking-widest">
                  {label}
                </label>
                <input
                  type={type}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  required
                  className="w-full border border-border bg-secondary text-foreground rounded-xl px-4 py-3 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all placeholder:text-muted-foreground/50 text-sm"
                  placeholder={placeholder}
                  autoComplete={autoComplete}
                />
              </div>
            ))}

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
                  Creando cuenta...
                </span>
              ) : "REGISTRARME"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          ¿Ya tenés cuenta?{" "}
          <a href="/login" className="text-accent font-semibold hover:underline">
            Ingresá
          </a>
        </p>
      </div>
    </main>
  )
}
