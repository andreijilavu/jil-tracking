import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, onValue, update } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAU12jYMQtirSKIaltLF678yvm3dqLqo_8",
  authDomain: "jil-logistics.firebaseapp.com",
  databaseURL: "https://jil-logistics-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "jil-logistics",
  storageBucket: "jil-logistics.firebasestorage.app",
  messagingSenderId: "726770408967",
  appId: "1:726770408967:web:28e201b0a03d5c4c13d4a2",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

const STATUSES = [
  { id: "pickup_arrived", emoji: "📍", label: "Arrived at pickup", en: "Driver arrived at pickup location" },
  { id: "boxes_loaded", emoji: "📦", label: "Boxes loaded", en: "Boxes are loaded into the vehicle" },
  { id: "obc_dropped", emoji: "🚦", label: "OBC dropped", en: "OBC was dropped at the hotel / airport" },
  { id: "driver_enroute", emoji: "🚗", label: "Driver en route", en: "Driver is on his way to delivery address" },
  { id: "driver_arrived", emoji: "📍", label: "Arrived at delivery", en: "Driver reached delivery location" },
  { id: "boxes_unloaded", emoji: "✅", label: "Boxes unloaded", en: "Boxes removed from vehicle" },
  { id: "pod_signed", emoji: "📋", label: "POD signed", en: "POD signed and confirmed by recipient" },
  { id: "job_complete", emoji: "🏁", label: "Job complete", en: "Job correctly done — POD follows" },
];

const S = {
  bg: "#060E1C", card: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)",
  borderBlue: "rgba(77,170,255,0.18)", blue: "#1A5FD4", accent: "#3FA8FF",
  gold: "#F5B700", white: "#EDF3FF", gray: "#6A87B0", light: "#9BB5D8",
  success: "#1DB954", danger: "#FF4444", warning: "#F5A623",
};

const formatTime = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) + " LT";

function DriverView({ jobRef }) {
  const [sentIds, setSentIds] = useState(new Set());
  const [note, setNote] = useState("");
  const [eta, setEta] = useState("");
  const [lastSent, setLastSent] = useState(null);
  const [jobData, setJobData] = useState(null);
  const dbRef = ref(db, `jobs/${jobRef}`);

  useEffect(() => {
    const unsub = onValue(dbRef, snap => {
      const data = snap.val();
      if (data) {
        setJobData(data);
        const ids = new Set(Object.values(data.updates || {}).map(u => u.statusId));
        setSentIds(ids);
        if (data.eta) setEta(data.eta);
      }
    });
    return unsub;
  }, [jobRef]);

  const sendStatus = async (status) => {
    if (sentIds.has(status.id)) return;
    const updatesRef = ref(db, `jobs/${jobRef}/updates`);
    await push(updatesRef, {
      statusId: status.id, emoji: status.emoji, label: status.label,
      message: status.en + (note ? ` — ${note}` : ""),
      time: formatTime(), forwarded: false, ts: Date.now(),
    });
    setLastSent(status.id);
    setNote("");
    setTimeout(() => setLastSent(null), 2000);
  };

  const saveETA = async (val) => {
    setEta(val);
    await update(ref(db, `jobs/${jobRef}`), { eta: val });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#040B16", color: S.white, fontFamily: "sans-serif", paddingBottom: 80 }}>
      <div style={{ background: "linear-gradient(180deg,#071422 0%,#040B16 100%)", borderBottom: `1px solid ${S.border}`, padding: "20px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: S.success, boxShadow: `0 0 8px ${S.success}` }} />
          <span style={{ fontSize: 11, color: S.success, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Live Mission</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>🚗 Driver Panel</div>
        <div style={{ fontSize: 13, color: S.light, marginTop: 2 }}>{jobRef} · <span style={{ color: S.accent }}>{jobData?.route || "..."}</span></div>
      </div>
      <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: S.gray, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>ETA</div>
          <input type="time" value={eta} onChange={e => saveETA(e.target.value)} style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${S.accent}44`, borderRadius: 10, padding: "10px 14px", color: S.white, fontSize: 20, fontWeight: 700, outline: "none", width: "100%", boxSizing: "border-box" }} />
        </div>
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: "14px 18px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: S.gray, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Notă extra</div>
          <input placeholder="ex: delay traffic..." value={note} onChange={e => setNote(e.target.value)} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${S.border}`, borderRadius: 10, padding: "9px 12px", color: S.white, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" }} />
        </div>
        <div style={{ fontSize: 11, color: S.gray, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Status</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {STATUSES.map(s => {
            const done = sentIds.has(s.id);
            return (
              <button key={s.id} onClick={() => sendStatus(s)} disabled={done} style={{ display: "flex", alignItems: "center", gap: 14, background: done ? "rgba(29,185,84,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${done ? S.success + "44" : S.border}`, borderRadius: 14, padding: "14px 18px", cursor: done ? "default" : "pointer", color: done ? S.success : S.white, textAlign: "left" }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{done ? "✅" : s.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: done ? S.success : S.gray, marginTop: 2 }}>{s.en}</div>
                </div>
                {done && <span style={{ fontSize: 11, color: S.success, fontWeight: 700 }}>SENT ✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BrokerView({ jobRef }) {
  const [updates, setUpdates] = useState([]);
  const [jobData, setJobData] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [allCopied, setAllCopied] = useState(false);
  const prevCountRef = useRef(0);

  useEffect(() => {
    const dbRef = ref(db, `jobs/${jobRef}`);
    const unsub = onValue(dbRef, snap => {
      const data = snap.val();
      if (data) {
        setJobData(data);
        const upds = Object.entries(data.updates || {}).map(([k, v]) => ({ ...v, key: k })).sort((a, b) => a.ts - b.ts);
        if (upds.length > prevCountRef.current && navigator.vibrate) navigator.vibrate(200);
        prevCountRef.current = upds.length;
        setUpdates(upds);
      }
    });
    return unsub;
  }, [jobRef]);

  const buildLine = (u) => `${u.emoji} ${u.time} — ${u.message}`;
  const buildFull = () => {
    const lines = updates.map(buildLine).join("\n");
    const eta = jobData?.eta ? `\n\n⏱ ETA: ${jobData.eta} LT` : "";
    return `*${jobRef} — ${jobData?.route || ""}*\n\n${lines}${eta}`;
  };

  const markFwd = async (key) => await update(ref(db, `jobs/${jobRef}/updates/${key}`), { forwarded: true });

  const copyOne = async (u) => {
    await navigator.clipboard.writeText(buildLine(u));
    await markFwd(u.key);
    setCopiedId(u.key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(buildFull());
    for (const u of updates) await markFwd(u.key);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2500);
  };

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.white, fontFamily: "sans-serif", paddingBottom: 80 }}>
      <div style={{ background: "linear-gradient(180deg,#0A1628 0%,#060E1C 100%)", borderBottom: `1px solid rgba(58,168,255,0.2)`, padding: "20px 20px 16px" }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>🧑‍💼 JIL — Broker Panel</div>
        <div style={{ fontSize: 13, color: S.light, marginTop: 2 }}>{jobRef} · <span style={{ color: S.accent }}>{jobData?.route || "..."}</span></div>
        {jobData?.eta && <div style={{ marginTop: 8, display: "inline-block", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: S.gold, background: S.gold + "20" }}>⏱ ETA {jobData.eta} LT</div>}
      </div>
      <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto" }}>
        {updates.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: S.gray }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
            <div style={{ fontSize: 16, color: S.light }}>Aștepți update-uri...</div>
          </div>
        ) : (
          <>
            <button onClick={copyAll} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: allCopied ? S.success : `linear-gradient(135deg,${S.blue},${S.accent})`, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", marginBottom: 16 }}>
              {allCopied ? "✅ Copiat! Paste în WhatsApp →" : `📋 Copiază tot (${updates.length} update-uri)`}
            </button>
            <div style={{ background: "#0A1E10", border: `1px solid ${S.success}33`, borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
              <pre style={{ margin: 0, fontSize: 12, color: S.light, lineHeight: 1.9, fontFamily: "inherit", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{buildFull()}</pre>
            </div>
            {updates.map(u => (
              <div key={u.key} style={{ background: u.forwarded ? "rgba(29,185,84,0.05)" : S.card, border: `1px solid ${u.forwarded ? S.success + "33" : S.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 18 }}>{u.emoji}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: S.accent }}>{u.time}</span>
                      {u.forwarded && <span style={{ fontSize: 10, fontWeight: 700, color: S.success }}>✓ forwarded</span>}
                    </div>
                    <div style={{ fontSize: 13, color: S.light }}>{u.message}</div>
                  </div>
                  <button onClick={() => copyOne(u)} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${S.border}`, borderRadius: 9, padding: "6px 12px", color: S.gray, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    {copiedId === u.key ? "✓" : "Copy"}
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function SetupView({ onCreate }) {
  const [form, setForm] = useState({ ref: "", route: "", broker: "" });

  const create = async () => {
    if (!form.ref || !form.route) return;
    const jobRef = ref(db, `jobs/${form.ref}`);
    await update(jobRef, { ...form, createdAt: Date.now(), updates: {} });
    onCreate(form.ref);
  };

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.white, fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✈️</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>JIL Live Tracking</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(77,170,255,0.18)", borderRadius: 20, padding: 24 }}>
          {["ref", "route", "broker"].map(key => (
            <div key={key} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: S.gray, textTransform: "uppercase", marginBottom: 6 }}>{key}</div>
              <input placeholder={key === "ref" ? "ex: GRT24042026" : key === "route" ? "ex: BBU → Bacău" : "ex: Modus Operations"} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: `1px solid rgba(77,170,255,0.2)`, borderRadius: 10, padding: "11px 14px", color: S.white, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}
          <button onClick={create} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: `linear-gradient(135deg,${S.blue},${S.accent})`, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>Creează Job →</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("broker");
  const [jobRef, setJobRef] = useState("GRT24042026");
  const [setup, setSetup] = useState(false);

  return (
    <div>
      {setup ? <SetupView onCreate={(r) => { setJobRef(r); setSetup(false); }} /> : view === "broker" ? <BrokerView jobRef={jobRef} /> : <DriverView jobRef={jobRef} />}
      <div style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", display: "flex", background: "rgba(6,14,28,0.97)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 50, padding: 4, gap: 4, zIndex: 999, backdropFilter: "blur(12px)" }}>
        <button onClick={() => { setView("broker"); setSetup(false); }} style={{ padding: "8px 16px", borderRadius: 50, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: view === "broker" && !setup ? S.blue : "transparent", color: view === "broker" && !setup ? "#fff" : S.gray }}>🧑‍💼 Andrei</button>
        <button onClick={() => { setView("driver"); setSetup(false); }} style={{ padding: "8px 16px", borderRadius: 50, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: view === "driver" && !setup ? S.success : "transparent", color: view === "driver" && !setup ? "#fff" : S.gray }}>🚗 Driver</button>
        <button onClick={() => setSetup(true)} style={{ padding: "8px 16px", borderRadius: 50, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: setup ? S.gold : "transparent", color: setup ? "#000" : S.gray }}>➕ Job</button>
      </div>
    </div>
  );
}