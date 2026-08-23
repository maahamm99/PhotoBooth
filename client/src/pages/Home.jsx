import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket.js";
import { setPendingStream } from "../utils/mediaHandoff.js";
import Footer from "../components/Footer.jsx";
import BoothIllustration from "../components/BoothIllustration.jsx";

function ensureConnected(cb) {
  if (socket.connected) return cb();
  socket.once("connect", cb);
  socket.connect();
}

const CODE_SLOTS = ["A", "B", "C", "D", "E"];

export default function Home() {
  const navigate = useNavigate();
  const [createName, setCreateName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [codeChars, setCodeChars] = useState(["", "", "", "", ""]);
  const [createError, setCreateError] = useState("");
  const [joinError, setJoinError] = useState("");
  const [busy, setBusy] = useState("");

  const joinCode = codeChars.join("");

  function setCodeChar(i, value) {
    const next = [...codeChars];
    next[i] = value.slice(-1).toUpperCase();
    setCodeChars(next);
    if (next[i] && i < 4) {
      document.getElementById(`code-slot-${i + 1}`)?.focus();
    }
  }

  // getUserMedia() has to be called directly from this click (not a later
  // effect on the booth page) or mobile Safari silently refuses to show the
  // camera permission prompt at all.
  async function requestCamera() {
    return navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreateError("");
    setBusy("create");

    let stream;
    try {
      stream = await requestCamera();
    } catch (err) {
      setBusy("");
      setCreateError(err?.message || "Camera and microphone access was blocked. Allow access and try again.");
      return;
    }

    ensureConnected(() => {
      socket.emit("room:create", { name: createName.trim() }, (res) => {
        setBusy("");
        if (res?.ok) {
          setPendingStream(stream);
          navigate(`/b/${res.room.code}`, { state: { name: createName.trim(), initialRoom: res.room } });
        } else {
          stream.getTracks().forEach((t) => t.stop());
        }
      });
    });
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinName.trim() || joinCode.length < 5) return;
    setJoinError("");
    setBusy("join");

    let stream;
    try {
      stream = await requestCamera();
    } catch (err) {
      setBusy("");
      setJoinError(err?.message || "Camera and microphone access was blocked. Allow access and try again.");
      return;
    }

    ensureConnected(() => {
      socket.emit("room:join", { code: joinCode, name: joinName.trim() }, (res) => {
        setBusy("");
        if (res?.ok) {
          setPendingStream(stream);
          navigate(`/b/${res.room.code}`, { state: { name: joinName.trim(), initialRoom: res.room } });
        } else {
          stream.getTracks().forEach((t) => t.stop());
          setJoinError(res?.error || "Couldn't join that booth.");
        }
      });
    });
  }

  return (
    <div className="page-fixed">
      <header className="top-bar">
        <div className="wordmark-row">
          <h1 className="wordmark">
            Together
            <br />
            Booth
          </h1>
          <span className="badge badge--wiggle">say cheese</span>
        </div>
        <div className="tagline">
          <span className="tagline__dot" />a long-distance photo booth for you &amp; your people
        </div>
      </header>

      <main className="home-columns">
        <section className="home-col home-col--intro">
          <span className="washi washi--dashed" />
          <BoothIllustration />
          <p className="home-col__lede">
            Open a booth, send the code to the people you miss, and step in front of your own cameras at the same
            moment — one matching strip, made from wherever you all are.
          </p>
          <div className="pill-row">
            <span className="pill-tag pill-tag--rot-1">3 · 2 · 1</span>
            <span className="pill-tag pill-tag--fill pill-tag--rot-2">flash</span>
            <span className="pill-tag pill-tag--rot-3">4 shots</span>
          </div>
        </section>

        <section className="home-col home-col--form">
          <span className="washi washi--solid-ink" />
          <div className="home-col__heading">
            <span className="eyebrow">host</span>
            <h2>Start a booth</h2>
            <p className="home-col__sub">You set the filter, color and shape everyone shares.</p>
          </div>
          <form onSubmit={handleCreate}>
            <label>
              Your name
              <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g. Amara" maxLength={24} />
            </label>
            {createError && <p className="form-error">{createError}</p>}
            <button type="submit" className="btn btn--ink" disabled={busy === "create"}>
              {busy === "create" ? "Opening…" : "Open a new booth ✦"}
            </button>
          </form>
        </section>

        <section className="home-col home-col--form">
          <span className="washi washi--solid-red" />
          <div className="home-col__heading">
            <span className="eyebrow">guest</span>
            <h2>Join with a code</h2>
            <p className="home-col__sub">Got a code from a friend? Hop into their booth.</p>
          </div>
          <form onSubmit={handleJoin}>
            <label>
              Your name
              <input value={joinName} onChange={(e) => setJoinName(e.target.value)} placeholder="e.g. Diego" maxLength={24} />
            </label>
            <div className="code-slots-field">
              <span className="code-slots-field__label">Booth code</span>
              <div className="code-slots">
                {CODE_SLOTS.map((letter, i) => (
                  <input
                    key={i}
                    id={`code-slot-${i}`}
                    type="text"
                    maxLength={1}
                    placeholder={letter}
                    value={codeChars[i]}
                    onChange={(e) => setCodeChar(i, e.target.value)}
                    className="code-slot"
                  />
                ))}
              </div>
            </div>
            {joinError && <p className="form-error">{joinError}</p>}
            <button type="submit" className="btn btn--red" disabled={busy === "join"}>
              {busy === "join" ? "Joining…" : "Join booth →"}
            </button>
          </form>
        </section>
      </main>

      <Footer note="no accounts · strip expires in 24h" />
    </div>
  );
}
