export function detectHandheldInput(window, navigator) {
  return !!(window.matchMedia?.("(any-pointer: coarse)").matches || navigator.maxTouchPoints > 0);
}

export function stickAxes(dx, dy, radius, deadZone = 0.12) {
  const distance = Math.hypot(dx, dy);
  const amount = Math.min(1, distance / Math.max(1, radius));
  const strength = Math.max(0, (amount - deadZone) / (1 - deadZone));
  return { x: distance ? dx / distance * strength : 0, z: distance ? dy / distance * strength : 0 };
}

// Each finger owns one gesture. Captured pointers keep movement/guard alive
// outside their button, and every cancellation path releases only that finger.
export function createHandheldInput({ window, stick, thumb, lookSurface, buttons,
  enabled = false, canPlay, onEnable, onLook, onAction, onSecondaryRelease }) {
  const state = { x: 0, z: 0, attackHeld: false, secondaryHeld: false };
  const pointers = new Map();
  let stickId = null;
  let lookId = null;

  function enable() {
    if (enabled) return;
    enabled = true;
    onEnable?.();
  }
  function accepts(event) {
    if (event.pointerType === "touch") enable();
    return enabled && event.button !== 2 && canPlay();
  }
  function holdState(action) {
    for (const pointer of pointers.values()) if (pointer.action === action) return true;
    return false;
  }
  function release(id) {
    const pointer = pointers.get(id);
    if (!pointer) return;
    pointers.delete(id);
    let elementHeld = false;
    for (const other of pointers.values()) if (other.element === pointer.element) elementHeld = true;
    if (!elementHeld) pointer.element.classList?.remove("pressed");
    if (id === stickId) {
      stickId = null;
      state.x = state.z = 0;
      thumb.style.transform = "translate(0px, 0px)";
    }
    if (id === lookId) lookId = null;
    state.attackHeld = holdState("attack");
    const secondaryHeld = holdState("secondary");
    if (state.secondaryHeld && !secondaryHeld) onSecondaryRelease?.();
    state.secondaryHeld = secondaryHeld;
    try { if (pointer.element.hasPointerCapture?.(id)) pointer.element.releasePointerCapture(id); } catch {}
  }
  function reset() {
    for (const id of pointers.keys()) release(id);
    state.x = state.z = 0;
    state.attackHeld = state.secondaryHeld = false;
  }
  function capture(event, element, pointer) {
    event.preventDefault();
    event.stopPropagation();
    pointers.set(event.pointerId, { ...pointer, element });
    try { element.setPointerCapture(event.pointerId); } catch {}
  }
  function moveStick(event, pointer) {
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    const axes = stickAxes(dx, dy, pointer.radius);
    state.x = axes.x; state.z = axes.z;
    const amount = Math.min(1, pointer.radius / Math.max(1, Math.hypot(dx, dy)));
    thumb.style.transform = `translate(${dx * amount}px, ${dy * amount}px)`;
  }
  function bindRelease(element) {
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
      element.addEventListener(name, event => release(event.pointerId));
    }
  }
  stick.addEventListener("pointerdown", event => {
    if (!accepts(event) || stickId !== null) return;
    const bounds = stick.getBoundingClientRect();
    const pointer = { kind: "stick", x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2, radius: bounds.width * 0.34 };
    stickId = event.pointerId;
    capture(event, stick, pointer);
    moveStick(event, pointer);
  });
  stick.addEventListener("pointermove", event => {
    if (event.pointerId !== stickId) return;
    if (!canPlay()) { reset(); return; }
    event.preventDefault();
    moveStick(event, pointers.get(stickId));
  });
  bindRelease(stick);
  lookSurface.addEventListener("pointerdown", event => {
    if (!accepts(event) || lookId !== null) return;
    lookId = event.pointerId;
    capture(event, lookSurface, { kind: "look", x: event.clientX, y: event.clientY });
  });
  lookSurface.addEventListener("pointermove", event => {
    if (event.pointerId !== lookId) return;
    if (!canPlay()) { reset(); return; }
    const pointer = pointers.get(lookId);
    event.preventDefault();
    onLook(event.clientX - pointer.x, event.clientY - pointer.y);
    pointer.x = event.clientX; pointer.y = event.clientY;
  });
  bindRelease(lookSurface);
  for (const button of buttons) {
    const action = button.dataset.touchAction;
    button.addEventListener("pointerdown", event => {
      if (!accepts(event) || button.disabled) return;
      capture(event, button, { kind: "action", action });
      button.classList.add("pressed");
      if (action === "attack") state.attackHeld = true;
      if (action === "secondary") state.secondaryHeld = true;
      onAction(action);
    });
    bindRelease(button);
    // A focused button remains usable with keyboard/screen-reader activation.
    button.addEventListener("click", event => {
      if (event.detail !== 0 || !enabled || !canPlay() || button.disabled) return;
      onAction(action);
      if (action === "secondary") onSecondaryRelease?.();
    });
  }
  window.addEventListener("pointerdown", event => { if (event.pointerType === "touch") enable(); }, { capture: true, passive: true });
  window.addEventListener("pointerup", event => release(event.pointerId));
  window.addEventListener("pointercancel", event => release(event.pointerId));
  window.addEventListener("blur", reset);
  window.addEventListener("resize", reset);
  return { state, reset, update() { if (!canPlay()) reset(); }, get enabled() { return enabled; } };
}
