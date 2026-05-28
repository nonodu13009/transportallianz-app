"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { logPageView } from "@/lib/logger";

export default function DashboardPage() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      logPageView(user.email || "", user.uid, "/dashboard");
    }
  }, [user]);

  return (
    <iframe
      src="/reports/synthese.html"
      className="w-full min-h-screen border-0"
      title="Synthese portefeuille"
    />
  );
}
