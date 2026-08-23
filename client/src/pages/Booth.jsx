import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import { socket } from "../socket.js";
import { useWebRTC } from "../hooks/useWebRTC.js";
import { FILTERS } from "../theme.js";
import { composePhotos } from "../utils/compose.js";
import { takePendingStream } from "../utils/mediaHandoff.js";
import ControlsPanel from "../components/ControlsPanel.jsx";
import StripPreview from "../components/StripPreview.jsx";
import ReadyPanel from "../components/ReadyPanel.jsx";
import Footer from "../components/Footer.jsx";

const DEFAULT_SETTINGS = {
  filter: "noir",
  color: "butter",
  shape: "square",
  infoPosition: "none",
  caption: "Together",
  totalSpots: 4,
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
  // Handed off from Home's create/join click, which requested the camera as
  // part of that same tap -- see utils/mediaHandoff.js for why this can't
  // just be router state (a MediaStream isn't structured-cloneable).
  const [localStream, setLocalStream] = useState(() => takePendingStream());
  const [mediaError, setMediaError] = useState("");
  const localStreamRef = useRef(null);

  const [countdown, setCountdown] = useState(null);
  const [activeStep, setActiveStep] = useState(null); // { spotIndex, step, totalSteps }
  const [roundInProgress, setRoundInProgress] = useState(false);
  const [resultUrl, setResultUrl] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  // spotIndex -> captured dataUrl, filled in live as each spot's turn finishes
  // so the strip shows the actual shot in place instead of the live feed.
  const [capturedPhotos, setCapturedPhotos] = useState({});

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

  // The camera prompt has to fire from this very click (not a later effect)
  // or mobile Safari silently refuses to show it at all.
  async function submitGate(e) {
    e.preventDefault();
    if (!gateName.trim()) return;
    setGateBusy(true);
    setGateError("");

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
    } catch (err) {
      setGateBusy(false);
      setGateError(err?.message || "Camera and microphone access was blocked. Allow access and try again.");
      return;
    }

    ensureConnected(() => {
      socket.emit("room:join", { code, name: gateName.trim() }, (res) => {
        setGateBusy(false);
        if (res?.ok) {
          setRoom(res.room);
          setLocalStream(stream);
          setJoined(true);
        } else {
          stream.getTracks().forEach((t) => t.stop());
          setGateError(res?.error || "Couldn't join that booth.");
        }
      });
    });
  }

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Called directly from a click/tap handler (never from an effect on its
  // own) so the getUserMedia() call stays inside the synchronous user
  // gesture -- mobile Safari and other strict mobile browsers silently
  // refuse to show the camera permission prompt otherwise.
  function requestMedia() {
    setMediaError("");
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 }, audio: true })
      .then((s) => {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        setLocalStream(s);
      })
      .catch((err) => {
        setMediaError(err?.message || "Camera and microphone access was blocked.");
      });
  }

  useEffect(() => {
    // Home's create/join form and the gate form above both request the
    // camera as part of the same click that joins the room, so by the time
    // we get here there's usually already a stream. Only fall back to an
    // automatic attempt (e.g. a stale/refreshed session) when there isn't
    // one yet -- and even then, the "Enable camera" button in ReadyPanel is
    // the real, tap-gated fallback for mobile browsers that block this.
    if (!joined || localStreamRef.current) return;
    requestMedia();
  }, [joined]);

  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const participants = room?.participants || [];
  const peerIds = useMemo(
    () => participants.map((p) => p.id).filter((id) => id !== selfId),
    [participants, selfId]
  );
  const remoteStreams = useWebRTC(socket, selfId, peerIds, localStream);

  const rawSpots = room?.spots || [];
  const totalSpots = rawSpots.length;

  const spots = rawSpots.map((slot) => {
    if (!slot.ownerId) return null;
    const isLocal = slot.ownerId === selfId;
    return {
      id: slot.ownerId,
      name: slot.name,
      isLocal,
      stream: isLocal ? localStream : remoteStreams.get(slot.ownerId),
    };
  });

  const mySpotIndexes = rawSpots.reduce((acc, s, i) => (s.ownerId === selfId ? [...acc, i] : acc), []);
  // Captures fire from inside setTimeout closures set up once per countdown
  // event, so they read this ref rather than a (possibly stale) state value.
  const mySpotIndexesRef = useRef(mySpotIndexes);
  useEffect(() => {
    mySpotIndexesRef.current = mySpotIndexes;
  }, [mySpotIndexes]);

  function captureNow(spotIndex) {
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

    // Captured as a JPEG data URL kept only in memory for this tab; it's sent
    // once over the socket for this spot's turn and never written to disk.
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    socket.emit("photo:submit", { spotIndex, dataUrl });
  }

  const timersRef = useRef([]);
  useEffect(() => {
    function onStarted({ startAt, seconds, spotIndex, step, totalSteps }) {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];

      setResultUrl(null);
      setRoundInProgress(true);
      setActiveStep({ spotIndex, step, totalSteps });
      if (step === 0) setCapturedPhotos({});

      const now = Date.now();
      for (let n = seconds; n >= 1; n--) {
        const delay = Math.max(0, startAt - n * 1000 - now);
        timersRef.current.push(setTimeout(() => setCountdown(n), delay));
      }
      const captureDelay = Math.max(0, startAt - now);
      timersRef.current.push(
        setTimeout(() => {
          setCountdown(0);
          if (mySpotIndexesRef.current.includes(spotIndex)) {
            captureNow(spotIndex);
          }
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
    function onCaptured({ spotIndex, dataUrl }) {
      setCapturedPhotos((prev) => ({ ...prev, [spotIndex]: dataUrl }));
    }
    function onComplete({ photos, settings }) {
      setRoundInProgress(false);
      setActiveStep(null);
      composePhotos(photos, settings).then(setResultUrl);
    }
    function onReset() {
      setResultUrl(null);
      setRoundInProgress(false);
      setActiveStep(null);
      setCountdown(null);
      setCapturedPhotos({});
    }
    socket.on("spot:captured", onCaptured);
    socket.on("round:complete", onComplete);
    socket.on("round:reset", onReset);
    return () => {
      socket.off("spot:captured", onCaptured);
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

  const mySpotLabel =
    mySpotIndexes.length <= 1
      ? `spot ${mySpotIndexes[0] + 1 || 1}`
      : `spots ${mySpotIndexes.map((i) => i + 1).join(" & ")}`;
  const openSpots = rawSpots.filter((s) => !s.ownerId).length;
  const timerText = `${formatElapsed(elapsed)}:000`;

  const statusText =
    openSpots > 0
      ? `You're in ${mySpotLabel} — waiting on ${openSpots} more`
      : `You're in ${mySpotLabel} — everyone's here`;

  const otherSpots = rawSpots
    .map((slot, i) => ({ n: i + 1, label: slot.ownerId ? slot.name : "open", ready: !!slot.ownerId }))
    .filter((_, i) => !mySpotIndexes.includes(i));

  const selfName = participants.find((p) => p.id === selfId)?.name || "Guest";
  const myTurn = activeStep !== null && mySpotIndexes.includes(activeStep.spotIndex);

  return (
    <div className="page-fixed page-fixed--booth">
      <header className="top-bar top-bar--booth">
        <div className="wordmark-row">
          <span className="wordmark wordmark--small">Together Booth</span>
          <span className="badge badge--wiggle">booth open</span>
        </div>
        <div className="tagline">
          <span className="tagline__dot" />
          live · {totalSpots - openSpots} of {totalSpots} spots filled
        </div>
      </header>

      <main className="booth-columns">
        <ControlsPanel
          code={code}
          settings={settings}
          isHost={isHost}
          spots={rawSpots}
          selfId={selfId}
          onChange={(patch) => socket.emit("settings:update", patch)}
          onClaimSpot={(index) => socket.emit("spot:claim", { index, name: selfName })}
          onReleaseSpot={(index) => socket.emit("spot:release", { index })}
          onRenameSpot={(index, name) => socket.emit("spot:rename", { index, name })}
          onStartOver={() => socket.emit("round:reset")}
        />

        <StripPreview
          spots={spots}
          settings={settings}
          filterCss={filterCss}
          activeSpotIndex={activeStep?.spotIndex ?? null}
          countdown={countdown}
          flashOn={countdown === 0}
          timerText={timerText}
          capturedPhotos={capturedPhotos}
          resultUrl={resultUrl}
          isHost={isHost}
          roundInProgress={roundInProgress}
          activeStep={activeStep}
          captureDisabled={roundInProgress || !localStream}
          onCapture={() => socket.emit("countdown:start")}
          onRetake={() => socket.emit("round:reset")}
        />

        <ReadyPanel
          localVideoRef={localVideoRef}
          localStream={localStream}
          filterCss={filterCss}
          flash={countdown === 0 && myTurn}
          countdownValue={myTurn ? countdown : null}
          timerText={timerText}
          statusText={statusText}
          otherSpots={otherSpots}
          myTurn={myTurn}
          mediaError={mediaError}
          onRetryMedia={requestMedia}
        />
      </main>
      <Footer note="one spot at a time" />
    </div>
  );
}
