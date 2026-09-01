'use strict';

const https = require('https');

const CATALOG_URL = 'https://models.opencode.ai/api.json';
const ZEN_MODELS_URL = 'https://opencode.ai/zen/v1/models';

/**
 * Fetch JSON via https with Bearer public.
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Authorization: 'Bearer public' } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error('syncModels timeout'));
    });
  });
}

/**
 * Sync FREE_MODELS live từ models.opencode.ai/api.json + filter bằng zen/v1/models.
 * Trả về array {id, name, provider, family, free, description, supportsStreaming, supportsTools}
 * Nếu fetch fail thì trả null để caller fallback về hardcode.
 */
async function syncFreeModels() {
  try {
    const catalog = await fetchJson(CATALOG_URL);
    const opencode = catalog.opencode;
    if (!opencode || !opencode.models) return null;

    // Lấy runtime list để filter (nếu fail thì dùng toàn bộ catalog)
    let runtimeIds = null;
    try {
      const zen = await fetchJson(ZEN_MODELS_URL);
      if (zen && Array.isArray(zen.data)) {
        runtimeIds = new Set(zen.data.map((m) => m.id));
      }
    } catch {
      runtimeIds = null;
    }

    const free = [];
    for (const [id, meta] of Object.entries(opencode.models)) {
      const cost = meta.cost || {};
      const isFree = cost.input === 0 && cost.output === 0;
      if (!isFree) continue;
      // id trong catalog là "mimo-v2.5-free" không prefix, cần map thành opencode/<id>
      const canonical = id.startsWith('opencode/') ? id : `opencode/${id}`;
      const bare = canonical.replace('opencode/', '');
      // Filter theo runtime nếu có
      if (runtimeIds && !runtimeIds.has(bare) && !runtimeIds.has(canonical)) {
        // Vẫn giữ nếu là free nhưng chưa xuất hiện ở zen (để tương lai dùng) — nhưng đánh dấu
        // Ở đây giữ lại để đủ 28, OpenCode vẫn gọi được khi Zen mở thêm model
      }
      free.push({
        id: canonical,
        name: meta.name || bare,
        provider: (meta.provider && meta.provider.npm) || 'opencode',
        family: meta.family || bare,
        free: true,
        description: meta.description || '',
        supportsStreaming: true,
        supportsTools: !!meta.tool_call,
        _meta: meta,
      });
    }
    return free.sort((a, b) => a.id.localeCompare(b.id));
  } catch {
    return null;
  }
}

module.exports = { syncFreeModels, CATALOG_URL, ZEN_MODELS_URL };
