# Contribution Guide

Computer Graphics Laboratory accepts pull requests for computer graphics learning material. The public site now has two parts:

- The landing page remains a small static site at the repository root.
- Long-form documentation lives in VitePress under `docs/` and is published at `/learn/`.

## What To Contribute

- New chapters for an existing series.
- New tutorial series with a clear scope.
- Corrections to formulas, terminology, references, or code samples.
- Paper reading notes, summaries, and curated references.

## Content Structure

Write documentation in `docs/`:

```text
docs/
  index.md
  contribute.md
  papers/
  series/
```

Each series should have its own directory under `docs/series/`:

```text
docs/series/my-series/
  index.md
  chapter-one.md
  chapter-two.md
```

Use `index.md` as the series overview page and add one Markdown file per chapter.

## Writing Expectations

- Prefer explanation, derivation, and algorithm structure over raw code dumps.
- Use LaTeX for formulas.
- Add language identifiers to fenced code blocks.
- Cite external references when you rely on them.
- Keep terminology consistent within a series.

## Before Opening A Pull Request

1. Run the docs locally and confirm the changed pages render correctly.
2. Check links, math, and code block formatting.
3. If navigation changed, update the VitePress sidebar config.
4. Describe the scope of the change in the pull request.

## Build Commands

Use these commands from the repository root:

```sh
npm run docs:dev
npm run site:build
```

`npm run docs:dev` starts the VitePress docs locally. `npm run site:build` builds the combined site output for GitHub Pages.
