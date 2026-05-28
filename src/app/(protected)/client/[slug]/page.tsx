"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { logPageView } from "@/lib/logger";

export default function ClientPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  useEffect(() => {
    if (user && slug) {
      logPageView(user.email || "", user.uid, `/client/${slug}`);
    }
  }, [user, slug]);

  return (
    <iframe
      src={`/reports/fiche-${slug}.html`}
      className="w-full min-h-screen border-0"
      title={`Fiche client ${slug}`}
    />
  );
}
