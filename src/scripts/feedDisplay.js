export const MAX_VISIBLE_ARTICLES = 10;

function bucketArticlesBySource(articles) {
  const buckets = new Map();
  for (const article of articles) {
    const key = article.source?.id || article.source?.name || 'source';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(article);
  }
  for (const bucket of buckets.values()) {
    bucket.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  }
  return [...buckets.values()].sort((a, b) => new Date(b[0]?.pubDate || 0) - new Date(a[0]?.pubDate || 0));
}

function interleaveBySource(articles, limit = MAX_VISIBLE_ARTICLES) {
  const buckets = bucketArticlesBySource(articles);
  const picked = [];
  while (buckets.length && picked.length < limit) {
    for (let i = 0; i < buckets.length && picked.length < limit; i++) {
      const article = buckets[i].shift();
      if (article) picked.push(article);
      if (!buckets[i].length) {
        buckets.splice(i, 1);
        i--;
      }
    }
  }
  return picked;
}

function prioritizeArticles(articles, sortBy, limit) {
  return sortBy === 'date'
    ? interleaveBySource(articles, limit)
    : articles.slice(0, limit);
}

export function selectDisplayArticles(articles, {
  sortBy = 'date',
  showRead = false,
  readArticles = new Set(),
  limit = MAX_VISIBLE_ARTICLES,
} = {}) {
  if (showRead) return prioritizeArticles(articles, sortBy, limit);

  const unread = articles.filter(article => !readArticles.has(article.link));
  const alreadyRead = articles.filter(article => readArticles.has(article.link));

  const picked = prioritizeArticles(unread, sortBy, limit);
  if (picked.length >= limit) return picked.slice(0, limit);

  const readFill = prioritizeArticles(alreadyRead, sortBy, limit)
    .filter(article => !picked.includes(article));
  return [...picked, ...readFill].slice(0, limit);
}

export function selectDisplayBundles(bundles, {
  showRead = false,
  readBundles = new Set(),
  readArticles = new Set(),
  limit = 3,
} = {}) {
  if (showRead) return bundles.slice(0, limit);

  const scored = bundles.map(bundle => {
    const unreadCount = bundle.articles.filter(article => !readArticles.has(article.link)).length;
    const isReadBundle = readBundles.has(bundle.slug) || unreadCount === 0;
    return { bundle, unreadCount, isReadBundle };
  });

  scored.sort((a, b) =>
    Number(a.isReadBundle) - Number(b.isReadBundle) ||
    b.unreadCount - a.unreadCount ||
    new Date(b.bundle.articles[0]?.pubDate || 0) - new Date(a.bundle.articles[0]?.pubDate || 0)
  );

  return scored.slice(0, limit).map(item => item.bundle);
}
