# Render And Verify MP4

Render the Remotion composition into an MP4 and place the output in `/generations` at the repository root only when rendering is explicitly part of the active workflow execution and the runtime setup permits it.

Use a deterministic filename such as:

`generations/new-features-ad.mp4`

Before reporting completion, verify:

- The MP4 exists in `/generations`
- The render completed without errors
- The video duration matches the planned composition
- The final output advertises the new features identified from repository context

If rendering is unavailable, blocked, unsafe, or the Remotion project is missing required setup, skip rendering and report the exact blocker in the final handoff.

Do not run tests or execute unrelated workflows.
