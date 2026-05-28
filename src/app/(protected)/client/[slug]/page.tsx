"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { logPageView } from "@/lib/logger";
import FicheClientView from "@/components/FicheClient";
import type { FicheClient } from "@/types/fiche";

export default function ClientPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<FicheClient | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (user && slug) {
      logPageView(user.email || "", user.uid, `/client/${slug}`);
    }
  }, [user, slug]);

  useEffect(() => {
    if (!slug) return;
    import(`@/data/fiches/${slug}.json`)
      .then((mod) => setData(mod.default || mod))
      .catch(() => setError(true));
  }, [slug]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Fiche introuvable</div>
          <div className="text-sm text-[var(--muted)]">
            Le client &laquo;{slug}&raquo; n existe pas.
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-sm text-[var(--muted)]">Chargement...</div>
      </div>
    );
  }

  return <FicheClientView data={data} />;
}
