<?php
/**
 * RSS Proxy — serves RSS feeds as JSON for the Orioles Magic frontend.
 * Place this file in the same directory as your built site on cPanel.
 */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=900'); // 15-minute browser cache

// ── Validate URL ──────────────────────────────────────────────────
$url = filter_var($_GET['url'] ?? '', FILTER_VALIDATE_URL);
if (!$url) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing or invalid url parameter']);
    exit;
}

// ── Allowlist of trusted RSS domains ─────────────────────────────
$allowed_domains = [
    'mlb.com',
    'orioles.com',
    'espn.com',
    'baltimorebaseball.com',
    'blogs.fangraphs.com',
    'fangraphs.com',
    'thebanner.com',
    'mlbtraderumors.com',
    'baseballprospectus.com',
];

$host = strtolower(parse_url($url, PHP_URL_HOST) ?? '');
$trusted = false;
foreach ($allowed_domains as $domain) {
    if ($host === $domain || substr($host, -(strlen($domain) + 1)) === '.' . $domain) {
        $trusted = true;
        break;
    }
}
if (!$trusted) {
    http_response_code(403);
    echo json_encode(['error' => 'Domain not in allowlist']);
    exit;
}

// ── Fetch the RSS feed ────────────────────────────────────────────
$ctx = stream_context_create([
    'http' => [
        'timeout'          => 10,
        'follow_location'  => 1,
        'max_redirects'    => 3,
        'header'           => implode("\r\n", [
            'User-Agent: Mozilla/5.0 (compatible; OriolesNews/1.0)',
            'Accept: application/rss+xml, application/xml, text/xml, */*',
            'Accept-Language: en-US,en;q=0.9',
        ]),
    ],
    'ssl' => [
        'verify_peer'      => true,
        'verify_peer_name' => true,
    ],
]);

$xml_raw = @file_get_contents($url, false, $ctx);
if ($xml_raw === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Failed to fetch feed']);
    exit;
}

// ── Parse XML ─────────────────────────────────────────────────────
libxml_use_internal_errors(true);
$xml = simplexml_load_string($xml_raw, 'SimpleXMLElement', LIBXML_NOCDATA);
if ($xml === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Invalid XML in feed']);
    exit;
}

// ── Extract items (RSS 2.0 and Atom) ─────────────────────────────
$ns_map = $xml->getNamespaces(true);
$is_atom = isset($ns_map['']) && strpos($xml->getNamespaces()[''] ?? '', 'atom') !== false;

// RSS 2.0: channel > item | Atom: feed > entry
$entries = $xml->channel->item ?? $xml->entry ?? [];
$feed_title = (string)($xml->channel->title ?? $xml->title ?? '');

$items = [];
foreach ($entries as $entry) {
    $entry_ns = $entry->getNamespaces(true);

    // ── Title ──
    $title = trim((string)($entry->title ?? ''));

    // ── Link ──
    $link = '';
    if (!empty($entry->link)) {
        $link_val = $entry->link;
        // Atom uses <link href="..."/>
        $href = (string)($link_val->attributes()['href'] ?? '');
        $link = $href ?: (string)$link_val;
    }
    if (!$link && !empty($entry->guid)) {
        $guid = (string)$entry->guid;
        if (filter_var($guid, FILTER_VALIDATE_URL)) $link = $guid;
    }

    // ── Date ──
    $pub_date = (string)($entry->pubDate ?? $entry->updated ?? $entry->published ?? '');

    // ── Description (plain text excerpt) ──
    $description = '';
    if (!empty($entry->description)) {
        $description = strip_tags((string)$entry->description);
    } elseif (!empty($entry->summary)) {
        $description = strip_tags((string)$entry->summary);
    }
    $description = trim(preg_replace('/\s+/', ' ', $description));
    if (strlen($description) > 300) {
        $description = substr($description, 0, 297) . '…';
    }

    // ── Full content (content:encoded or atom content) ──
    $content = '';
    if (isset($entry_ns['content'])) {
        $content_ns = $entry->children($entry_ns['content']);
        $content = (string)($content_ns->encoded ?? $content_ns->content ?? '');
    }
    if (!$content && !empty($entry->content)) {
        $content = (string)$entry->content;
    }

    // ── Thumbnail ──
    $thumbnail = null;

    // media:content or media:thumbnail
    if (isset($entry_ns['media'])) {
        $media = $entry->children($entry_ns['media']);
        if (!empty($media->content)) {
            $attrs = $media->content->attributes();
            $thumbnail = (string)($attrs['url'] ?? '');
        }
        if (!$thumbnail && !empty($media->thumbnail)) {
            $attrs = $media->thumbnail->attributes();
            $thumbnail = (string)($attrs['url'] ?? '');
        }
    }

    // enclosure with image type
    if (!$thumbnail && !empty($entry->enclosure)) {
        $enc = $entry->enclosure->attributes();
        $enc_type = strtolower((string)($enc['type'] ?? ''));
        if (strpos($enc_type, 'image/') === 0) {
            $thumbnail = (string)($enc['url'] ?? '');
        }
    }

    // Extract first <img> from content
    if (!$thumbnail && $content) {
        if (preg_match('/<img[^>]+src=["\']([^"\']+)["\']/i', $content, $m)) {
            $thumbnail = $m[1];
        }
    }

    $items[] = [
        'title'       => $title,
        'link'        => $link,
        'pubDate'     => $pub_date,
        'description' => $description,
        'content'     => $content,
        'thumbnail'   => $thumbnail ?: null,
    ];

    if (count($items) >= 20) break;
}

echo json_encode([
    'feedTitle' => $feed_title,
    'items'     => $items,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
