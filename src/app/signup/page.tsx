"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erreur lors de la creation";
      if (msg.includes("email-already-in-use")) {
        setError("Un compte existe deja avec cet email.");
      } else if (msg.includes("invalid-email")) {
        setError("Adresse email invalide.");
      } else if (msg.includes("weak-password")) {
        setError("Le mot de passe doit contenir au moins 6 caracteres.");
      } else {
        setError("Erreur lors de la creation du compte.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("popup-closed")) {
        setError("Erreur de connexion Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--ink)] mb-8 transition-colors"
        >
          <ArrowLeft size={14} />
          Retour a la connexion
        </Link>

        <div className="bg-white border border-[var(--line)] rounded-[14px] p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-[34px] h-[34px] rounded-lg bg-[var(--ink)] text-white grid place-items-center font-bold text-lg tracking-tight">
              /A
            </span>
            <div className="leading-tight">
              <div className="font-semibold text-[15px]">
                Portefeuille Transport
              </div>
              <div className="text-xs text-[var(--muted)]">
                Allianz Nogaro &amp; Boetti
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight mb-1">
            Creer un compte
          </h1>
          <p className="text-sm text-[var(--muted)] mb-6">
            Inscrivez-vous pour acceder au portefeuille.
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-[var(--bad-bg)] text-[var(--bad-fg)] text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold tracking-wide uppercase text-[var(--muted)] mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom@exemple.fr"
                className="w-full px-4 py-3 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-sm outline-none focus:border-[var(--sage-deep)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wide uppercase text-[var(--muted)] mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6 caracteres minimum"
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-sm outline-none focus:border-[var(--sage-deep)] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
                  aria-label={showPw ? "Masquer" : "Afficher"}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wide uppercase text-[var(--muted)] mb-1.5">
                Confirmer le mot de passe
              </label>
              <input
                type={showPw ? "text" : "password"}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Retapez votre mot de passe"
                className="w-full px-4 py-3 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-sm outline-none focus:border-[var(--sage-deep)] transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-[var(--ink)] text-white text-sm font-medium hover:bg-[#2a2828] transition-colors disabled:opacity-50"
            >
              {loading ? "Creation..." : "Creer mon compte"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[var(--line)]" />
            <span className="text-xs text-[var(--muted)]">ou</span>
            <div className="flex-1 h-px bg-[var(--line)]" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full py-3 rounded-full border border-[var(--line)] bg-white text-sm font-medium hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                fill="#EA4335"
              />
            </svg>
            Continuer avec Google
          </button>

          <p className="text-center text-sm text-[var(--muted)] mt-5">
            Deja un compte ?{" "}
            <Link
              href="/login"
              className="text-[var(--ink)] font-medium hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-[var(--muted)] mt-6">
          Agence Allianz Marseille : Nogaro &amp; Boetti
        </p>
      </div>
    </div>
  );
}
