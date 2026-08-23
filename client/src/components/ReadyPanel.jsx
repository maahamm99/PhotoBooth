import VideoTile from "./VideoTile.jsx";

export default function ReadyPanel({
  localVideoRef,
  localStream,
  filterCss,
  flash,
  countdownValue,
  shape,
  timerText,
  statusText,
  otherSpots,
  myTurn,
  mediaError,
  onRetryMedia,
}) {
  return (
    <aside className="ready-panel">
      <span className="washi washi--solid-red" />
      <div className="ready-panel__heading">
        <span className="eyebrow">In the booth</span>
        <h2>{myTurn ? "Say cheese — it's your turn!" : statusText}</h2>
      </div>

      <VideoTile
        ref={localVideoRef}
        stream={localStream}
        name="you"
        isLocal
        muted
        filterCss={filterCss}
        flash={flash}
        shape={shape}
        timerText={timerText}
        countdownValue={countdownValue}
      />

      {mediaError && (
        <div className="banner banner--warn">
          <p>{mediaError} Together Booth needs your camera to take part.</p>
          <button type="button" className="btn-outline" onClick={onRetryMedia}>
            Try again
          </button>
        </div>
      )}

      {otherSpots.length > 0 && (
        <div className="ready-panel__list">
          {otherSpots.map((s, i) => (
            <div key={i}>
              {i > 0 && <div className="controls-panel__divider" />}
              <div className="ready-panel__row">
                <span>
                  Spot {s.n} · {s.label}
                </span>
                <span className={s.ready ? "ready-panel__status--ready" : "ready-panel__status--waiting"}>
                  {s.ready ? "ready" : "waiting"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="ready-panel__note">Trouble connecting? Refresh the page — your spot is held for a minute.</p>
    </aside>
  );
}
