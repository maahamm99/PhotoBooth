import { useLayoutEffect, useRef, useState } from "react";
import VideoTile from "./VideoTile.jsx";
import { COLORS } from "../theme.js";

function todayLabel() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}.${dd}.${d.getFullYear()}`;
}

const CELL_GAP = 6;
const MIN_CELL = 40;
const MAX_CELL = 220;

export default function StripPreview({
  spots,
  settings,
  filterCss,
  flashOn,
  timerText,
  resultUrl,
  isHost,
  waiting,
  captureDisabled,
  progress,
  onCapture,
  onRetake,
}) {
  const cellsRef = useRef(null);
  const [cellSize, setCellSize] = useState(MAX_CELL);
  const count = spots.length || 1;

  useLayoutEffect(() => {
    const el = cellsRef.current;
    if (!el) return;

    function recompute() {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const byHeight = Math.floor((h - CELL_GAP * (count - 1)) / count);
      const size = Math.max(MIN_CELL, Math.min(MAX_CELL, w, byHeight));
      setCellSize(size);
    }

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(el);
    return () => observer.disconnect();
  }, [count]);

  if (resultUrl) {
    return (
      <div className="strip-col">
        <img src={resultUrl} alt="Your shared photo strip" className="strip-col__image" />
        <div className="strip-col__actions">
          <a className="btn btn--ink" href={resultUrl} download="together-booth.png">
            Download
          </a>
          {isHost && (
            <button type="button" className="btn-outline" onClick={onRetake}>
              Take another round
            </button>
          )}
        </div>
      </div>
    );
  }

  const color = COLORS[settings.color] || COLORS.blush;
  const infoPosition = settings.infoPosition || "below";

  return (
    <div className="strip-col">
      <div className="strip-mock" style={{ background: color.paper }}>
        <span className="washi washi--washi-tape" />
        <p className="strip-mock__caption" style={{ color: color.ink }}>
          {settings.caption}
        </p>
        <div className="strip-mock__cells" ref={cellsRef}>
          {spots.map((spot, i) => (
            <div key={i} className="strip-cell-wrap" style={{ width: cellSize }}>
              <div className={`strip-cell ${spot ? "" : "strip-cell--open"}`} style={{ width: cellSize, height: cellSize }}>
                {spot ? (
                  <VideoTile
                    stream={spot.stream}
                    name={spot.name}
                    isLocal={spot.isLocal}
                    muted
                    filterCss={filterCss}
                    flash={flashOn}
                    shape={settings.shape}
                    showLabel={infoPosition === "center"}
                    timerText={timerText}
                    compact
                  />
                ) : (
                  <span className="strip-cell__empty">Spot {i + 1} open</span>
                )}
              </div>
              {spot && infoPosition === "below" && (
                <span className="strip-cell-wrap__name" style={{ color: color.ink }}>
                  {spot.name}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="strip-mock__footer" style={{ color: color.ink }}>
          <span>{settings.caption}</span>
          <span className="strip-mock__date">{todayLabel()}</span>
        </div>
      </div>

      <div className="capture-bar">
        {isHost ? (
          <button type="button" className="btn btn--ink btn--lg" disabled={captureDisabled} onClick={onCapture}>
            {waiting ? "Developing…" : "Take the picture ✦"}
          </button>
        ) : (
          <p className="capture-bar__hint">
            {waiting ? "Say cheese — developing your strip…" : "Waiting for the host to start the countdown…"}
          </p>
        )}
        {progress && (
          <p className="capture-bar__progress">
            {progress.received}/{progress.total} smiles captured
          </p>
        )}
      </div>
    </div>
  );
}
