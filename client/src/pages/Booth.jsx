import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import { socket } from "../socket.js";
import { useWebRTC } from "../hooks/useWebRTC.js";
import { FILTERS } from "../theme.js";
import { composePhotos } from "../utils/compose.js";
import ControlsPanel from "../components/ControlsPanel.jsx";
import StripPreview from "../components/StripPreview.jsx";
import ReadyPanel from "../components/ReadyPanel.jsx";
import CountdownOverlay from "../components/CountdownOverlay.jsx";
import Footer from "../components/Footer.jsx";

const DEFAULT_SETTINGS = {
  filter: "classic",
  color: "cream",
  shape: "square",
  infoPosition: "below",
  caption: "Together",
  totalSpots: 1,
};

function formatElapsed(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function ensureConnected(cb) {
  if (socket.connected) return cb();
  socket.once("connect", cb);
  socket.connect();
}

export default function Booth() {
  const { code } = useParams();
  const location = useLocation();

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
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!joined) return;
    const id = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [joined]);

  const localVideoRef = useRef(null);
  const settingsRef = useRef(room?.settings);
  useEffect(() => {
    settingsRef.current = room?.settings;
  }, [room]);

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

  const participants = room?.participants || [];
  const peerIds = useMemo(
    () => participants.map((p) => p.id).filter((id) => id !== selfId),
    [participants, selfId]
  );
  const remoteStreams = useWebRTC(socket, selfId, peerIds, localStream);

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
      <div className="page-fixed page-fixed--center">
        <Link to="/" className="wordmark wordmark--small">
          Together Booth
        </Link>
        <div className="gate-card">
          <h2>Join booth {code}</h2>
          <p className="home-col__sub">Enter your name to step inside.</p>
          <form onSubmit={submitGate}>
            <label>
              Your name
              <input value={gateName} onChange={(e) => setGateName(e.target.value)} maxLength={24} autoFocus />
            </label>
            {gateError && <p className="form-error">{gateError}</p>}
            <button type="submit" className="btn btn--ink" disabled={gateBusy}>
              {gateBusy ? "Joining…" : "Enter the booth"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isHost = !!(room && selfId && room.hostId === selfId);
  const settings = room?.settings || DEFAULT_SETTINGS;
  const filterCss = FILTERS[settings.filter]?.css;
  const totalSpots = Math.max(settings.totalSpots || 1, participants.length);

  const spots = Array.from({ length: totalSpots }, (_, i) => {
    const person = participants[i];
    if (!person) return null;
    const isLocal = person.id === selfId;
    return {
      id: person.id,
      name: person.name,
      isLocal,
      stream: isLocal ? localStream : remoteStreams.get(person.id),
    };
  });

  const mySpotIndex = participants.findIndex((p) => p.id === selfId);
  const mySpot = mySpotIndex >= 0 ? mySpotIndex + 1 : 1;
  const openSpots = totalSpots - participants.length;
  const timerText = `${formatElapsed(elapsed)}:000`;

  const otherSpots = spots
    .map((spot, i) => ({ n: i + 1, label: spot ? spot.name : "open", ready: !!spot }))
    .filter((s) => s.n !== mySpot);

  return (
    <div className="page-fixed page-fixed--booth">
      <header className="top-bar top-bar--booth">
        <div className="wordmark-row">
          <span className="wordmark wordmark--small">Together Booth</span>
          <span className="badge badge--wiggle">booth open</span>
        </div>
        <div className="tagline">
          <span className="tagline__dot" />
          live · {participants.length} of {totalSpots} spots filled
        </div>
      </header>

      <main className="booth-columns">
        <ControlsPanel
          code={code}
          settings={settings}
          isHost={isHost}
          participants={participants}
          selfId={selfId}
          onChange={(patch) => socket.emit("settings:update", patch)}
          onStartOver={() => socket.emit("round:reset")}
        />

        <StripPreview
          spots={spots}
          settings={settings}
          filterCss={filterCss}
          flashOn={countdown === 0}
          timerText={timerText}
          resultUrl={resultUrl}
          isHost={isHost}
          waiting={waiting}
          captureDisabled={countdown !== null || waiting || !localStream}
          progress={progress}
          onCapture={() => socket.emit("countdown:start", { seconds: 3 })}
          onRetake={() => socket.emit("round:reset")}
        />

        <ReadyPanel
          localVideoRef={localVideoRef}
          localStream={localStream}
          filterCss={filterCss}
          flash={countdown === 0}
          shape={settings.shape}
          timerText={timerText}
          mySpot={mySpot}
          openSpots={openSpots}
          otherSpots={otherSpots}
          mediaError={mediaError}
          onRetryMedia={() => setMediaAttempt((n) => n + 1)}
        />
      </main>

      <CountdownOverlay value={countdown} />
      <Footer note="everyone shoots at the same count" />
    </div>
  );
}
