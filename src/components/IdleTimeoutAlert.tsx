"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { AlertTriangle } from "lucide-react";

const IDLE_LIMIT = 5 * 60 * 1000; // 5 minutes
const WARNING_BEFORE = 60 * 1000; // alerte 60s avant deconnexion

export default function IdleTimeoutAlert() {
  const { logout } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef<number>(Date.now() + IDLE_LIMIT);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const resetIdle = useCallback(() => {
    clearTimers();
    setSecondsLeft(null);
    deadlineRef.current = Date.now() + IDLE_LIMIT;

    // Declenche l'alerte WARNING_BEFORE ms avant la deadline
    timerRef.current = setTimeout(() => {
      const deadline = deadlineRef.current;
      setSecondsLeft(Math.ceil((deadline - Date.now()) / 1000));

      countdownRef.current = setInterval(() => {
        const remaining = Math.ceil((deadline - Date.now()) / 1000);
        if (remaining <= 0) {
          clearTimers();
          logout();
        } else {
          setSecondsLeft(remaining);
        }
      }, 1000);
    }, IDLE_LIMIT - WARNING_BEFORE);
  }, [clearTimers, logout]);

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];

    const handleActivity = () => {
      // Si le countdown est actif, un mouvement annule la deconnexion
      resetIdle();
    };

    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    resetIdle();

    return () => {
      clearTimers();
      events.forEach((e) => window.removeEventListener(e, handleActivity));
    };
  }, [resetIdle, clearTimers]);

  if (secondsLeft === null) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
          <AlertTriangle className="text-amber-600" size={28} />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Session inactive
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Vous serez deconnecte dans
        </p>
        <div className="text-4xl font-bold text-red-600 tabular-nums mb-4">
          {secondsLeft}s
        </div>
        <button
          onClick={resetIdle}
          className="w-full py-2.5 px-4 bg-[#003DA5] text-white text-sm font-medium rounded-lg hover:bg-[#002d7a] transition-colors"
        >
          Rester connecte
        </button>
      </div>
    </div>
  );
}
