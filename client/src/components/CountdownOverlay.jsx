export default function CountdownOverlay({ value, spotName, step, totalSteps }) {
  if (value === null) return null;
  return (
    <div className="countdown-overlay">
      {spotName && (
        <p className="countdown-overlay__subtitle">
          {spotName}'s turn{totalSteps > 1 ? ` — ${step + 1} of ${totalSteps}` : ""}
        </p>
      )}
      <div key={value} className="countdown-overlay__number">
        {value > 0 ? value : "📸"}
      </div>
    </div>
  );
}
