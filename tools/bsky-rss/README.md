# Bluesky RSS Generator

Generate an RSS feed from a public Bluesky profile.

## Quick start (from repo root)

```bash
node tools/bsky-rss/generate.mjs --handle oblachek.eu --out rss/bluesky.xml --site-url https://oblachek.eu
```

## Using npm script

```bash
npm --prefix tools/bsky-rss run generate
```

This default command generates a feed for `oblachek.eu` and includes:
- normal posts
- replies (marked as `[Reply]`)
- quote posts (marked as `[Quote]`)

Reposts are excluded by default.

## Optional flags

- `--limit 30` include up to 30 items in the feed
- `--include-replies` include replies
- `--include-reposts` include reposts (off by default)
