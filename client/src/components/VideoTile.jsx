import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { HEART_OUTLINE_PATH } from "../theme.js";

const VideoTile = forwardRef(function VideoTile(
  { stream, name, isLocal, filterCss, flash, muted = true, shape = "square", showLabel = true, compact = false, timerText },
  ref
) {
  const videoRef = useRef(null);
  useImperativeHandle(ref, () => videoRef.current, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null;
  }, [stream]);

  return (
    <div className={`video-tile ${compact ? "video-tile--compact" : ""}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        style={{ filter: filterCss, transform: isLocal ? "scaleX(-1)" : "none" }}
      />
      {!stream && <div className="video-tile__empty">connecting…</div>}
      {flash && <div className="video-tile__flash" />}
      {shape === "heart" && stream && (
        <svg viewBox="0 0 100 92" className="video-tile__heart">
          <path d={HEART_OUTLINE_PATH} fill="none" stroke="#C4132B" strokeWidth="2.4" />
        </svg>
      )}
      {timerText && stream && <span className="video-tile__timer">{timerText}</span>}
      {showLabel && (
        <span className="video-tile__label">
          {name}
          {isLocal ? " (you)" : ""}
        </span>
      )}
    </div>
  );
});

export default VideoTile;
