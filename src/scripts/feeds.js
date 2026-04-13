// ── Feeds ─────────────────────────────────────────────────────────
import { PROXY } from './config.js';
import {
  MAX_VISIBLE_ARTICLES,
  selectDisplayArticles,
  selectDisplayBundles,
} from './feedDisplay.js';
import {
  getReadArticles,
  getReadAthBundles,
  markRead,
  markReadAthBundle,
  unmarkRead,
  getDisabledSources,
  saveDisabledSources,
} from './storage.js';
import { state } from './state.js';
import {
  $,
  PLACEHOLDER_IMG,
  faviconUrl,
  isOffTopic,
  isMiLB,
  extractThumbnail,
  esc,
  relativeDate,
  sanitizeHtml,
  buildReaderDoc,
  cleanFeedText,
  teamLogoSrc,
} from './utils.js';

// ── Source registry (populated on first load) ─────────────────────
let ALL_FEEDS = [];
export function getAllSources() { return ALL_FEEDS; }

// ── View mode ─────────────────────────────────────────────────────
export function setViewMode(view, { render = true } = {}) {
  state.viewMode = view;
  const toggle = $('viewToggle');
  if (toggle) {
    toggle.querySelectorAll('.view-btn').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.view === state.viewMode));
  }
  if (render) renderArticles();
}

// ── Feed fetching ─────────────────────────────────────────────────
async function fetchFeed(source) {
  try {
    const url = `${PROXY}?url=${encodeURIComponent(source.url)}`;
    const data = await fetch(url).then(r => r.json());
    return {
      source,
      articles: (data.items ?? []).map(item => ({
        title: cleanFeedText(item.title),
        link: item.link ?? '',
        pubDate: item.pubDate ?? '',
        description: cleanFeedText(item.description),
        content: item.content ?? '',
        thumbnail: item.thumbnail ?? null,
      })),
    };
  } catch {
    return { source, articles: [] };
  }
}

export async function loadFeeds() {
  $('articleList').innerHTML = '<div class="feed-msg">Loading news…</div>';
  let FEEDS;
  try {
    FEEDS = await fetch(`${import.meta.env.BASE_URL}feeds.json`).then(r => r.json());
    ALL_FEEDS = FEEDS;
  } catch {
    $('articleList').innerHTML = '<div class="feed-msg">Could not load feeds.json</div>';
    return [];
  }

  const disabled = getDisabledSources();
  const activeFEEDS = FEEDS.filter(f => !disabled.has(f.id));

  if (activeFEEDS.length === 0) {
    state.articles = [];
    renderSourceFilters();
    $('articleList').innerHTML =
      '<div class="feed-msg">No sources selected. <button class="feed-msg-link" id="feedMsgSettingsBtn">Open Settings</button> to enable sources.</div>';
    document.getElementById('feedMsgSettingsBtn')?.addEventListener('click', () =>
      document.getElementById('settingsBtn')?.click());
    return [];
  }

  const results = await Promise.allSettled(activeFEEDS.map(fetchFeed));

  state.articles = [];
  const successfulSources = [];

  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    const { source, articles } = r.value;
    successfulSources.push(source);
    for (const article of articles) {
      if (isOffTopic(article)) continue;
      const effectiveSource = isMiLB(article)
        ? { ...source, category: 'milb' }
        : source;
      state.articles.push({ ...article, source: effectiveSource });
    }
  }

  renderSourceFilters();
  renderArticles();
  return successfulSources;
}

// ── Source filters ────────────────────────────────────────────────
function syncSourceFilterBtn() {
  const btn = $('sourceFilterBtn');
  if (!btn) return;
  const disabled = getDisabledSources();
  const isFiltered = disabled.size > 0;
  btn.setAttribute('aria-pressed', String(isFiltered));
  const label = btn.querySelector('.source-filter-label');
  if (label) {
    if (isFiltered && ALL_FEEDS.length > 0) {
      const active = ALL_FEEDS.length - disabled.size;
      label.textContent = `${active} / ${ALL_FEEDS.length} Sources`;
    } else {
      label.textContent = 'Sources';
    }
  }
}

export function renderSourceFilters() {
  const sources = ALL_FEEDS;
  const disabled = getDisabledSources();
  const container = $('sourceFilters');

  container.innerHTML =
    `<button class="pill${disabled.size === 0 ? ' active' : ''}" data-source="all">All</button>` +
    sources.map(s =>
      `<button class="pill${!disabled.has(s.id) ? ' active' : ''}" data-source="${esc(s.id)}">${esc(s.name)}</button>`
    ).join('');

  syncSourceFilterBtn();

  container.querySelector('[data-source="all"]').addEventListener('click', () => {
    saveDisabledSources(new Set());
    renderSourceFilters();
    loadFeeds();
  });

  container.querySelectorAll('.pill:not([data-source="all"])').forEach(pill => {
    pill.addEventListener('click', () => {
      const current = getDisabledSources();
      const id = pill.dataset.source;
      const wasDisabled = current.has(id);
      if (wasDisabled) {
        current.delete(id);
      } else {
        current.add(id);
      }
      saveDisabledSources(current);
      renderSourceFilters();
      if (wasDisabled) {
        loadFeeds();
      } else {
        renderArticles();
      }
    });
  });
}

export function syncShowReadButton() {
  const btn = $('showReadBtn');
  if (!btn) return;
  btn.setAttribute('aria-pressed', state.showRead ? 'true' : 'false');
  btn.textContent = state.showRead ? 'Hide read' : 'Show read';
}

// ── Article filtering ─────────────────────────────────────────────
function getFilteredArticles() {
  let arts = state.articles;
  const rangeDays = state.dateRange || 3;
  const cutoff = Date.now() - rangeDays * 864e5;

  if (!state.searchQuery) {
    arts = arts.filter(a => {
      const d = new Date(a.pubDate);
      return !isNaN(d) && d.getTime() > cutoff;
    });
  }

  if (state.activeCategory !== 'all') {
    arts = arts.filter(a => a.source.category === state.activeCategory);
  }
  const disabledSources = getDisabledSources();
  if (disabledSources.size > 0) {
    arts = arts.filter(a => !disabledSources.has(a.source.id));
  }
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    arts = arts.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.source.name.toLowerCase().includes(q)
    );
  }

  if (state.sortBy === 'date') {
    arts = [...arts].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  } else {
    arts = [...arts].sort((a, b) =>
      a.source.name.localeCompare(b.source.name) || new Date(b.pubDate) - new Date(a.pubDate)
    );
  }

  return arts;
}

function getAthArticles(articles, windowDays = 3) {
  const cutoff = Date.now() - windowDays * 864e5;
  return articles.filter(article => {
    const d = new Date(article.pubDate);
    return !isNaN(d) && d.getTime() > cutoff;
  });
}

function getAthCandidateArticles() {
  let arts = state.articles;

  if (state.activeCategory !== 'milb') {
    arts = arts.filter(a => a.source.category !== 'milb');
  }
  if (state.activeCategory !== 'all') {
    arts = arts.filter(a => a.source.category === state.activeCategory);
  }
  const disabledSources = getDisabledSources();
  if (disabledSources.size > 0) {
    arts = arts.filter(a => !disabledSources.has(a.source.id));
  }

  return [...arts].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
}

// ── Article card rendering ────────────────────────────────────────
function articleDateGroup(dateStr) {
  if (!dateStr) return 'Older';
  const d = new Date(dateStr);
  if (isNaN(d)) return 'Older';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const articleDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today - articleDay) / 864e5);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'This Week';
  if (diffDays <= 30) return 'This Month';
  return 'Older';
}

function cardDescriptionClamp(article, mode) {
  if (!article.description || mode === 'compact') return 0;

  const titleLen = (article.title || '').length;
  const descLen = (article.description || '').length;
  const loadScore =
    (titleLen > 110 ? 2 : titleLen > 72 ? 1 : 0) +
    (descLen > 180 ? 2 : descLen > 96 ? 1 : 0) +
    (extractThumbnail(article) ? 1 : 0) +
    ((article.content || '').length > 500 ? 1 : 0);

  if (loadScore >= 5) return 0;
  if (loadScore >= 3) return 1;
  return 2;
}

function renderCardDescription(article, mode) {
  const clamp = cardDescriptionClamp(article, mode);
  if (!clamp) return '';
  return `<div class="article-desc article-desc--clamp-${clamp}">${esc(article.description)}</div>`;
}

function renderCard(a, i) {
  const imgSrc = extractThumbnail(a);
  const hasFullContent = (a.content || '').length > 400;
  const isPaywall = a.source.id === 'athletic';
  const mode = state.viewMode;
  const favicon = faviconUrl(a.link);
  const isRead = getReadArticles().has(a.link);
  const readClass = isRead ? ' read' : '';
  const paywallAttr = isPaywall ? ' data-paywall="1"' : '';
  const readTick = isRead ? '<span class="read-tick" title="Read">✓</span>' : '';
  const paywallBadge = isPaywall ? '<span class="paywall-badge">🔒 Subscriber</span>' : '';

  const fallback = `<div class=\\'article-thumb-placeholder\\'><img class=\\'placeholder-logo\\' src=\\'${PLACEHOLDER_IMG}\\' alt=\\'\\'></div>`;
  const thumbImg = imgSrc
    ? `<img class="article-thumb" src="${esc(imgSrc)}" alt="" loading="lazy" referrerpolicy="no-referrer"
         onerror="this.outerHTML='${fallback}'"
         onload="var w=this.naturalWidth,h=this.naturalHeight,r=w/h;if(w<80||h<60||r>4||r<0.3)this.outerHTML='${fallback}'">`
    : `<div class="article-thumb-placeholder"><img class="placeholder-logo" src="${PLACEHOLDER_IMG}" alt=""></div>`;

  const source = `<span class="source-line">
    <img class="source-ico" src="${esc(favicon)}" alt="" onerror="this.style.display='none'">
    <span class="source-name">${esc(a.source.name)}</span>
    <span class="article-date">${relativeDate(a.pubDate)}</span>
    ${paywallBadge}
    ${hasFullContent ? '<span class="full-badge">Full</span>' : ''}
    <button class="share-btn" data-url="${esc(a.link)}" data-title="${esc(a.title)}" title="Share" onclick="event.stopPropagation();if(navigator.share)navigator.share({title:this.dataset.title,url:this.dataset.url});else{navigator.clipboard.writeText(this.dataset.url);this.textContent='Copied!';setTimeout(()=>this.innerHTML='<svg width=\\'12\\' height=\\'12\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><path d=\\'M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8\\'/><polyline points=\\'16 6 12 2 8 6\\'/><line x1=\\'12\\' y1=\\'2\\' x2=\\'12\\' y2=\\'15\\'/></svg>',1500)}">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
    </button>
    ${readTick}
  </span>`;

  if (mode === 'compact') {
    return `<div class="article-card compact${readClass}" data-idx="${i}"${paywallAttr} role="button" tabindex="0">
      ${source}
      <div class="article-title">${esc(a.title)}</div>
    </div>`;
  }

  if (mode === 'list') {
    return `<div class="article-card list-view${readClass}" data-idx="${i}"${paywallAttr} role="button" tabindex="0">
      ${thumbImg}
      <div class="article-body">
        ${source}
        <div class="article-title">${esc(a.title)}</div>
        ${renderCardDescription(a, mode)}
      </div>
    </div>`;
  }

  return `<div class="article-card${readClass}" data-idx="${i}"${paywallAttr} role="button" tabindex="0">
    ${thumbImg}
    <div class="article-body">
      ${source}
      <div class="article-title">${esc(a.title)}</div>
      ${renderCardDescription(a, mode)}
    </div>
  </div>`;
}

// ── "Around the Horn" story bundling ─────────────────────────────
function tokenize(title) {
  const stop = new Set(['a','an','the','of','in','on','to','for','and','is','are','was','at','by','with','from','vs','after','how','what','why','who','this','that','it','its','has','have','had','be','do','does','not','but','or','can','will','may','about','into','over','up','out','no','so','all','just','than','then','also','new','more','first','last','one','two','three','game','games','mlb','baseball','season','team','teams','series','win','wins','loss','losses','says','said','gets','get','makes','make','takes','take','latest','report','reports','notes','preview','recap','update','updates','story']);
  return title.toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stop.has(w));
}

function bundleSlug(label) {
  return String(label || 'around-the-horn')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'around-the-horn';
}

function bundleAnchorTokens(tokens) {
  return tokens.filter(token =>
    token.length >= 5 ||
    ['orioles', 'yankees', 'redsox', 'bluejays', 'rays', 'astros', 'dodgers', 'mets', 'braves', 'cubs', 'padres'].includes(token)
  );
}

function cleanBundleHeadline(title) {
  return String(title || '')
    .replace(/^[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3}:\s+/, '')
    .replace(/\s+\|\s+[^|]+$/, '')
    .replace(/\s+[—-]\s+(ESPN|MLB\.com|The Athletic|CBS Sports|Yahoo Sports|FOX Sports|Sports Illustrated|Baltimore Banner|PressBox|MASN|Camden Chat)$/i, '')
    .replace(/\s+[—|-]\s+by\s+[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3}$/i, '')
    .replace(/\s+\|\s+by\s+[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3}$/i, '')
    .replace(/\s+\bby\s+[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3}$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function fitBundleHeadline(title, maxLength = 54) {
  const clean = cleanBundleHeadline(title);
  if (clean.length <= maxLength) return clean;
  const words = clean.split(' ');
  let fitted = '';

  for (const word of words) {
    const next = fitted ? `${fitted} ${word}` : word;
    if (next.length > maxLength - 1) break;
    fitted = next;
  }

  if (!fitted) return `${clean.slice(0, maxLength - 1).trim()}...`;
  return `${fitted}...`;
}

function bundlePhoto(bundle, usedImages = new Set()) {
  const urls = bundle.articles.map(a => extractThumbnail(a)).filter(Boolean);
  return urls.find(url => !usedImages.has(url)) || urls[0] || null;
}

function isOriolesArticle(article) {
  return article.source?.category === 'orioles' ||
    /\b(orioles|baltimore|camden|adley|henderson|mullins|o'hearn|westburg|rutschman|mountcastle|holliday|cowser|kjerstad|urias|mateo|bautista|cano|eflin|grayson|kremer|povich)\b/i
      .test(`${article.title || ''} ${article.description || ''}`);
}

function bundleVariant(bundle) {
  const oriolesHits = bundle.articles.filter(isOriolesArticle).length;
  return oriolesHits >= Math.max(1, Math.ceil(bundle.articles.length / 2)) ? 'orioles' : 'mlb';
}

function bundleLogoMarkup(bundle, variant) {
  if (variant === 'orioles') {
    return `<img class="bundle-logo-mark" src="${teamLogoSrc(110)}" alt="Orioles logo" loading="lazy">`;
  }
  const mlbFavicon = faviconUrl('https://www.mlb.com');
  return mlbFavicon
    ? `<img class="bundle-logo-mark bundle-logo-mark--mlb" src="${esc(mlbFavicon)}" alt="MLB logo" loading="lazy">`
    : `<span class="bundle-logo-mark bundle-logo-mark--fallback" aria-hidden="true">MLB</span>`;
}

function storeAthBundle(bundle) {
  try {
    const key = 'yr_ath_bundles';
    const existing = JSON.parse(sessionStorage.getItem(key) || '{}');
    existing[bundle.slug] = {
      label: bundle.label,
      slug: bundle.slug,
      sourceCount: bundle.sourceCount,
      tokens: bundle.tokens,
      articles: bundle.articles.map(article => ({
        title: article.title,
        link: article.link,
        source: article.source,
        pubDate: article.pubDate,
        description: article.description,
        content: article.content,
      })),
      savedAt: Date.now(),
    };
    sessionStorage.setItem(key, JSON.stringify(existing));
  } catch { /* ignore storage failures */ }
}

function buildTopicLabel(sharedTokens, articles) {
  const rankedHeadlines = articles
    .map(article => cleanBundleHeadline(article.title))
    .filter(Boolean)
    .map(title => {
      const titleTokens = new Set(tokenize(title));
      const overlap = sharedTokens.filter(token => titleTokens.has(token)).length;
      const hasColon = title.includes(':') ? 1 : 0;
      return { title, overlap, hasColon, length: title.length };
    })
    .sort((a, b) =>
      b.overlap - a.overlap ||
      b.hasColon - a.hasColon ||
      a.length - b.length
    );

  if (rankedHeadlines.length) {
    const preferred = rankedHeadlines.find(item => item.length <= 54) ||
      rankedHeadlines.find(item => item.length <= 64) ||
      rankedHeadlines[0];
    return fitBundleHeadline(preferred.title, 54);
  }

  if (!sharedTokens.length) return 'Around the Horn';

  const phrase = sharedTokens
    .slice(0, 5)
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
  return fitBundleHeadline(phrase || 'Around the Horn', 54);
}

function findStoryBundles(articles, minArticles = 3) {
  if (articles.length < minArticles) return [];

  const artTokens = articles.map((a, i) => ({ idx: i, tokens: new Set(tokenize(a.title)) }));
  const clusters = [];
  const assigned = new Set();

  for (let i = 0; i < artTokens.length; i++) {
    if (assigned.has(i)) continue;
    const cluster = new Set([i]);
    const sharedTokens = new Set(artTokens[i].tokens);

    for (let j = i + 1; j < artTokens.length; j++) {
      if (assigned.has(j)) continue;
      const overlap = [...artTokens[j].tokens].filter(t => sharedTokens.has(t));
      const anchorOverlap = bundleAnchorTokens(overlap);
      if (overlap.length >= 2 && anchorOverlap.length >= 1) {
        cluster.add(j);
        for (const t of sharedTokens) {
          if (!artTokens[j].tokens.has(t)) sharedTokens.delete(t);
        }
      }
    }

    if (cluster.size >= minArticles) {
      const refined = new Set();
      for (const idx of cluster) refined.add(idx);
      for (let j = 0; j < artTokens.length; j++) {
        if (refined.has(j)) continue;
        const overlap = [...artTokens[j].tokens].filter(t => sharedTokens.has(t));
        if (overlap.length >= 2 && bundleAnchorTokens(overlap).length >= 1) refined.add(j);
      }

      const clusterArticles = [...refined].map(idx => articles[idx]);
      const label = buildTopicLabel([...sharedTokens], clusterArticles);
      const selectedArticles = clusterArticles
        .slice()
        .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
        .slice(0, 3);

      const sourceCount = new Set(selectedArticles.map(a => a.source.id)).size;
      if (sourceCount < 2) continue;
      if (selectedArticles.length < 3) continue;

      clusters.push({
        label,
        slug: bundleSlug(label),
        tokens: [...sharedTokens],
        articles: selectedArticles,
        sourceCount,
      });
      for (const idx of refined) assigned.add(idx);
    }
  }

  clusters.sort((a, b) => b.sourceCount - a.sourceCount || b.articles.length - a.articles.length);
  return clusters;
}

function renderBundle(bundle, allArticles, usedImages = new Set()) {
  const thumb = bundlePhoto(bundle, usedImages);
  if (!thumb) return '';
  usedImages.add(thumb);
  const variant = bundleVariant(bundle);
  const thumbHtml = `<img class="bundle-thumb" src="${esc(thumb)}" alt="" loading="lazy">`;

  const sourceIcons = [...new Set(bundle.articles.map(a => a.source.name))].slice(0, 5)
    .map(name => {
      const a = bundle.articles.find(x => x.source.name === name);
      return `<img class="source-ico" src="${esc(faviconUrl(a.link))}" alt="" title="${esc(name)}" onerror="this.style.display='none'">`;
    }).join('');

  const href = `${import.meta.env.BASE_URL}around-the-horn/?topic=${encodeURIComponent(bundle.slug)}`;

  return `<a class="ath-bundle ath-card-link ath-card-link--${variant}" href="${href}" data-bundle-slug="${esc(bundle.slug)}" role="button">
    <div class="bundle-card-media bundle-card-media--${variant}">
      ${thumbHtml}
      <div class="bundle-card-overlay"></div>
      ${bundleLogoMarkup(bundle, variant)}
      <div class="bundle-card-copy">
        <div class="bundle-title">${esc(bundle.label)}</div>
      </div>
    </div>
    <div class="bundle-card-footer">
      <div class="bundle-meta">
        <span class="bundle-sources">${sourceIcons}</span>
      </div>
    </div>
  </a>`;
}

function selectAthBundles(articles) {
  const primaryBundles = findStoryBundles(articles, 3)
    .map(bundle => ({ ...bundle, photo: bundlePhoto(bundle) }))
    .filter(bundle => bundle.photo);
  const oriolesBundle = primaryBundles.find(bundle => bundleVariant(bundle) === 'orioles') || null;
  const nonOriolesPrimary = primaryBundles.filter(bundle => bundleVariant(bundle) !== 'orioles');
  const oriolesPrimary = primaryBundles.filter(bundle => bundleVariant(bundle) === 'orioles');
  const picks = [];
  const usedLinks = new Set();

  function addBundle(bundle) {
    if (!bundle) return;
    if (picks.some(item => item.slug === bundle.slug)) return;
    picks.push(bundle);
    bundle.articles.forEach(article => {
      if (article?.link) usedLinks.add(article.link);
    });
  }

  addBundle(oriolesBundle);

  for (const bundle of nonOriolesPrimary) {
    if (bundle.articles.every(article => article?.link && usedLinks.has(article.link))) continue;
    addBundle(bundle);
    if (picks.length === 3) break;
  }

  if (picks.length < 3) {
    for (const bundle of oriolesPrimary) {
      if (bundle.articles.every(article => article?.link && usedLinks.has(article.link))) continue;
      addBundle(bundle);
      if (picks.length === 3) break;
    }
  }

  return picks.slice(0, 3);
}

function selectTopStoryBundles(articles, limit = 3, excludeLinks = new Set()) {
  const picks = [];
  const seenLinks = new Set(excludeLinks);
  const seenTitles = new Set();

  for (const article of articles.slice().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))) {
    const photo = extractThumbnail(article);
    const normalizedTitle = cleanBundleHeadline(article.title).toLowerCase();
    if (!photo) continue;
    if (article.link && seenLinks.has(article.link)) continue;
    if (normalizedTitle && seenTitles.has(normalizedTitle)) continue;

    picks.push({
      label: fitBundleHeadline(article.title, 54),
      slug: bundleSlug(article.link || article.title),
      tokens: tokenize(article.title),
      articles: [article],
      sourceCount: 1,
    });

    if (article.link) seenLinks.add(article.link);
    if (normalizedTitle) seenTitles.add(normalizedTitle);
    if (picks.length === limit) break;
  }

  return picks;
}

function selectAdaptiveAthBundles(articles) {
  if (state.activeCategory === 'milb') {
    const recent = getAthArticles(articles, 7);
    return selectTopStoryBundles(recent.length ? recent : articles, 3);
  }

  const windows = [3, 7, 14, 30];
  let best = [];

  for (const days of windows) {
    const bundles = selectAthBundles(getAthArticles(articles, days));
    if (bundles.length > best.length) best = bundles;
    if (bundles.length >= 3) return bundles;
  }

  if (best.length < 3) {
    const usedLinks = new Set(best.flatMap(bundle => bundle.articles.map(article => article?.link).filter(Boolean)));
    const fallbackArticles = articles.filter(article => !usedLinks.has(article.link));
    const fallbackBundles = selectTopStoryBundles(fallbackArticles, 3 - best.length, usedLinks);
    return [...best, ...fallbackBundles].slice(0, 3);
  }

  return best;
}

function groupArticles(arts, keyFn) {
  const groups = new Map();
  arts.forEach((a, i) => {
    const key = keyFn(a);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ article: a, idx: i });
  });
  return groups;
}

// ── Render articles ───────────────────────────────────────────────
export function renderArticles() {
  const list = $('articleList');
  const arts = getFilteredArticles();

  if (!arts.length) {
    list.innerHTML = '<div class="feed-msg">No articles match your filters.</div>';
    return;
  }

  const gridClass = state.viewMode === 'list' || state.viewMode === 'compact'
    ? 'article-grid list-layout' : 'article-grid';

  let html = '';

  const bundles = (!state.searchQuery && state.sortBy === 'date')
    ? selectDisplayBundles(selectAdaptiveAthBundles(getAthCandidateArticles()), {
      showRead: state.showRead,
      readBundles: getReadAthBundles(),
      readArticles: getReadArticles(),
      limit: 3,
    }) : [];
  const bundledSet = new Set(bundles.flatMap(b => b.articles));
  const unbundled = arts.filter(a => !bundledSet.has(a));
  const displayArts = selectDisplayArticles(bundles.length ? unbundled : arts, {
    sortBy: state.sortBy,
    showRead: state.showRead,
    readArticles: getReadArticles(),
    limit: MAX_VISIBLE_ARTICLES,
  });

  if (bundles.length) {
    html += `<section class="ath-section">
      <div class="ath-section-head">
        <span class="ath-section-kicker">Featured Stories</span>
        <h2 class="ath-section-title">Around the Horn</h2>
      </div>
      <div class="ath-bundle-grid">${(() => { const used = new Set(); return bundles.map(b => renderBundle(b, arts, used)).join(''); })()}</div>
    </section>`;
  }

  const useGroups = state.sortBy === 'dateGroup' || state.sortBy === 'source';

  if (useGroups) {
    const keyFn = state.sortBy === 'dateGroup'
      ? a => articleDateGroup(a.pubDate)
      : a => a.source.name;

    const groups = groupArticles(displayArts, keyFn);

    for (const [label, items] of groups) {
      html += `<div class="article-group-header">${esc(label)}<span class="group-count">${items.length}</span></div>`;
      html += `<div class="${gridClass}">`;
      html += items.map(({ article, idx }) => renderCard(article, idx)).join('');
      html += `</div>`;
    }
  } else {
    html += `<div class="${gridClass}">`;
    html += displayArts.map((a, i) => renderCard(a, arts.indexOf(a))).join('');
    html += `</div>`;
  }

  list.innerHTML = html;

  list.querySelectorAll('.ath-card-link').forEach(link => {
    link.addEventListener('click', () => {
      const slug = link.dataset.bundleSlug;
      const bundle = bundles.find(item => item.slug === slug);
      if (bundle) {
        storeAthBundle(bundle);
        markReadAthBundle(bundle.slug);
      }
    });
  });

  list.querySelectorAll('.article-card').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.tagName === 'A') return;
      const idx = Number(el.dataset.idx);
      const article = arts[idx];
      if (el.dataset.paywall) {
        markRead(article.link);
        renderArticles();
        window.open(article.link, '_blank', 'noopener,noreferrer');
        return;
      }
      openReader(article);
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') el.click();
    });

    let touchStartX = 0;
    el.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const idx = Number(el.dataset.idx);
      const a = arts[idx];
      if (!a) return;
      if (dx < -60) {
        markRead(a.link);
        renderArticles();
      } else if (dx > 60) {
        unmarkRead(a.link);
        renderArticles();
      }
    }, { passive: true });
  });
}

// ── Reader view ───────────────────────────────────────────────────
export function openReader(article) {
  markRead(article.link);
  renderArticles();

  $('readerTitle').textContent = article.title;
  $('readerDate').textContent = relativeDate(article.pubDate);

  const readerLink = $('readerLink');
  readerLink.href = article.link;
  const favicon = faviconUrl(article.link);
  readerLink.innerHTML = favicon
    ? `<img class="source-favicon" src="${esc(favicon)}" alt="" width="16" height="16" onerror="this.style.display='none'"> Open original ↗`
    : 'Open original ↗';

  const badge = $('readerBadge');
  badge.textContent = article.source.name;
  badge.style.background = article.source.color;

  const frame = $('readerFrame');
  const fallback = $('readerFallback');

  const content = article.content || '';
  if (content.length > 400) {
    const clean = sanitizeHtml(content);
    frame.srcdoc = buildReaderDoc(article, clean);
    frame.classList.remove('hidden');
    fallback.classList.add('hidden');
  } else {
    frame.classList.add('hidden');
    fallback.classList.remove('hidden');
    $('readerExcerpt').textContent = article.description || '';
    $('readerFullLink').href = article.link;
  }

  $('readerOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

export function closeReader() {
  $('readerOverlay').classList.add('hidden');
  document.body.style.overflow = '';
  $('readerFrame').srcdoc = '';
}
