export default function PhotoResult({ imageUrl, isHost, onRetake }) {
  return (
    <div className="result">
      <img src={imageUrl} alt="Your shared photo booth strip" className="result__image" />
      <div className="result__actions">
        <a className="btn btn--primary" href={imageUrl} download="together-booth.png">
          Download
        </a>
        {isHost && (
          <button type="button" className="btn btn--ghost" onClick={onRetake}>
            Take another round
          </button>
        )}
      </div>
      <p className="result__hint">Everyone in the booth gets this exact same strip — save it and share it.</p>
    </div>
  );
}
