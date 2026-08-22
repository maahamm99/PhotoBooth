import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { socket } from "../socket.js";
import { useWebRTC } from "../hooks/useWebRTC.js";
import { FILTERS } from "../theme.js";
import { composePhotos } from "../utils/compose.js";
import VideoTile from "../components/VideoTile.jsx";
import DesignPanel from "../components/DesignPanel.jsx";
import CountdownOverlay from "../components/CountdownOverlay.jsx";
import PhotoResult from "../components/PhotoResult.jsx";

function ensureConnected(cb) {
  if (socket.connected) return cb();
  socket.once("connect", cb);
  socket.connect();
}

export default function Booth() {
  const { code } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [room, setRoom] = useState(location.state?.initialRoom || null);
  const [joined, setJoined] = useState(!!location.state?.initialRoom);
  const [gateName, setGateName] = useState("");
  const [gateError, setGateError] = useState("");
  const [gateBusy, setGateBusy] = useState(false);

  const [selfId, setSelfId] = useState(socket.connected ? socket.id : null);
  const [localStream, setLocalStream] = useState(null);
  const [mediaError, setMediaError] = useState("");
  const [mediaAttempt, setMediaAttempt] = useState(0);

  const [countdown, setCountdown] = useState(null);
  const [waiting, setWaiting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  const localVideoRef = useRef(null);
  const settingsRef = useRef(room?.settings);
  useEffect(() => {
    settingsRef.current = room?.settings;
  }, [room]);

  // -- connection bookkeeping -------------------------------------------------
  useEffect(() => {
    function onConnect() {
      setSelfId(socket.id);
    }
    socket.on("connect", onConnect);
    if (socket.connected) setSelfId(socket.id);
    return () => socket.off("connect", onConnect);
  }, []);

  useEffect(() => {
    function onRoomUpdate(r) {
      setRoom(r);
    }
    function onSettings(s) {
      setRoom((prev) => (prev ? { ...prev, settings: s } : prev));
    }
    socket.on("room:update", onRoomUpdate);
    socket.on("settings:update", onSettings);
    return () => {
      socket.off("room:update", onRoomUpdate);
      socket.off("settings:update", onSettings);
    };
  }, []);

  function submitGate(e) {
    e.preventDefault();
    if (!gateName.trim()) return;
    setGateBusy(true);
    setGateError("");
    ensureConnected(() => {
      socket.emit("room:join", { code, name: gateName.trim() }, (res) => {
        setGateBusy(false);
        if (res?.ok) {
          setRoom(res.room);
          setJoined(true);
        } else {
          setGateError(res?.error || "Couldn't join that booth.");
        }
      });
    });
  }

  // -- camera -----------------------------------------------------------------
  useEffect(() => {
    if (!joined) return;
    let stream;
    setMediaError("");
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 }, audio: true })
      .then((s) => {
        stream = s;
        setLocalStream(s);
      })
      .catch((err) => {
        setMediaError(err?.message || "Camera and microphone access was blocked.");
      });
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    };
  }, [joined, mediaAttempt]);

  const peerIds = useMemo(
    () => (room ? room.participants.map((p) => p.id).filter((id) => id !== selfId) : []),
    [room, selfId]
  );
  const remoteStreams = useWebRTC(socket, selfId, peerIds, localStream);

  // -- countdown + capture -----------------------------------------------------
  function captureNow() {
    const video = localVideoRef.current;
    if (!video || video.readyState < 2) return;

    const canvas = document.createElement("canvas");
    canvas.width = 560;
    canvas.height = 420;
    const ctx = canvas.getContext("2d");
    ctx.filter = FILTERS[settingsRef.current?.filter || "classic"].css;

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const targetRatio = canvas.width / canvas.height;
    let sx = 0,
      sy = 0,
      sw = vw,
      sh = vh;
    if (vw / vh > targetRatio) {
      sw = vh * targetRatio;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetRatio;
      sy = (vh - sh) / 2;
    }

    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    socket.emit("photo:submit", { dataUrl });
    setWaiting(true);
  }

  const timersRef = useRef([]);
  useEffect(() => {
    function onStarted({ startAt, seconds }) {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];

      setResultUrl(null);
      setWaiting(false);
      setProgress(null);
      const now = Date.now();
      for (let n = seconds; n >= 1; n--) {
        const delay = Math.max(0, startAt - n * 1000 - now);
        timersRef.current.push(setTimeout(() => setCountdown(n), delay));
      }
      const captureDelay = Math.max(0, startAt - now);
      timersRef.current.push(
        setTimeout(() => {
          setCountdown(0);
          captureNow();
          timersRef.current.push(setTimeout(() => setCountdown(null), 450));
        }, captureDelay)
      );
    }
    socket.on("countdown:started", onStarted);
    return () => {
      socket.off("countdown:started", onStarted);
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onProgress(p) {
      setProgress(p);
    }
    function onComplete({ photos, settings }) {
      setWaiting(false);
      setProgress(null);
      composePhotos(photos, settings).then(setResultUrl);
    }
    function onReset() {
      setResultUrl(null);
      setWaiting(false);
      setCountdown(null);
      setProgress(null);
    }
    socket.on("round:progress", onProgress);
    socket.on("round:complete", onComplete);
    socket.on("round:reset", onReset);
    return () => {
      socket.off("round:progress", onProgress);
      socket.off("round:complete", onComplete);
      socket.off("round:reset", onReset);
    };
  }, []);

  if (!joined) {
    return (
      <div className="page page--narrow">
        <Link to="/" className="brand brand--small">
          📸 Together Booth
        </Link>
        <div className="card">
          <h2>Join booth {code}</h2>
          <p className="card__sub">Enter your name to step inside.</p>
          <form onSubmit={submitGate}>
            <label>
              Your name
              <input value={gateName} onChange={(e) => setGateName(e.target.value)} maxLength={24} autoFocus />
            </label>
            {gateError && <p className="form-error">{gateError}</p>}
            <button type="submit" className="btn btn--primary" disabled={gateBusy}>
              {gateBusy ? "Joining…" : "Enter the booth"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isHost = !!(room && selfId && room.hostId === selfId);
  const settings = room?.settings || { filter: "classic", frame: "sunset", layout: "strip", caption: "" };
  const filterCss = FILTERS[settings.filter]?.css;

  return (
    <div className="page">
      <header className="booth-header">
        <Link to="/" className="brand brand--small">
          📸 Together Booth
        </Link>
        <button
          type="button"
          className="code-pill"
          onClick={() => {
            navigator.clipboard?.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          title="Copy booth code"
        >
          Code: <strong>{code}</strong> {copied ? "✓ copied" : "⧉"}
        </button>
        <span className="pill">{room?.participants.length || 1} in the booth</span>
      </header>

      {mediaError && (
        <div className="banner banner--warn">
          <p>{mediaError} Together Booth needs your camera to take part.</p>
          <button className="btn btn--ghost" onClick={() => setMediaAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      )}

      {resultUrl ? (
        <PhotoResult imageUrl={resultUrl} isHost={isHost} onRetake={() => socket.emit("round:reset")} />
      ) : (
        <>
          <div className="video-grid">
            <VideoTile
              ref={localVideoRef}
              stream={localStream}
              name={room?.participants.find((p) => p.id === selfId)?.name || "You"}
              isLocal
              muted
              filterCss={filterCss}
              flash={countdown === 0}
            />
            {peerIds.map((id) => (
              <VideoTile
                key={id}
                stream={remoteStreams.get(id)}
                name={room?.participants.find((p) => p.id === id)?.name || "Guest"}
                filterCss={filterCss}
                flash={countdown === 0}
              />
            ))}
          </div>

          <div className="booth-footer">
            <DesignPanel settings={settings} isHost={isHost} onChange={(patch) => socket.emit("settings:update", patch)} />

            <div className="capture-bar">
              {isHost ? (
                <button
                  type="button"
                  className="btn btn--primary btn--lg"
                  disabled={countdown !== null || waiting || !localStream}
                  onClick={() => socket.emit("countdown:start", { seconds: 3 })}
                >
                  {waiting ? "Developing…" : "Take the picture 📸"}
                </button>
              ) : (
                <p className="capture-bar__hint">
                  {waiting ? "Say cheese — developing your strip…" : "Waiting for the host to start the countdown…"}
                </p>
              )}
              {progress && <p className="capture-bar__progress">{progress.received}/{progress.total} smiles captured</p>}
            </div>
          </div>
        </>
      )}

      <CountdownOverlay value={countdown} />
    </div>
  );
}
