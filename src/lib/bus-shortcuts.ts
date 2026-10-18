type ShortcutEvent = Pick<KeyboardEvent,
  "key" | "ctrlKey" | "metaKey" | "altKey" | "repeat" | "isComposing" | "defaultPrevented"
>;

type ShortcutFocus = { tagName: string; isContentEditable?: boolean } | null;

/** Browser shortcuts and text entry always take precedence over scene commands. */
export function shouldIgnoreBusShortcut(
  event: ShortcutEvent,
  focusedElement: ShortcutFocus,
  modalOpen: boolean,
  letterShortcutsEnabled = true,
) {
  return event.ctrlKey || event.metaKey || event.altKey || event.repeat
    || event.isComposing || event.defaultPrevented || modalOpen
    || /^(INPUT|TEXTAREA|SELECT)$/i.test(focusedElement?.tagName ?? "")
    || focusedElement?.isContentEditable === true
    || (!letterShortcutsEnabled && /^[a-z]$/i.test(event.key));
}

/** Trackpad pinch and Ctrl/Cmd+wheel belong to the browser's page zoom. */
export function isBrowserZoomWheel(event: Pick<WheelEvent, "ctrlKey" | "metaKey">) {
  return event.ctrlKey || event.metaKey;
}
