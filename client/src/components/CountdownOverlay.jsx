export default function CountdownOverlay({ value }) {
  if (value === null) return null;
  return (
    <div className="countdown-overlay">
      <div key={value} className="countdown-overlay__number">
        {value > 0 ? value : "📸"}
      </div>
    </div>
  );
}
