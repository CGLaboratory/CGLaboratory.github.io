# Content workflow

The site keeps deployable pages at the repository root and groups supporting
files by purpose:

```txt
assets/
  css/       Site styles
  images/    Logos, icons, and static image assets
  js/        Browser scripts for each page
content/     Markdown and YAML source material
data/        Generated JSON consumed by browser scripts
scripts/     Build and validation scripts
```

Do not edit `data/library.json` by hand. It is generated from YAML metadata.

## Add a tutorial series

Create a directory under `content/series/`:

```txt
content/series/my-series/
  series.yaml
  first-chapter.md
  second-chapter.md
```

`series.yaml`:

```yaml
id: my-series
title: My Series
order: 10
type: Series Tutorial
status: Planned
level: Foundations
color: blue
summary: One sentence describing the series.
topics:
  - Topic A
  - Topic B
chapters:
  - id: first-chapter
    title: First Chapter
    summary: Short chapter summary.
    file: first-chapter.md
    featured: true
```

Then regenerate the public catalog:

```sh
node scripts/build-library.js
```

## Add paper entries

Edit `content/papers/papers.yaml`. PDF linking is reserved for the later paper workflow.
