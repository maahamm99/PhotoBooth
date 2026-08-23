import VideoTile from "./VideoTile.jsx";

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
  timerText,
  resultUrl,
  isHost,
  waiting,
  captureDisabled,
  progress,
  onCapture,
  onRetake,
}) {
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

  return (
    <div className="strip-col">
      <div className="strip-mock">
        <span className="washi washi--washi-tape" />
        <p className="strip-mock__caption">{settings.caption}</p>
        <div className="strip-mock__cells">
          {spots.map((spot, i) => (
            <div key={i} className={`strip-cell ${spot ? "" : "strip-cell--open"}`}>
              {spot ? (
                <VideoTile
                  stream={spot.stream}
                  name={spot.name}
                  isLocal={spot.isLocal}
                  muted
                  filterCss={filterCss}
                  flash={flashOn}
                  shape={settings.shape}
                  showLabel
                  timerText={timerText}
                  compact
                />
              ) : (
                <span className="strip-cell__empty">Spot {i + 1} open</span>
              )}
            </div>
          ))}
        </div>
        <div className="strip-mock__footer">
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
