# Setting this up

## Once

1. **github.com → New repository.** Name it, set it **Public**, Create.
2. On the empty repo page click **uploading an existing file**, then drag in the *contents* of
   this folder (`docs/`, `mkdocs.yml`, `.github/`, this file). Commit.
3. **Settings → Pages → Source: GitHub Actions.**

The site builds itself and appears at `https://<your-username>.github.io/<repo-name>/`
about a minute later. Paste that link in Google Classroom once, pinned.

## Posting a reading

Open the placeholder file for that ansu (for example `docs/ras-3/ansu-44.md`), click the
pencil, select all, paste the finished markdown, commit. The site rebuilds on its own.

For a whole batch at once: on the folder page use **Add file → Upload files** and drag the
finished `.md` files in with the same names. Same-name files replace the placeholders.

Nothing else needs maintaining. The left-hand chapter tree and the search index are built
from the folder structure, so a new file appears in the navigation by itself.

## What's already handled

Two things in your markdown break most renderers. Both are configured in `mkdocs.yml`:

- **The `---` colophon block.** Fine here; it only breaks pandoc-based conversions.
- **The backslash line breaks in the Sri Mukhvaak blocks.** Standard Python-Markdown drops
  these and runs the three lines together. `pymdownx.escapeall` with `hardbreak: true`
  keeps Gurmukhi, transliteration and English on separate lines.

Footnotes open as a small popup where the reader is, so a gloss doesn't cost them their
place on the page. That's `docs/assets/footnotes.js` — no external library, works offline.

## Changing how it looks

`docs/assets/reading.css` holds the typography: the text column width, line height, the
Sri Mukhvaak block, and the footnote popup. Colours come from `mkdocs.yml` under `palette`.
