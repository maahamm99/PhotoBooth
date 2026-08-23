import { useLayoutEffect, useRef, useState } from "react";
import VideoTile from "./VideoTile.jsx";
import { COLORS, MAX_SPOTS, INSTAX_RATIO } from "../theme.js";
import { downloadImage } from "../utils/downloadImage.js";

function todayLabel() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}.${dd}.${d.getFullYear()}`;
}

const CELL_GAP = 8;
const MIN_CELL_SIZE = 60;
const LABEL_H = 16;
const CARD_PAD_X = 14;

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
  const [cellSize, setCellSize] = useState({ w: 200, h: Math.round(200 / INSTAX_RATIO) });
  const [downloaded, setDownloaded] = useState(false);

  async function handleDownload() {
    await downloadImage(resultUrl, "together-booth.jpg");
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2200);
  }
  const labelAllowance = (settings.infoPosition || "below") === "below" ? LABEL_H : 0;

  // Sized once against the booth's max capacity (not the current spot count),
  // so a card is always the same fixed Instax-wide rectangle -- adding or
  // removing a spot never resizes the ones already there. Re-runs whenever
  // the result view toggles, since that unmounts/remounts this container as
  // a fresh node that a stale ResizeObserver would otherwise never pick
  // back up.
  useLayoutEffect(() => {
    const el = cellsRef.current;
    if (!el) return;

    function recompute() {
      const h = el.clientHeight;
      const w = el.clientWidth;
      const heightBudget = h - CELL_GAP * (MAX_SPOTS - 1) - labelAllowance * MAX_SPOTS;
      const maxHFromHeight = heightBudget / MAX_SPOTS;
      const maxHFromWidth = w / INSTAX_RATIO;
      const cellH = Math.max(MIN_CELL_SIZE, Math.floor(Math.min(maxHFromHeight, maxHFromWidth)));
      setCellSize({ w: Math.round(cellH * INSTAX_RATIO), h: cellH });
    }

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(el);
    return () => observer.disconnect();
  }, [labelAllowance, !!resultUrl]);

  if (resultUrl) {
    return (
      <div className="strip-col">
        <img src={resultUrl} alt="Your shared photo strip" className="strip-col__image" />
        <div className="strip-col__actions">
          <button type="button" className="btn btn--ink" onClick={handleDownload}>
            {downloaded ? "Downloaded. Check your gallery." : "Download"}
          </button>
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

  let hint = "Waiting for the host to start the countdown…";
  if (roundInProgress && activeStep) {
    const name = spots[activeStep.spotIndex]?.name || "Next spot";
    hint = `${name}'s turn — ${activeStep.step + 1} of ${activeStep.totalSteps}`;
  }

  return (
    <div className="strip-col">
      <div className="strip-mock" style={{ background: color.paper, width: cellSize.w + CARD_PAD_X * 2 }}>
        <span className="washi washi--washi-tape" />
        <div className="strip-mock__cells" ref={cellsRef}>
          {spots.map((spot, i) => {
            const captured = capturedPhotos?.[i];
            const isActive = i === activeSpotIndex;
            return (
              <div key={i} className="strip-cell-wrap">
                <div
                  className={`strip-cell ${spot ? "" : "strip-cell--open"} ${isActive ? "strip-cell--active" : ""}`}
                  style={{ width: cellSize.w, height: cellSize.h }}
                >
                  {spot ? (
                    <VideoTile
                      stream={spot.stream}
                      name={spot.name}
                      isLocal={spot.isLocal}
                      muted
                      filterCss={filterCss}
                      flash={flashOn && isActive}
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
