# Email to Task (Obsidian plugin)

Watches your vault for dropped `.eml` / `.msg` email files and automatically
converts each into a Markdown note containing a
[Tasks](https://publish.obsidian.md/tasks/)-compatible checkbox.

Drag an email out of Outlook (or any client) into a watched folder in the vault
and — with no command — you get a new note with:

- YAML frontmatter (sender, date, subject, source filename, tags)
- a top-line task: `- [ ] {subject} — {from} 📅 {due-date}`
- the email body (HTML converted to Markdown, or plain text)

The original `.eml`/`.msg` is then kept, moved to an archive folder, or deleted,
per your setting. Desktop only (`isDesktopOnly: true`).

## Why a vault `create` listener

The plugin reacts to the file *landing in the vault*, regardless of how it got
there — drag into the editor, drag onto a sidebar folder, or sync. That's what
makes "drop into a folder" work, not just "drop into an open note."

## Install on a locked-down machine (no build tools needed)

The plugin runs as three static files, exactly like any community-store plugin.
The compiled artifact is committed under [`dist/`](./dist).

1. In your vault, create the folder:
   `<vault>/.obsidian/plugins/email-to-task/`
2. Copy these three files from `dist/` into it:
   - `main.js`
   - `manifest.json`
   - `styles.css`
3. Obsidian → **Settings → Community plugins** → enable **Email to Task**.
4. Open the plugin settings and set your **Watch folder** and **Output folder**.

> No Node, npm, or build step is required on the target machine — it only runs
> the compiled JS.

## Settings

| Setting | Default | Notes |
| --- | --- | --- |
| Watch folder | `Inbox/Email` | Only emails dropped here are processed. |
| Output folder | `Tasks/Email` | Where task notes are created. |
| Due date source | Email date | `Email date` / `Today` / `None`. |
| Convert HTML body | on | Off uses the plain-text body. |
| Original disposition | Move | `Keep` / `Move to archive` / `Delete`. |
| Archive folder | `Inbox/Email/_archive` | Used when disposition is Move. |
| Open note on create | off | Open each note in a new tab. |
| Default tags | `email` | Comma list, injected via `{{tags}}`. |
| Note template | see below | Editable; tokens listed below. |
| Debug logging | off | Logs steps to the dev console. |

### Template tokens

`{{subject}}` `{{fromName}}` `{{fromAddress}}` `{{isoDate}}` `{{dueDate}}`
`{{sourceFilename}}` `{{tags}}` `{{body}}`

Default template:

```
---
type: email-task
from: "{{fromName}} <{{fromAddress}}>"
date: {{isoDate}}
subject: "{{subject}}"
source: "{{sourceFilename}}"
tags: [{{tags}}]
---
- [ ] {{subject}} — {{fromName}} 📅 {{dueDate}}

{{body}}
```

## Development (personal machine)

```bash
npm install
npm run dev      # esbuild watch -> main.js
npm run build    # type-check + production build
npm test         # parser/helper checks against test-fixtures/
npm run deploy    # production build + refresh dist/
```

### Project layout

```
src/
  main.ts      plugin lifecycle + vault 'create' event wiring
  settings.ts  settings interface, defaults, settings tab
  types.ts     ParsedEmail data model
  parser.ts    parseEml() (postal-mime), parseMsg() (@kenjiuno/msgreader)
  note.ts      filename derivation, collision handling, note creation
  template.ts  {{token}} substitution
tests/         standalone parser/helper tests
test-fixtures/ sample.eml, sample.msg
dist/          committed runtime artifact (main.js, manifest.json, styles.css)
```

## Known limitations (v0.1)

- `.msg` bodies stored only as compressed RTF fall back to plain text; no RTF
  de-encapsulation yet.
- Attachments are parsed but not yet saved/linked into the note.
- Scoped to a single watch folder (no whole-vault mode).

## Notes / open items

- Confirm whether your work email client drags out `.eml` or `.msg`; both are
  supported.
- A hand-placed, unsigned plugin is identical at runtime to a store plugin, but
  confirm your firm's policy permits non-store plugins.
