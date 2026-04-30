# Capture Product Flow

Use browser-use only for a local Harness Agent Canvas target that is already available in runtime context.

Do not ask the user to provide a URL. Determine and use an available local target when possible, such as an already running localhost app, a known project dev server URL, or a browser-use-accessible local page.

If no local app target is available, skip browser inspection and return a clear blocker instead of asking for input.

Inspect the visible product flow related to the recent repository changes and translate it into structured HTML-style scene input for a Remotion composition. The HTML should describe the advertisement sequence, not become production application code.

Return a handoff with:

- Local target used, or the blocker if no target was available
- Short scene-by-scene product flow
- Structured HTML sections for each scene
- Suggested on-screen copy
- UI states or interactions that should be shown
- Known gaps if inspection was unavailable

Do not inspect external websites. Do not run tests. Do not modify files.
