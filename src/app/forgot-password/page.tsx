"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erreur";
      if (msg.includes("user-not-found")) {
        setError("Aucun compte avec cet email.");
      } else if (msg.includes("invalid-email")) {
        setError("Adresse email invalide.");
      } else if (msg.includes("too-many-requests")) {
        setError("Trop de tentatives. Reessayez plus tard.");
      } else {
        setError("Erreur lors de l envoi. Verifiez votre email.");
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

          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-[var(--good-bg)] text-[var(--good-fg)] grid place-items-center mx-auto mb-4">
                <Mail size={24} />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight mb-2">
                Email envoye
              </h1>
              <p className="text-sm text-[var(--muted)] mb-6">
                Un lien de reinitialisation a ete envoye a{" "}
                <span className="font-medium text-[var(--ink)]">{email}</span>.
                <br />
                Verifiez votre boite de reception et vos spams.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full py-3 rounded-full bg-[var(--ink)] text-white text-sm font-medium hover:bg-[#2a2828] transition-colors"
              >
                Retour a la connexion
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight mb-1">
                Mot de passe oublie
              </h1>
              <p className="text-sm text-[var(--muted)] mb-6">
                Entrez votre email pour recevoir un lien de reinitialisation.
              </p>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-[var(--bad-bg)] text-[var(--bad-fg)] text-sm font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4">
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
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-full bg-[var(--ink)] text-white text-sm font-medium hover:bg-[#2a2828] transition-colors disabled:opacity-50"
                >
                  {loading ? "Envoi..." : "Envoyer le lien"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-[var(--muted)] mt-6">
          Agence Allianz Marseille : Nogaro &amp; Boetti
        </p>
      </div>
    </div>
  );
}
