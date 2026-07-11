// ── Around the Horn story bundle page ────────────────────────────────
import { esc, relativeDate, faviconUrl } from './utils.js';

const grid = document.getElementById('athStoryGrid');
const title = document.getElementById('athPageTitle');
const subtitle = document.getElementById('athPageSubtitle');
const key = 'yr_ath_bundles';
const params = new URLSearchParams(window.location.search);
const slug = params.get('topic') || '';

function renderStoryCard(article) {
  const favicon = faviconUrl(article.link);
  const desc = (article.description || '').slice(0, 180);
  return `<article class="ath-story-card">
    <div class="ath-story-meta">
      ${favicon ? `<img class="source-ico" src="${esc(favicon)}" alt="" onerror="this.style.display='none'">` : ''}
      <span class="source-name">${esc(article.source?.name || 'Source')}</span>
      <span class="article-date">${esc(relativeDate(article.pubDate))}</span>
    </div>
    <h2 class="ath-story-title"><a href="${esc(article.link)}" target="_blank" rel="noopener noreferrer">${esc(article.title || 'Untitled')}</a></h2>
    ${desc ? `<p class="ath-story-desc">${esc(desc)}</p>` : ''}
  </article>`;
}

let bundles = {};
try {
  bundles = JSON.parse(sessionStorage.getItem(key) || '{}');
} catch {
  bundles = {};
}

const bundle = bundles[slug];

if (!bundle) {
  title.textContent = 'Story bundle unavailable';
  subtitle.textContent = 'This link only works right after clicking an Around the Horn card — the story bundle isn’t saved anywhere else yet.';
  grid.innerHTML = `
    <div class="ath-empty-state">
      <p class="feed-msg">No saved Around the Horn bundle was found for this story. Head back and pick a story from the "Around the Horn" section to see its full coverage bundle.</p>
      <a class="ath-empty-cta" href="${import.meta.env.BASE_URL}">← Back to Yard Report</a>
    </div>
  `;
} else {
  title.textContent = bundle.label || 'Around the Horn';
  subtitle.textContent = `${bundle.sourceCount || 0} sources • ${(bundle.articles || []).length} related articles`;
  grid.innerHTML = (bundle.articles || []).map(renderStoryCard).join('') || '<div class="feed-msg">No related articles found.</div>';
}
