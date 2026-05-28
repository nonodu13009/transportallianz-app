import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const SESSIONS = "sessions";
const LOGS = "logs";

async function fetchClientIP(): Promise<string> {
  try {
    const res = await fetch("/api/ip");
    if (res.ok) {
      const data = await res.json();
      return data.ip || "unknown";
    }
  } catch {
    // silent fail
  }
  return "unknown";
}

export async function logLogin(email: string, uid: string) {
  const ip = await fetchClientIP();

  const sessionRef = await addDoc(collection(db, SESSIONS), {
    uid,
    email,
    ip,
    loginAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
    logoutAt: null,
    duration: null,
    userAgent: navigator.userAgent,
    screenWidth: window.innerWidth,
  });

  await addDoc(collection(db, LOGS), {
    uid,
    email,
    ip,
    action: "login",
    timestamp: serverTimestamp(),
    userAgent: navigator.userAgent,
  });

  return sessionRef.id;
}

export async function logLogout(sessionId: string, email: string, uid: string) {
  if (!sessionId) return;

  const sessionRef = doc(db, SESSIONS, sessionId);
  await updateDoc(sessionRef, {
    logoutAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
  });

  await addDoc(collection(db, LOGS), {
    uid,
    email,
    action: "logout",
    timestamp: serverTimestamp(),
  });
}

export async function heartbeat(sessionId: string) {
  if (!sessionId) return;
  const sessionRef = doc(db, SESSIONS, sessionId);
  await updateDoc(sessionRef, {
    lastSeen: serverTimestamp(),
  });
}

export async function logPageView(email: string, uid: string, page: string) {
  await addDoc(collection(db, LOGS), {
    uid,
    email,
    action: "pageview",
    page,
    timestamp: serverTimestamp(),
  });
}
