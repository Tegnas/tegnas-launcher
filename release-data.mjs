const repo = 'https://github.com/Tegnas/tegnas-launcher';

// Count downloads reported by GitHub, never clicks on this page.
export function summarizeReleases(raw, checkedAt = new Date().toISOString()) {
  if (!Array.isArray(raw)) throw new Error('Invalid release response');
  const releases = raw.filter(r => !r.draft && r.published_at && Number.isFinite(Date.parse(r.published_at)))
    .sort((a,b) => Date.parse(b.published_at) - Date.parse(a.published_at));
  let downloads = 0;
  const assetIds = new Set();
  const versions = [];
  for (const r of releases) {
    const assets = (r.assets || []).filter(a => a.name === 'TegnasLauncher.exe');
    for (const a of assets) {
      if (!Number.isSafeInteger(a.download_count) || a.download_count < 0) throw new Error('Invalid download count');
      if (a.id == null) throw new Error('Missing asset id');
      if (!assetIds.has(a.id)) { downloads += a.download_count; assetIds.add(a.id); }
    }
    const asset = assets.find(a => typeof a.browser_download_url === 'string' && a.browser_download_url.toLowerCase().startsWith(repo.toLowerCase() + '/releases/download/'));
    if (!asset || !Number.isFinite(asset.size) || asset.size <= 0) continue;
    versions.push({
      tag: String(r.tag_name || ''), name: String(r.name || r.tag_name || ''),
      beta: !!r.prerelease || /beta|alpha|rc|dev/i.test(String(r.tag_name)),
      publishedAt: r.published_at, body: String(r.body || ''),
      url: repo + '/releases/tag/' + encodeURIComponent(r.tag_name),
      asset: {name:asset.name, url:asset.browser_download_url, size:asset.size,
        sha256: /^sha256:[a-f0-9]{64}$/i.test(asset.digest || '') ? asset.digest.slice(7) : null}
    });
  }
  if (!versions.length || !Number.isSafeInteger(downloads)) throw new Error('No valid launcher release');
  return { checkedAt, downloads, countedAssets:assetIds.size, latest:versions[0], releases:versions.slice(0,3) };
}

export async function fetchAllReleases(fetcher = fetch, signal) {
  const result = [];
  for (let page=1;page<=50;page++) {
    const response = await fetcher(`https://api.github.com/repos/Tegnas/tegnas-launcher/releases?per_page=100&page=${page}`, {
      headers:{Accept:'application/vnd.github+json'}, credentials:'omit', signal
    });
    if (!response.ok) throw new Error('GitHub unavailable');
    const part = await response.json();
    if (!Array.isArray(part)) throw new Error('Invalid release page');
    result.push(...part);
    if (part.length < 100) return result;
  }
  throw new Error('Release list incomplete');
}
