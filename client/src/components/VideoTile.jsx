import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

const VideoTile = forwardRef(function VideoTile(
  { stream, name, isLocal, filterCss, flash, muted = true },
  ref
) {
  const videoRef = useRef(null);
  useImperativeHandle(ref, () => videoRef.current, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null;
  }, [stream]);

  return (
    <div className="video-tile">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        style={{ filter: filterCss, transform: isLocal ? "scaleX(-1)" : "none" }}
      />
      {!stream && <div className="video-tile__empty">connecting…</div>}
      {flash && <div className="video-tile__flash" />}
      <span className="video-tile__label">
        {name}
        {isLocal ? " (you)" : ""}
      </span>
    </div>
  );
});

export default VideoTile;
