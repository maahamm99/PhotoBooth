import { useEffect, useRef, useState } from "react";

// One row in "Choose your spot". Owned-by-you spots get an editable,
// debounced name field (so renaming doesn't lag any more than the caption
// does); other people's spots are read-only; open spots offer "Add yourself"
// so someone sharing this device/camera can claim their own numbered spot.
export default function SpotRow({ index, slot, isSelf, isHost, isLastOpenRemovable, onRename, onClaim, onRelease, onShrink }) {
  const owned = !!slot.ownerId;
  const [local, setLocal] = useState(slot.name);
  const focused = useRef(false);
  const debounce = useRef(null);

  useEffect(() => {
    if (!focused.current) setLocal(slot.name);
  }, [slot.name]);

  function handleChange(e) {
    const value = e.target.value;
    setLocal(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => onRename(index, value), 250);
  }

  function flush() {
    focused.current = false;
    clearTimeout(debounce.current);
    onRename(index, local);
  }

  return (
    <li className="spot-row">
      <span className={`spot-row__num ${owned ? "spot-row__num--filled" : ""}`}>{index + 1}</span>
      {isSelf ? (
        <input
          className="spot-row__input"
          value={local}
          maxLength={24}
          onFocus={() => (focused.current = true)}
          onChange={handleChange}
          onBlur={flush}
        />
      ) : (
        <input
          className={`spot-row__input ${owned ? "" : "spot-row__input--open"}`}
          readOnly
          value={owned ? slot.name : ""}
          placeholder="Waiting for a guest…"
        />
      )}

      {isSelf && (
        <button type="button" className="spot-row__remove" title="Give up this spot" onClick={() => onRelease(index)}>
          ×
        </button>
      )}
      {!owned && (
        <button type="button" className="spot-row__claim" onClick={() => onClaim(index)}>
          Add yourself
        </button>
      )}
      {!owned && isLastOpenRemovable && isHost && (
        <button type="button" className="spot-row__remove" title="Remove this spot" onClick={onShrink}>
          ×
        </button>
      )}
    </li>
  );
}
