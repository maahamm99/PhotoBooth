import { FILTERS, FRAMES, LAYOUTS, frameCssBackground } from "../theme.js";

export default function DesignPanel({ settings, isHost, onChange }) {
  return (
    <div className="design-panel">
      <div className="design-panel__row">
        <p className="design-panel__title">Filter</p>
        <div className="chip-row">
          {Object.entries(FILTERS).map(([key, f]) => (
            <button
              key={key}
              type="button"
              disabled={!isHost}
              className={`chip ${settings.filter === key ? "chip--active" : ""}`}
              onClick={() => onChange({ filter: key })}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="design-panel__row">
        <p className="design-panel__title">Frame</p>
        <div className="chip-row">
          {Object.entries(FRAMES).map(([key, f]) => (
            <button
              key={key}
              type="button"
              disabled={!isHost}
              className={`swatch ${settings.frame === key ? "swatch--active" : ""}`}
              style={{ background: frameCssBackground(f) }}
              title={f.label}
              onClick={() => onChange({ frame: key })}
            >
              <span className="sr-only">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="design-panel__row">
        <p className="design-panel__title">Layout</p>
        <div className="chip-row">
          {Object.entries(LAYOUTS).map(([key, l]) => (
            <button
              key={key}
              type="button"
              disabled={!isHost}
              className={`chip ${settings.layout === key ? "chip--active" : ""}`}
              onClick={() => onChange({ layout: key })}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="design-panel__row">
        <p className="design-panel__title">Caption</p>
        <input
          type="text"
          maxLength={40}
          disabled={!isHost}
          value={settings.caption}
          placeholder="together, apart"
          onChange={(e) => onChange({ caption: e.target.value })}
        />
      </div>

      {!isHost && <p className="design-panel__hint">Only the host can change the booth's look.</p>}
    </div>
  );
}
