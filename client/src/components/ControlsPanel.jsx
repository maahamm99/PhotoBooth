import { useState } from "react";
import { FILTERS, SHAPES, INFO_POSITIONS, COLORS, MAX_SPOTS } from "../theme.js";

export default function ControlsPanel({ code, settings, isHost, participants, selfId, onChange, onStartOver }) {
  const [copied, setCopied] = useState(false);
  const totalSpots = settings.totalSpots || participants.length;

  function copyLink() {
    const url = `${window.location.origin}/b/${code}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="controls-panel">
      <span className="washi washi--solid-ink" />

      {isHost ? (
        <input
          className="controls-panel__caption"
          value={settings.caption}
          maxLength={28}
          placeholder="Give it a name"
          onChange={(e) => onChange({ caption: e.target.value })}
        />
      ) : (
        <h2 className="controls-panel__caption controls-panel__caption--static">{settings.caption}</h2>
      )}

      <div className="controls-panel__code">
        <span>{code}</span>
        <button type="button" className="link-btn" onClick={copyLink}>
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>

      <div className="controls-panel__section">
        <p className="controls-panel__title">Choose your spot</p>
        <ol className="spot-list">
          {Array.from({ length: totalSpots }).map((_, i) => {
            const person = participants[i];
            const isLastOpenSpot = !person && isHost && totalSpots > participants.length && i === totalSpots - 1;
            return (
              <li key={i} className="spot-row">
                <span className={`spot-row__num ${person ? "spot-row__num--filled" : ""}`}>{i + 1}</span>
                <input
                  className={`spot-row__input ${person ? "" : "spot-row__input--open"}`}
                  readOnly
                  value={person ? `${person.name}${person.id === selfId ? " (you)" : ""}` : ""}
                  placeholder="Waiting for a guest…"
                />
                {isLastOpenSpot && (
                  <button
                    type="button"
                    className="spot-row__remove"
                    title="Remove this spot"
                    onClick={() => onChange({ totalSpots: totalSpots - 1 })}
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ol>
        {isHost && totalSpots < MAX_SPOTS && (
          <button type="button" className="btn-outline-pill" onClick={() => onChange({ totalSpots: totalSpots + 1 })}>
            + Add a spot
          </button>
        )}
      </div>

      <div className="controls-panel__divider" />

      <div className="controls-panel__section">
        <p className="controls-panel__title">Info</p>
        <div className="chip-row">
          {Object.entries(INFO_POSITIONS).map(([key, opt]) => (
            <button
              key={key}
              type="button"
              disabled={!isHost}
              className={`chip ${settings.infoPosition === key ? "chip--active" : ""}`}
              onClick={() => onChange({ infoPosition: key })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="controls-panel__section">
        <p className="controls-panel__title">Filter</p>
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

      <div className="controls-panel__section">
        <p className="controls-panel__title">Frame</p>
        <div className="chip-row">
          {Object.entries(SHAPES).map(([key, s]) => (
            <button
              key={key}
              type="button"
              disabled={!isHost}
              className={`chip ${settings.shape === key ? "chip--active" : ""}`}
              onClick={() => onChange({ shape: key })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="controls-panel__section">
        <p className="controls-panel__title">Color</p>
        <div className="chip-row">
          {Object.entries(COLORS).map(([key, c]) => (
            <button
              key={key}
              type="button"
              disabled={!isHost}
              className={`swatch ${settings.color === key ? "swatch--active" : ""}`}
              style={{ background: c.hex }}
              title={c.label}
              onClick={() => onChange({ color: key })}
            >
              <span className="sr-only">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {isHost ? (
        <button type="button" className="btn-outline controls-panel__reset" onClick={onStartOver}>
          Start over
        </button>
      ) : (
        <p className="controls-panel__hint">Only the host can change the booth's look.</p>
      )}
    </div>
  );
}
