#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { mkdir, writeFile } from "node:fs/promises";

const DEFAULT_HANDLE = "oblachek.eu";
const DEFAULT_OUTPUT = "rss/bluesky.xml";
const DEFAULT_LIMIT = 20;
const API_BASE = "https://public.api.bsky.app/xrpc";
const TYPE_LABELS = {
  post: "Post",
  reply: "Reply",
  quote: "Quote",
  repost: "Repost",
};

function printHelp() {
  console.log(`Usage:
  node tools/bsky-rss/generate.mjs [options]

Options:
  --handle <handle>            Bluesky handle or DID (default: ${DEFAULT_HANDLE})
  --out <path>                 Output XML path (default: ${DEFAULT_OUTPUT})
  --limit <number>             Number of items in RSS (default: ${DEFAULT_LIMIT})
  --include-replies            Include replies (default: off)
  --include-reposts            Include reposts (default: off)
  --site-url <url>             Public site URL for atom:link self reference
  -h, --help                   Show this message
`);
}

function parseArgs(argv) {
  const options = {
    handle: DEFAULT_HANDLE,
    out: DEFAULT_OUTPUT,
    limit: DEFAULT_LIMIT,
    includeReplies: false,
    includeReposts: false,
    siteUrl: "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "--include-replies") {
      options.includeReplies = true;
      continue;
    }
    if (arg === "--include-reposts") {
      options.includeReposts = true;
      continue;
    }
    if (arg === "--handle") {
      options.handle = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (arg === "--out") {
      options.out = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (arg === "--limit") {
      options.limit = Number.parseInt(argv[i + 1] ?? "", 10);
      i += 1;
      continue;
    }
    if (arg === "--site-url") {
      options.siteUrl = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.help && !options.handle) {
    throw new Error("Missing --handle value");
  }
  if (!options.help && (!Number.isInteger(options.limit) || options.limit <= 0)) {
    throw new Error("--limit must be a positive integer");
  }

  return options;
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return new Date().toUTCString();
  }
  return date.toUTCString();
}

function textToTitle(text) {
  const trimmed = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return "Bluesky post";
  }
  if (trimmed.length <= 90) {
    return trimmed;
  }
  return `${trimmed.slice(0, 87)}...`;
}

function postUrlFromUri(uri, fallbackHandle) {
  const parts = String(uri ?? "").split("/");
  const rkey = parts.at(-1) ?? "";
  if (!rkey) {
    return `https://bsky.app/profile/${fallbackHandle}`;
  }
  return `https://bsky.app/profile/${fallbackHandle}/post/${rkey}`;
}

function isRepost(feedItem) {
  return Boolean(
    feedItem?.reason && feedItem.reason.$type === "app.bsky.feed.defs#reasonRepost",
  );
}

function isReply(post) {
  return Boolean(post?.record?.reply);
}

function isQuotePost(post) {
  const embed = post?.embed;
  if (!embed || typeof embed !== "object") {
    return false;
  }
  if (embed.$type === "app.bsky.embed.record#view") {
    return Boolean(embed.record);
  }
  if (embed.$type === "app.bsky.embed.recordWithMedia#view") {
    return Boolean(embed.record?.record || embed.record);
  }
  return false;
}

function itemTags(feedItem) {
  if (isRepost(feedItem)) {
    return ["repost"];
  }

  const tags = [];
  if (isReply(feedItem?.post)) {
    tags.push("reply");
  }
  if (isQuotePost(feedItem?.post)) {
    tags.push("quote");
  }
  if (tags.length === 0) {
    tags.push("post");
  }
  return tags;
}

function titleWithTagPrefixes(text, tags) {
  const baseTitle = textToTitle(text);
  const prefixes = tags
    .filter((tag) => tag !== "post")
    .map((tag) => `[${TYPE_LABELS[tag]}]`)
    .join(" ");

  if (!prefixes) {
    return baseTitle;
  }
  return `${prefixes} ${baseTitle}`;
}

function itemPubDate(feedItem) {
  if (isRepost(feedItem)) {
    return formatDate(feedItem?.reason?.indexedAt || feedItem?.post?.indexedAt || Date.now());
  }
  return formatDate(
    feedItem?.post?.record?.createdAt || feedItem?.post?.indexedAt || Date.now(),
  );
}

function itemGuid(feedItem, link) {
  if (isRepost(feedItem)) {
    const byDid = feedItem?.reason?.by?.did || "unknown";
    const repostedAt = feedItem?.reason?.indexedAt || "unknown";
    const postUri = feedItem?.post?.uri || link;
    return `repost:${byDid}:${repostedAt}:${postUri}`;
  }
  return feedItem?.post?.uri || link;
}

function buildDescription(post, postUrl, tags, reason) {
  const text = post?.record?.text ?? "";
  const lines = [];
  if (tags.includes("reply")) {
    lines.push("<strong>Reply</strong>");
  }
  if (tags.includes("quote")) {
    lines.push("<strong>Quote post</strong>");
  }
  if (tags.includes("repost")) {
    const byHandle = reason?.by?.handle ? `@${xmlEscape(reason.by.handle)}` : "this account";
    lines.push(`<strong>Repost</strong> by ${byHandle}`);
  }
  if (String(text).trim()) {
    lines.push(xmlEscape(String(text)).replaceAll("\n", "<br/>"));
  }

  const embed = post?.embed;
  if (embed?.$type === "app.bsky.embed.images#view" && Array.isArray(embed.images)) {
    for (const image of embed.images) {
      const imgUrl = image?.fullsize ?? image?.thumb;
      if (!imgUrl) {
        continue;
      }
      const alt = xmlEscape(image?.alt || "Bluesky image");
      lines.push(`<img src="${xmlEscape(imgUrl)}" alt="${alt}" />`);
    }
  }

  lines.push(`<a href="${xmlEscape(postUrl)}">View post on Bluesky</a>`);
  return lines.join("<br/>");
}

async function fetchJson(endpoint, params) {
  const url = new URL(`${API_BASE}/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      "user-agent": "oblachek-eu-site-bsky-rss/1.0",
      accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Bluesky API ${response.status} ${response.statusText}: ${body}`);
  }

  return response.json();
}

async function resolveDid(handleOrDid) {
  if (handleOrDid.startsWith("did:")) {
    return handleOrDid;
  }
  const data = await fetchJson("com.atproto.identity.resolveHandle", {
    handle: handleOrDid,
  });
  return data.did;
}

async function fetchFeedItems(actorDid, options) {
  const collected = [];
  let cursor = null;
  let attempts = 0;
  const requestLimit = Math.min(100, Math.max(options.limit * 2, 50));

  while (collected.length < options.limit && attempts < 5) {
    attempts += 1;
    const page = await fetchJson("app.bsky.feed.getAuthorFeed", {
      actor: actorDid,
      filter: options.includeReplies ? "posts_with_replies" : "posts_no_replies",
      limit: requestLimit,
      cursor,
    });

    for (const item of page.feed ?? []) {
      if (!options.includeReposts && isRepost(item)) {
        continue;
      }
      collected.push(item);
      if (collected.length >= options.limit) {
        break;
      }
    }

    if (!page.cursor) {
      break;
    }
    cursor = page.cursor;
  }

  return collected.slice(0, options.limit);
}

function renderRssXml(profile, items, options) {
  const profileHandle = profile?.handle || options.handle;
  const channelTitle = `${profile?.displayName || `@${profileHandle}`} on Bluesky`;
  const channelLink = `https://bsky.app/profile/${profileHandle}`;
  const channelDescription = profile?.description
    ? profile.description
    : `Posts from @${profileHandle} on Bluesky`;
  const now = new Date().toUTCString();

  const itemXml = items
    .map((item) => {
      const post = item.post ?? {};
      const postHandle = post?.author?.handle || profileHandle;
      const link = postUrlFromUri(post.uri, postHandle);
      const tags = itemTags(item);
      const pubDate = itemPubDate(item);
      const description = buildDescription(post, link, tags, item.reason);
      const title = titleWithTagPrefixes(post?.record?.text, tags);
      const guid = itemGuid(item, link);
      const categoryXml = [...new Set(tags)]
        .map((tag) => `      <category>${xmlEscape(TYPE_LABELS[tag].toLowerCase())}</category>`)
        .join("\n");

      return `    <item>
      <title>${xmlEscape(title)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="false">${xmlEscape(guid)}</guid>
      <pubDate>${xmlEscape(pubDate)}</pubDate>
${categoryXml}
      <description>${description}</description>
    </item>`;
    })
    .join("\n");

  const normalizedOutPath = options.out
    .replaceAll("\\", "/")
    .split("/")
    .reduce((segments, part) => {
      if (!part || part === ".") {
        return segments;
      }
      if (part === "..") {
        if (segments.length > 0) {
          segments.pop();
        }
        return segments;
      }
      segments.push(part);
      return segments;
    }, [])
    .join("/");

  const atomSelfLink = options.siteUrl
    ? `  <atom:link href="${xmlEscape(
        `${options.siteUrl.replace(/\/$/, "")}/${normalizedOutPath}`,
      )}" rel="self" type="application/rss+xml" />\n`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
  <title>${xmlEscape(channelTitle)}</title>
  <link>${xmlEscape(channelLink)}</link>
  <description>${xmlEscape(channelDescription)}</description>
  <lastBuildDate>${xmlEscape(now)}</lastBuildDate>
${atomSelfLink}${itemXml}
  </channel>
</rss>
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const actorDid = await resolveDid(options.handle);
  const profile = await fetchJson("app.bsky.actor.getProfile", { actor: actorDid });
  const items = await fetchFeedItems(actorDid, options);

  const xml = renderRssXml(profile, items, options);
  const outputPath = path.resolve(process.cwd(), options.out);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, xml, "utf8");

  console.log(
    `Generated ${options.out} with ${items.length} item(s) for @${profile?.handle || options.handle}`,
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
