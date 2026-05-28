"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erreur de connexion";
      if (msg.includes("invalid-credential") || msg.includes("wrong-password")) {
        setError("Email ou mot de passe incorrect.");
      } else if (msg.includes("user-not-found")) {
        setError("Aucun compte avec cet email.");
      } else if (msg.includes("too-many-requests")) {
        setError("Trop de tentatives. Reessayez plus tard.");
      } else {
        setError("Erreur de connexion. Verifiez vos identifiants.");
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
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--ink)] mb-8 transition-colors"
        >
          <ArrowLeft size={14} />
          Retour a l accueil
        </Link>

        {/* Card */}
        <div className="bg-white border border-[var(--line)] rounded-[14px] p-8">
          {/* Header */}
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
            Connexion
          </h1>
          <p className="text-sm text-[var(--muted)] mb-6">
            Acces reserve aux collaborateurs autorises.
          </p>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-[var(--bad-bg)] text-[var(--bad-fg)] text-sm font-medium">
              {error}
            </div>
          )}

          {/* Email form */}
          <form onSubmit={handleEmail} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold tracking-wide uppercase text-[var(--muted)] mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom@allianz-nogaro.fr"
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
                  placeholder="••••••••"
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
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-[var(--ink)] text-white text-sm font-medium hover:bg-[#2a2828] transition-colors disabled:opacity-50"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          {/* Separator */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[var(--line)]" />
            <span className="text-xs text-[var(--muted)]">ou</span>
            <div className="flex-1 h-px bg-[var(--line)]" />
          </div>

          {/* Google */}
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
        </div>

        <p className="text-center text-xs text-[var(--muted)] mt-6">
          Agence Allianz Nogaro &amp; Boetti / Kennedy-Rouviere
        </p>
      </div>
    </div>
  );
}
