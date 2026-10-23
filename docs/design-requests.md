# Design requests

Requests from the frontend design work for files owned by the backend / core-feature side.
Please do not treat these as urgent; each one says what unblocks.

Format: **Title** · file · status (open / done) — what, why.

## Open

### Make the landing page public · `proxy.ts` · open

`PUBLIC_PATHS` is `["/login", "/auth"]`, so signed-out visitors to `/` are redirected to `/login`
and the new landing page can never be seen.

Requested change:

- Add `"/"` as an exact-match public path (not `startsWith`, or every route becomes public).
- Optional: signed-in visitors on `/` go to `/dashboard`. The landing page does not redirect
  itself, so this is the only place that behaviour can live.

Unblocks: the landing page at `/` (Phase C).

### Presentational frames for the core screens · `components/design/**` · open (optional)

Props-in, JSX-out frames you can adopt by swapping markup. They contain no fetching, Supabase
or business logic; all behaviour comes through props.

- `LessonPlayerFrame` — stage, progress bar (`role="progressbar"`) and play / previous / next controls.
- `CodeWorkspaceFrame` — file tab, Run button, editor slot (put Monaco in `editor`) and output panel.
- `GuruPanelFrame` — header with "Close Guru", message bubbles, composer labelled "Ask Guru".

Keep the existing accessible names ("Open Guru", "Close Guru", "Ask Guru") if you adopt them.
