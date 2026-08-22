import VideoTile from "./VideoTile.jsx";

export default function ReadyPanel({ localVideoRef, localStream, filterCss, flash, mySpot, openSpots, mediaError, onRetryMedia }) {
  const statusText =
    openSpots > 0
      ? `You're in spot ${mySpot}. Waiting on ${openSpots} more ${openSpots === 1 ? "spot" : "spots"} to join.`
      : `You're in spot ${mySpot}. Everyone's here — start when ready!`;

  return (
    <aside className="ready-panel">
      <p className="ready-panel__title">In the booth</p>
      <p className="ready-panel__status">{statusText}</p>

      <VideoTile ref={localVideoRef} stream={localStream} name="you" isLocal muted filterCss={filterCss} flash={flash} />

      {mediaError && (
        <div className="banner banner--warn">
          <p>{mediaError} Together Booth needs your camera to take part.</p>
          <button type="button" className="btn btn--ghost" onClick={onRetryMedia}>
            Try again
          </button>
        </div>
      )}

      <p className="ready-panel__note">If you run into connection issues, try refreshing the page. Thanks for your patience!</p>
    </aside>
  );
}
