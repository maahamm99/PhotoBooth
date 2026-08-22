import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { HEART_MASK } from "../theme.js";

const VideoTile = forwardRef(function VideoTile(
  { stream, name, isLocal, filterCss, flash, muted = true, shape = "square", showLabel = true, compact = false },
  ref
) {
  const videoRef = useRef(null);
  useImperativeHandle(ref, () => videoRef.current, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null;
  }, [stream]);

  const maskStyle =
    shape === "heart" ? { maskImage: HEART_MASK, WebkitMaskImage: HEART_MASK, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" } : {};

  return (
    <div className={`video-tile ${compact ? "video-tile--compact" : ""}`}>
      <div className="video-tile__mask" style={maskStyle}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          style={{ filter: filterCss, transform: isLocal ? "scaleX(-1)" : "none" }}
        />
        {!stream && <div className="video-tile__empty">connecting…</div>}
        {flash && <div className="video-tile__flash" />}
      </div>
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
