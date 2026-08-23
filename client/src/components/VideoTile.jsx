import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { HEART_MASK } from "../theme.js";

const VideoTile = forwardRef(function VideoTile(
  {
    stream,
    name,
    isLocal,
    filterCss,
    flash,
    muted = true,
    shape = "square",
    showLabel = true,
    compact = false,
    timerText,
    capturedImage,
    countdownValue,
  },
  ref
) {
  const videoRef = useRef(null);
  useImperativeHandle(ref, () => videoRef.current, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null;
  }, [stream]);

  const maskStyle =
    shape === "heart"
      ? { maskImage: HEART_MASK, WebkitMaskImage: HEART_MASK, maskSize: "100% 100%", WebkitMaskSize: "100% 100%", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat" }
      : undefined;

  return (
    <div className={`video-tile ${compact ? "video-tile--compact" : ""} ${shape === "heart" ? "video-tile--heart" : ""}`}>
      <div className="video-tile__mask" style={maskStyle}>
        {capturedImage ? (
          <img src={capturedImage} alt={name} style={{ filter: filterCss }} />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            style={{ filter: filterCss, transform: isLocal ? "scaleX(-1)" : "none" }}
          />
        )}
        {!stream && !capturedImage && <div className="video-tile__empty">connecting…</div>}
        {flash && <div className="video-tile__flash" />}
      </div>
      {countdownValue !== null && countdownValue !== undefined && (
        <div className="video-tile__countdown">{countdownValue > 0 ? countdownValue : "📸"}</div>
      )}
      {timerText && stream && !capturedImage && <span className="video-tile__timer">{timerText}</span>}
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
