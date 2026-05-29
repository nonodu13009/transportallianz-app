"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { logPageView } from "@/lib/logger";
import Navbar from "@/components/Navbar";
import SyntheseDashboard from "@/components/SyntheseDashboard";

export default function DashboardPage() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      logPageView(user.email || "", user.uid, "/dashboard");
    }
  }, [user]);

  return (
    <>
      <Navbar activePage="synthese" />
      <SyntheseDashboard />
    </>
  );
}
