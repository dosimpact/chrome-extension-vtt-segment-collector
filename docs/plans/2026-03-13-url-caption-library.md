# URL Caption Library Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persist captions by page URL, preload saved captions for the same URL, and expose a popup library/settings UI.

**Architecture:** Keep tab sessions for live capture, add a URL-keyed caption library in `chrome.storage.local`, and merge saved cues with newly captured cues through the existing dedupe/sort path. Extend the popup into `Live`, `Library`, and `Settings` tabs without changing the existing capture pipeline.

**Tech Stack:** React, TypeScript, Chrome MV3, Vite, Vitest, Tailwind UI components.

---

### Task 1: Add URL library domain types

**Files:**
- Modify: `/Users/dodo/workspace/utils/chrome-extension-vtt-segment-collector/src/lib/types.ts`
- Test: `/Users/dodo/workspace/utils/chrome-extension-vtt-segment-collector/tests/session-store.test.ts`

1. Add URL library entry/map types and session fields for page context, library hydration state, and auto-save setting.
2. Add runtime/session action types for library hydration, page context, library download/delete, and auto-save toggle.

### Task 2: Add pure URL library merge helpers

**Files:**
- Create: `/Users/dodo/workspace/utils/chrome-extension-vtt-segment-collector/src/lib/caption-library.ts`
- Create: `/Users/dodo/workspace/utils/chrome-extension-vtt-segment-collector/tests/caption-library.test.ts`

1. Add helpers for merging caption buffers into a URL library entry.
2. Keep dedupe and time ordering by reusing existing cue merge behavior.
3. Add helpers for turning the map into a popup-friendly sorted list.

### Task 3: Extend session reducer for page context and preload

**Files:**
- Modify: `/Users/dodo/workspace/utils/chrome-extension-vtt-segment-collector/src/lib/session-store.ts`
- Modify: `/Users/dodo/workspace/utils/chrome-extension-vtt-segment-collector/tests/session-store.test.ts`

1. Add reducer actions for setting page context and hydrating from saved captions.
2. Reset live captions when the active page URL changes.
3. Ensure hydration merges existing saved cues without breaking live cue ordering.

### Task 4: Add background persistence and preload flow

**Files:**
- Modify: `/Users/dodo/workspace/utils/chrome-extension-vtt-segment-collector/src/background.ts`

1. Add storage keys and in-memory cache for the URL caption library and auto-save setting.
2. Resolve active tab URL/title before returning popup state or handling incoming VTT segments.
3. Preload saved captions into the tab session when the same URL is seen and auto-save is enabled.
4. Persist merged captions back into the URL library when new cues arrive.
5. Add runtime handlers for library download, library delete, and auto-save toggle.

### Task 5: Add popup tabs and library/settings UI

**Files:**
- Modify: `/Users/dodo/workspace/utils/chrome-extension-vtt-segment-collector/src/popup/main.tsx`
- Modify: `/Users/dodo/workspace/utils/chrome-extension-vtt-segment-collector/src/popup/PopupApp.tsx`
- Modify: `/Users/dodo/workspace/utils/chrome-extension-vtt-segment-collector/tests/popup.test.tsx`

1. Add local popup tab state for `Live`, `Library`, and `Settings`.
2. Keep the current live buffer in the `Live` tab.
3. Add a `Library` tab listing saved URLs with `TXT`/`VTT` download and delete actions.
4. Add a `Settings` tab with the default-on auto-save/load toggle.

### Task 6: Verify and document behavior

**Files:**
- Modify: `/Users/dodo/workspace/utils/chrome-extension-vtt-segment-collector/README.md`
- Modify: `/Users/dodo/workspace/utils/chrome-extension-vtt-segment-collector/docs/implementation-notes.md`

1. Update user-facing docs for URL library behavior and new popup tabs.
2. Re-run targeted tests, full test suite, and production build.

