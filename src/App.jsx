import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, onValue, update, set } from "firebase/database";

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

const getRouteFromURL = () => {
  const path = window.location.pathname;
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "driver" && parts[1]) return { mode: "driver", jobRef: parts[1] };
  if (parts[0] === "broker" && parts[1]) return { mode: "broker", jobRef: parts[1] };
  return { mode: "home", jobRef: null };
};

function DriverView({ jobRef }) {
  const [sentIds, setSentIds] = useState(new Set());
  const [note, setNote] = useState("");
  const [eta, setEta] = useState("");
  const [lastSent, setLastSent] = useState(null);
  const [jobData, setJobData] = useState(null);

  useEffect(() => {
    const dbRef = ref(db, `jobs/${jobRef}`);
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
        <div style={{ fontSize: 13, color: S.light, marginTop: 2 }}>
          Ref: <span style={{ color: S.accent }}>{jobRef}</span> · {jobData?.route || "..."}
        </div>
      </div>
      <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: S.gray, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>ETA (Local Time)</div>
          <input type="time" value={eta} onChange={e => saveETA(e.target.value)} style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${S.accent}44`, borderRadius: 10, padding: "10px 14px", color: S.white, fontSize: 20, fontWeight: 700, outline: "none", width: "100%", boxSizing: "border-box" }} />
        </div>
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: "14px 18px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: S.gray, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Notă extra (opțional)</div>
          <input placeholder="ex: delay traffic, 2 boxes only..." value={note} onChange={e => setNote(e.target.value)} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${S.border}`, borderRadius: 10, padding: "9px 12px", color: S.white, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" }} />
        </div>
        <div style={{ fontSize: 11, color: S.gray, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Trimite update status</div>
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
  const [driverLinkCopied, setDriverLinkCopied] = useState(false);
  const prevCountRef = useRef(0);
  const driverLink = `https://www.jil-logistics.com/driver/${jobRef}`;

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
  const copyDriverLink = async () => {
    await navigator.clipboard.writeText(driverLink);
    setDriverLinkCopied(true);
    setTimeout(() => setDriverLinkCopied(false), 2500);
  };

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.white, fontFamily: "sans-serif", paddingBottom: 80 }}>
      <div style={{ background: "linear-gradient(180deg,#0A1628 0%,#060E1C 100%)", borderBottom: `1px solid rgba(58,168,255,0.2)`, padding: "20px 20px 16px" }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>🧑‍💼 JIL — Broker Panel</div>
        <div style={{ fontSize: 13, color: S.light, marginTop: 2 }}>{jobRef} · <span style={{ color: S.accent }}>{jobData?.route || "..."}</span></div>
        {jobData?.eta && <div style={{ marginTop: 8, display: "inline-block", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: S.gold, background: S.gold + "20" }}>⏱ ETA {jobData.eta} LT</div>}
      </div>
      <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ background: "rgba(29,185,84,0.08)", border: `1px solid ${S.success}33`, borderRadius: 16, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: S.success, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontWeight: 700 }}>🔗 Link pentru șofer</div>
          <div style={{ fontSize: 12, color: S.light, marginBottom: 10, wordBreak: "break-all" }}>{driverLink}</div>
          <button onClick={copyDriverLink} style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${S.success}44`, background: driverLinkCopied ? S.success : "rgba(29,185,84,0.15)", color: driverLinkCopied ? "#fff" : S.success, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {driverLinkCopied ? "✅ Copiat! Trimite pe WhatsApp →" : "📋 Copiază link șofer"}
          </button>
          <div style={{ fontSize: 11, color: S.gray, marginTop: 8 }}>⚠️ Șoferul vede doar ruta și butoanele</div>
        </div>
        {updates.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: S.gray }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
            <div style={{ fontSize: 16, color: S.light }}>Aștepți update-uri de la driver...</div>
          </div>
        ) : (
          <>
            <button onClick={copyAll} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: allCopied ? S.success : `linear-gradient(135deg,${S.blue},${S.accent})`, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", marginBottom: 16 }}>
              {allCopied ? "✅ Copiat! Paste în WhatsApp →" : `📋 Copiază tot (${updates.length})`}
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
                  <button onClick={() => copyOne(u)} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${S.border}`, borderRadius: 9, padding: "6px 12px", color: copiedId === u.key ? S.success : S.gray, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
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

function HomeView() {
  const [jobs, setJobs] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ ref: "", route: "", broker: "" });
  const [created, setCreated] = useState(null);

  useEffect(() => {
    const dbRef = ref(db, "jobs");
    const unsub = onValue(dbRef, snap => {
      const data = snap.val();
      if (data) {
        const list = Object.entries(data).map(([k, v]) => ({ id: k, ...v })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setJobs(list);
      }
    });
    return unsub;
  }, []);

  const createJob = async () => {
    if (!form.ref || !form.route) return;
    await set(ref(db, `jobs/${form.ref}`), {
      ref: form.ref, route: form.route, broker: form.broker,
      createdAt: Date.now(), updates: {},
    });
    setCreated(form.ref);
    setForm({ ref: "", route: "", broker: "" });
    setShowNew(false);
  };

  const inp = (label, key, placeholder) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: S.gray, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <input placeholder={placeholder} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: `1px solid rgba(77,170,255,0.2)`, borderRadius: 10, padding: "11px 14px", color: S.white, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.white, fontFamily: "sans-serif", paddingBottom: 80 }}>
      <div style={{ background: "linear-gradient(180deg,#0A1628 0%,#060E1C 100%)", borderBottom: `1px solid rgba(58,168,255,0.2)`, padding: "20px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg, #1A5FD4, #3FA8FF)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13 }}>JIL</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>JIL Live Tracking</div>
            <div style={{ fontSize: 11, color: S.gray }}>OBC Aviation Logistics</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto" }}>
        {created && (
          <div style={{ background: "rgba(29,185,84,0.1)", border: `1px solid ${S.success}44`, borderRadius: 16, padding: "16px 18px", marginBottom: 20 }}>
            <div style={{ fontWeight: 700, color: S.success, marginBottom: 8 }}>✅ Job creat!</div>
            <div style={{ fontSize: 12, color: S.light, marginBottom: 6 }}><strong>Tu (broker):</strong> <span style={{ color: S.accent }}>jil-logistics.com/broker/{created}</span></div>
            <div style={{ fontSize: 12, color: S.light, marginBottom: 12 }}><strong>Șofer:</strong> <span style={{ color: S.success }}>jil-logistics.com/driver/{created}</span></div>
            <button onClick={() => navigator.clipboard.writeText(`https://www.jil-logistics.com/driver/${created}`)} style={{ width: "100%", padding: 10, borderRadius: 10, border: "none", background: S.success, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              📋 Copiază link șofer
            </button>
          </div>
        )}
        <button onClick={() => setShowNew(true)} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: `linear-gradient(135deg, ${S.blue}, ${S.accent})`, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", marginBottom: 24 }}>➕ Job nou</button>
        {showNew && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(77,170,255,0.18)`, borderRadius: 20, padding: 20, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Job nou</div>
            {inp("Referință / Nume job", "ref", "ex: GRT25042026 sau orice")}
            {inp("Rută", "route", "ex: BBU → Bacău")}
            {inp("Broker (nu se vede de șofer)", "broker", "ex: Modus Operations")}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${S.border}`, background: "transparent", color: S.gray, fontWeight: 700, cursor: "pointer" }}>Anulează</button>
              <button onClick={createJob} style={{ flex: 2, padding: 12, borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${S.blue}, ${S.accent})`, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Creează →</button>
            </div>
          </div>
        )}
        <div style={{ fontSize: 11, color: S.gray, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Job-uri active</div>
        {jobs.length === 0 && <div style={{ color: S.gray, fontSize: 13, textAlign: "center", padding: 20 }}>Niciun job — creează primul!</div>}
        {jobs.map(job => (
          <div key={job.id} style={{ background: S.card, border: `1px solid ${S.borderBlue}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{job.ref}</div>
            <div style={{ fontSize: 12, color: S.gray, marginBottom: 10 }}>✈️ {job.route}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => window.location.href = `/broker/${job.ref}`} style={{ flex: 1, padding: "8px", borderRadius: 9, border: `1px solid ${S.blue}44`, background: S.blue + "22", color: S.accent, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🧑‍💼 Broker view</button>
              <button onClick={() => navigator.clipboard.writeText(`https://www.jil-logistics.com/driver/${job.ref}`)} style={{ flex: 1, padding: "8px", borderRadius: 9, border: `1px solid ${S.success}44`, background: S.success + "22", color: S.success, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>📋 Link șofer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState(getRouteFromURL());

  useEffect(() => {
    const handlePop = () => setRoute(getRouteFromURL());
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  if (route.mode === "driver") return <DriverView jobRef={route.jobRef} />;
  if (route.mode === "broker") return <BrokerView jobRef={route.jobRef} />;
  return <HomeView />;
}