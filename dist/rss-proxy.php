<?php
/**
 * RSS Proxy — serves RSS feeds as JSON for the Orioles Magic frontend.
 * Place this file in the same directory as your built site on cPanel.
 */

header('Access-Control-Allow-Origin: *');

// ── Validate URL ──────────────────────────────────────────────────
$url = filter_var($_GET['url'] ?? '', FILTER_VALIDATE_URL);
$format = strtolower($_GET['format'] ?? '');
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
    'tht.fangraphs.com',
    'mlbtraderumors.com',
    'baseballprospectus.com',
    'camdenchat.com',
    'birdswatcher.com',
    'eutawstreetreport.com',
    'masnsports.com',
    'orioleshangout.com',
    'cbssports.com',
    'sports.yahoo.com',
    'mlb.nbcsports.com',
    'nbcsports.com',
    'baseballamerica.com',
    'nytimes.com',
    'substack.com',
    'youtube.com',
    'megaphone.fm',
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

// ── Fetch the upstream resource ───────────────────────────────────
$accept = 'application/rss+xml, application/xml, text/xml, */*';
if ($format === 'text') {
    $accept = 'text/html, text/plain, */*';
} elseif ($format === 'audio') {
    $accept = 'audio/*,*/*;q=0.8';
}

$headers = [
    'User-Agent: Mozilla/5.0 (compatible; OriolesNews/1.0)',
    'Accept: ' . $accept,
    'Accept-Language: en-US,en;q=0.9',
];
if ($format === 'audio' && !empty($_SERVER['HTTP_RANGE'])) {
    $headers[] = 'Range: ' . $_SERVER['HTTP_RANGE'];
}

$ctx = stream_context_create([
    'http' => [
        'timeout'          => 10,
        'follow_location'  => 1,
        'max_redirects'    => 3,
        'ignore_errors'    => true,
        'header'           => implode("\r\n", $headers),
    ],
    'ssl' => [
        'verify_peer'      => true,
        'verify_peer_name' => true,
    ],
]);

$xml_raw = @file_get_contents($url, false, $ctx);
if ($xml_raw === false) {
    http_response_code(502);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Failed to fetch feed']);
    exit;
}

if ($format === 'audio') {
    $response_headers = $http_response_header ?? [];
    $status_code = 200;
    $content_type = 'audio/mpeg';
    $content_length = strlen($xml_raw);
    $content_range = null;
    $accept_ranges = 'bytes';

    foreach ($response_headers as $header_line) {
        if (preg_match('#^HTTP/\S+\s+(\d{3})#', $header_line, $m)) {
            $status_code = (int)$m[1];
        } elseif (stripos($header_line, 'Content-Type:') === 0) {
            $content_type = trim(substr($header_line, 13));
        } elseif (stripos($header_line, 'Content-Length:') === 0) {
            $content_length = trim(substr($header_line, 15));
        } elseif (stripos($header_line, 'Content-Range:') === 0) {
            $content_range = trim(substr($header_line, 14));
        } elseif (stripos($header_line, 'Accept-Ranges:') === 0) {
            $accept_ranges = trim(substr($header_line, 14));
        }
    }

    http_response_code($status_code);
    header('Cache-Control: public, max-age=900');
    header('Content-Type: ' . $content_type);
    header('Content-Length: ' . $content_length);
    header('Accept-Ranges: ' . $accept_ranges);
    if ($content_range) {
        header('Content-Range: ' . $content_range);
    }
    echo $xml_raw;
    exit;
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=900'); // 15-minute browser cache

if ($format === 'text') {
    echo json_encode([
        'text' => $xml_raw,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
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
    // YouTube Atom: extract yt:videoId for reliable link + thumbnail
    $yt_video_id = '';
    if (isset($entry_ns['yt'])) {
        $yt = $entry->children($entry_ns['yt']);
        $yt_video_id = (string)($yt->videoId ?? '');
        if ($yt_video_id) {
            $link = 'https://www.youtube.com/watch?v=' . $yt_video_id;
        }
    }
    if (!$link) {
        // Atom: iterate <link> elements, prefer rel="alternate"
        if (!empty($entry->link)) {
            foreach ($entry->link as $lnk) {
                $attrs = $lnk->attributes();
                $rel = (string)($attrs['rel'] ?? '');
                $href = (string)($attrs['href'] ?? '');
                if ($rel === 'alternate' && $href) { $link = $href; break; }
                if (!$link && $href) $link = $href;
            }
            if (!$link) $link = (string)$entry->link;
        }
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

    // media:content or media:thumbnail (also check inside media:group for YouTube)
    if (isset($entry_ns['media'])) {
        $media = $entry->children($entry_ns['media']);
        if (!empty($media->group)) {
            $group = $media->group->children($entry_ns['media']);
            if (!$thumbnail && !empty($group->thumbnail)) {
                $attrs = $group->thumbnail->attributes();
                $thumbnail = (string)($attrs['url'] ?? '');
            }
            if (!$thumbnail && !empty($group->content)) {
                $attrs = $group->content->attributes();
                $thumbnail = (string)($attrs['url'] ?? '');
            }
        }
        if (!$thumbnail && !empty($media->content)) {
            $attrs = $media->content->attributes();
            $thumbnail = (string)($attrs['url'] ?? '');
        }
        if (!$thumbnail && !empty($media->thumbnail)) {
            $attrs = $media->thumbnail->attributes();
            $thumbnail = (string)($attrs['url'] ?? '');
        }
    }

    // YouTube fallback: build thumbnail from yt:videoId
    if (!$thumbnail && $yt_video_id) {
        $thumbnail = 'https://i.ytimg.com/vi/' . $yt_video_id . '/mqdefault.jpg';
    }

    // enclosure with image type
    if (!$thumbnail && !empty($entry->enclosure)) {
        $enc = $entry->enclosure->attributes();
        $enc_type = strtolower((string)($enc['type'] ?? ''));
        if (strpos($enc_type, 'image/') === 0) {
            $thumbnail = (string)($enc['url'] ?? '');
        }
    }

    $audio_url = null;
    $audio_type = null;
    if (!empty($entry->enclosure)) {
        $enc = $entry->enclosure->attributes();
        $enc_type = strtolower((string)($enc['type'] ?? ''));
        if (strpos($enc_type, 'audio/') === 0) {
            $audio_url = (string)($enc['url'] ?? '');
            $audio_type = $enc_type ?: null;
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
        'audioUrl'    => $audio_url,
        'audioType'   => $audio_type,
    ];

    if (count($items) >= 20) break;
}

echo json_encode([
    'feedTitle' => $feed_title,
    'items'     => $items,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
