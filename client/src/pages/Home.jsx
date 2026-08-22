import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket.js";
import Footer from "../components/Footer.jsx";
import BoothIllustration from "../components/BoothIllustration.jsx";

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
    <div className="page-fixed">
      <header className="top-bar">
        <h1 className="wordmark">Together Booth</h1>
        <p className="tagline">a long-distance photo booth for you &amp; your people</p>
      </header>

      <main className="home-columns">
        <section className="home-col home-col--intro">
          <BoothIllustration />
          <p className="home-col__lede">
            Open a booth, send the code to the people you miss, and step in front of your own cameras at the same
            moment — one matching strip, made together from wherever you all are.
          </p>
        </section>

        <section className="home-col home-col--form">
          <h2>Start a booth</h2>
          <p className="home-col__sub">You'll set the filter, color and shape everyone shares.</p>
          <form onSubmit={handleCreate}>
            <label>
              Your name
              <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g. Amara" maxLength={24} />
            </label>
            <button type="submit" className="btn btn--primary" disabled={busy === "create"}>
              {busy === "create" ? "Opening…" : "Open a new booth"}
            </button>
          </form>
        </section>

        <section className="home-col home-col--form">
          <h2>Join with a code</h2>
          <p className="home-col__sub">Got a code from a friend? Hop into their booth.</p>
          <form onSubmit={handleJoin}>
            <label>
              Your name
              <input value={joinName} onChange={(e) => setJoinName(e.target.value)} placeholder="e.g. Diego" maxLength={24} />
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

      <Footer />
    </div>
  );
}
