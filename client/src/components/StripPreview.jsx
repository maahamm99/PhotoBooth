import { useLayoutEffect, useRef, useState } from "react";
import VideoTile from "./VideoTile.jsx";
import { COLORS, MAX_SPOTS } from "../theme.js";

function todayLabel() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}.${dd}.${d.getFullYear()}`;
}

const CELL_GAP = 8;
const MIN_CELL_SIZE = 60;
const LABEL_H = 16;

export default function StripPreview({
  spots,
  settings,
  filterCss,
  activeSpotIndex,
  countdown,
  flashOn,
  timerText,
  capturedPhotos,
  resultUrl,
  isHost,
  roundInProgress,
  activeStep,
  captureDisabled,
  onCapture,
  onRetake,
}) {
  const cellsRef = useRef(null);
  const [cellSize, setCellSize] = useState(200);
  const labelAllowance = (settings.infoPosition || "below") === "below" ? LABEL_H : 0;

  // Sized once against the booth's max capacity (not the current spot count),
  // so a card is always the same fixed square -- adding or removing a spot
  // never resizes the ones already there.
  useLayoutEffect(() => {
    const el = cellsRef.current;
    if (!el) return;

    function recompute() {
      const h = el.clientHeight;
      const w = el.clientWidth;
      const heightBudget = h - CELL_GAP * (MAX_SPOTS - 1) - labelAllowance * MAX_SPOTS;
      const size = Math.max(MIN_CELL_SIZE, Math.min(w, Math.floor(heightBudget / MAX_SPOTS)));
      setCellSize(size);
    }

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(el);
    return () => observer.disconnect();
  }, [labelAllowance]);

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
  const isHeart = settings.shape === "heart";

  let hint = "Waiting for the host to start the countdown…";
  if (roundInProgress && activeStep) {
    const name = spots[activeStep.spotIndex]?.name || "Next spot";
    hint = `${name}'s turn — ${activeStep.step + 1} of ${activeStep.totalSteps}`;
  }

  return (
    <div className="strip-col">
      <div className="strip-mock" style={{ background: color.paper }}>
        <span className="washi washi--washi-tape" />
        <div className="strip-mock__cells" ref={cellsRef}>
          {spots.map((spot, i) => {
            const captured = capturedPhotos?.[i];
            const isActive = i === activeSpotIndex;
            return (
              <div key={i} className="strip-cell-wrap">
                <div
                  className={`strip-cell ${spot ? "" : "strip-cell--open"} ${isActive ? "strip-cell--active" : ""} ${isHeart ? "strip-cell--heart" : ""}`}
                  style={{ background: isHeart ? color.paper : undefined, width: cellSize, height: cellSize }}
                >
                  {spot ? (
                    <VideoTile
                      stream={spot.stream}
                      name={spot.name}
                      isLocal={spot.isLocal}
                      muted
                      filterCss={filterCss}
                      flash={flashOn && isActive}
                      shape={settings.shape}
                      showLabel={infoPosition === "center"}
                      timerText={timerText}
                      capturedImage={captured}
                      countdownValue={isActive ? countdown : null}
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
            );
          })}
        </div>
        <div className="strip-mock__footer" style={{ color: color.ink }}>
          <span>{settings.caption}</span>
          <span className="strip-mock__date">{todayLabel()}</span>
        </div>
      </div>

      <div className="capture-bar">
        {isHost ? (
          <button type="button" className="btn btn--ink btn--lg" disabled={captureDisabled} onClick={onCapture}>
            {roundInProgress ? "Capturing…" : "Take the picture ✦"}
          </button>
        ) : (
          <p className="capture-bar__hint">{hint}</p>
        )}
        {roundInProgress && isHost && <p className="capture-bar__progress">{hint}</p>}
      </div>
    </div>
  );
}
