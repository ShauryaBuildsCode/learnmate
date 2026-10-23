# Design requests

Append-only. The frontend designer adds requests here for screens owned by the core-feature team
(learn, course, progress, quiz, plan, upload, Guru, IDE). Format:

```
## <screen or component> - <short title>
- What should change visually and why
- Mockup link or description
- Status: open
```

## Lesson player, code workspace, Guru panel - presentational frames

- Props-in, JSX-out frames in `components/design/` that you can adopt by swapping markup. They
  contain no fetching, Supabase or business logic; all behaviour comes through props.
  - `LessonPlayerFrame`: stage, progress bar (`role="progressbar"`) and play / previous / next controls.
  - `CodeWorkspaceFrame`: file tab, Run button, editor slot (put Monaco in `editor`) and output panel.
  - `GuruPanelFrame`: header with "Close Guru", message bubbles, composer labelled "Ask Guru".
- If you adopt them, keep the existing accessible names ("Open Guru", "Close Guru", "Ask Guru").
- Status: open (optional)
