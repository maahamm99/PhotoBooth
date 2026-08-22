import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket.js";

function ensureConnected(cb) {
  if (socket.connected) return cb();
  socket.once("connect", cb);
  socket.connect();
}

export default function Home() {
  const navigate = useNavigate();
  const [createName, setCreateName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  function handleCreate(e) {
    e.preventDefault();
    if (!createName.trim()) return;
    setBusy("create");
    ensureConnected(() => {
      socket.emit("room:create", { name: createName.trim() }, (res) => {
        setBusy("");
        if (res?.ok) {
          navigate(`/b/${res.room.code}`, { state: { name: createName.trim(), initialRoom: res.room } });
        }
      });
    });
  }

  function handleJoin(e) {
    e.preventDefault();
    if (!joinName.trim() || !joinCode.trim()) return;
    setError("");
    setBusy("join");
    ensureConnected(() => {
      socket.emit("room:join", { code: joinCode.trim(), name: joinName.trim() }, (res) => {
        setBusy("");
        if (res?.ok) {
          navigate(`/b/${res.room.code}`, { state: { name: joinName.trim(), initialRoom: res.room } });
        } else {
          setError(res?.error || "Couldn't join that booth.");
        }
      });
    });
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="brand">
          <span className="brand__mark">📸</span> Together Booth
        </div>
        <h1>
          One photo booth. <br />
          <span className="hero__accent">Every city you love.</span>
        </h1>
        <p className="hero__lede">
          Open a booth, send the code to the people you miss, and step in front of your own cameras at the same
          moment. Everyone walks away with the exact same strip — same filter, same frame, same silly countdown.
        </p>
      </header>

      <main className="card-grid">
        <section className="card">
          <h2>Start a booth</h2>
          <p className="card__sub">You'll pick the filter, frame and layout everyone shares.</p>
          <form onSubmit={handleCreate}>
            <label>
              Your name
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Amara"
                maxLength={24}
              />
            </label>
            <button type="submit" className="btn btn--primary" disabled={busy === "create"}>
              {busy === "create" ? "Opening…" : "Open a new booth"}
            </button>
          </form>
        </section>

        <section className="card">
          <h2>Join with a code</h2>
          <p className="card__sub">Got a code from a friend? Hop into their booth.</p>
          <form onSubmit={handleJoin}>
            <label>
              Your name
              <input
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="e.g. Diego"
                maxLength={24}
              />
            </label>
            <label>
              Booth code
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABCDE"
                maxLength={6}
                className="input--code"
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn--secondary" disabled={busy === "join"}>
              {busy === "join" ? "Joining…" : "Join booth"}
            </button>
          </form>
        </section>
      </main>

      <section className="steps">
        <div className="step">
          <span className="step__num">1</span>
          <h3>Open or join</h3>
          <p>One person opens a booth and shares the 5-letter code. Everyone else joins from wherever they are.</p>
        </div>
        <div className="step">
          <span className="step__num">2</span>
          <h3>Pick a look</h3>
          <p>The host chooses a filter, a frame color and a layout — it applies live to everyone's booth.</p>
        </div>
        <div className="step">
          <span className="step__num">3</span>
          <h3>Say cheese, together</h3>
          <p>A synced countdown fires on every screen at once, and your matching strip is ready to download.</p>
        </div>
      </section>

      <footer className="footer">Made for the people you'd love to be in the same room with.</footer>
    </div>
  );
}
