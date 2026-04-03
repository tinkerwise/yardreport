import { defineConfig } from 'astro/config';

// Dev-only plugin: proxies rss-proxy.php requests so the static PHP file
// doesn't need a running PHP server during local development.
function rssProxyDevPlugin() {
  return {
    name: 'rss-proxy-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.includes('rss-proxy.php')) return next();

        const { searchParams } = new URL(req.url, 'http://localhost');
        const feedUrl = searchParams.get('url');
        const format = searchParams.get('format');
        if (!feedUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing url parameter' }));
          return;
        }

        try {
          const response = await fetch(feedUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; OriolesNews/1.0)',
              Accept: format === 'text' ? 'text/html, text/plain, */*' : 'application/rss+xml, application/xml, text/xml, */*',
            },
          });
          const xml = await response.text();

          if (format === 'text') {
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(JSON.stringify({ text: xml }));
            return;
          }

          // Extract text content of a single XML tag, handling CDATA
          function extractTag(src, tag) {
            const re = new RegExp(
              `<${tag}[^>]*>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`,
              'i'
            );
            return (src.match(re)?.[1] ?? src.match(re)?.[2] ?? '').trim();
          }

          const items = [];
          for (const [, itemXml] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
            if (items.length >= 20) break;

            const title = extractTag(itemXml, 'title');
            const pubDate = extractTag(itemXml, 'pubDate');

            // Link: plain text or Atom href attribute
            let link = extractTag(itemXml, 'link');
            if (!link) {
              link = itemXml.match(/<link[^>]+href="([^"]+)"/)?.[1] ?? '';
            }

            // Description — strip HTML tags, truncate
            const rawDesc = extractTag(itemXml, 'description');
            const plainDesc = rawDesc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            const description =
              plainDesc.length > 297 ? plainDesc.slice(0, 297) + '…' : plainDesc;

            const content = extractTag(itemXml, 'content:encoded');

            // Thumbnail: media:content/thumbnail → enclosure → first <img> in content
            let thumbnail = null;
            const mediaUrl = itemXml.match(/<media:(?:content|thumbnail)[^>]+url="([^"]+)"/)?.[1];
            if (mediaUrl) thumbnail = mediaUrl;
            if (!thumbnail) {
              const enc = itemXml.match(/<enclosure[^>]+type="image\/[^"]*"[^>]+url="([^"]+)"/);
              if (enc) thumbnail = enc[1];
            }
            if (!thumbnail && content) {
              thumbnail = content.match(/<img[^>]+src=["']([^"']+)["']/)?.[1] ?? null;
            }

            items.push({ title, link, pubDate, description, content, thumbnail });
          }

          const feedTitle = extractTag(xml.match(/<channel>([\s\S]*)/)?.[1] ?? '', 'title');

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify({ feedTitle, items }));
        } catch {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to fetch feed' }));
        }
      });
    },
  };
}

export default defineConfig({
  site: 'https://www.briancsmith.org',
  base: '/yardreport/',
  output: 'static',
  build: {
    assets: 'assets',
  },
  vite: {
    plugins: [rssProxyDevPlugin()],
    build: {
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name][extname]',
        },
      },
    },
  },
});
