import VideoTile from "./VideoTile.jsx";
import { COLORS } from "../theme.js";

function todayLabel() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}.${dd}.${d.getFullYear()}`;
}

export default function StripPreview({
  spots,
  settings,
  filterCss,
  flashOn,
  resultUrl,
  isHost,
  waiting,
  captureDisabled,
  progress,
  onCapture,
  onRetake,
}) {
  const color = COLORS[settings.color] || COLORS.ink;

  if (resultUrl) {
    return (
      <div className="strip-col">
        <img src={resultUrl} alt="Your shared photo strip" className="strip-col__image" />
        <div className="strip-col__actions">
          <a className="btn btn--primary" href={resultUrl} download="together-booth.png">
            Download
          </a>
          {isHost && (
            <button type="button" className="btn btn--ghost" onClick={onRetake}>
              Take another round
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="strip-col">
      <div className="strip-mock" style={{ background: color.paper }}>
        <p className="strip-mock__caption" style={{ color: color.ink }}>
          {settings.caption}
        </p>
        <div className="strip-mock__cells">
          {spots.map((spot, i) => (
            <div key={i} className="strip-cell">
              {spot ? (
                <VideoTile
                  stream={spot.stream}
                  name={spot.name}
                  isLocal={spot.isLocal}
                  muted
                  filterCss={filterCss}
                  flash={flashOn}
                  shape={settings.shape}
                  showLabel={false}
                  compact
                />
              ) : (
                <div className="strip-cell__empty">Spot {i + 1} open</div>
              )}
              {spot && settings.infoPosition === "below" && (
                <span className="strip-cell__name" style={{ color: color.ink }}>
                  {spot.name}
                </span>
              )}
              {spot && settings.infoPosition === "center" && <span className="strip-cell__name-overlay">{spot.name}</span>}
            </div>
          ))}
        </div>
        <p className="strip-mock__footer" style={{ color: color.ink }}>
          {settings.caption}
          <br />
          <small>{todayLabel()}</small>
        </p>
      </div>

      <div className="capture-bar">
        {isHost ? (
          <button type="button" className="btn btn--primary btn--lg" disabled={captureDisabled} onClick={onCapture}>
            {waiting ? "Developing…" : "Take the picture"}
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
