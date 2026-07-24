/**
 * 招标信息同步脚本
 *
 * 用法：
 *   node scripts/sync-tenders.js
 *   node scripts/sync-tenders.js --input scripts/search-results.json
 *
 * 说明：
 * - 默认从后端 API 读取关键词，失败时 fallback 到 产品关键词.txt
 * - 搜索优先读取 --input / TENDER_SEARCH_RESULTS 提供的候选列表；
 *   未提供时尝试 DuckDuckGo HTML 搜索作为兜底（可能被反爬）。
 * - 抓取公告详情后按规则提取投标截止日期。
 * - 去重、分配优先级、更新 index.html、归档已查阅满 30 天记录、Git 提交推送。
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { parseDeadline, normalizeDeadlineText, isNormalizedDeadline } = require('./lib/deadline-parser');

const ROOT = path.resolve(__dirname, '..');
const HTML_PATH = path.join(ROOT, 'index.html');
const BACKUP_PATH = path.join(ROOT, 'index_backup.html');
const KEYWORDS_FILE = path.join(ROOT, '产品关键词.txt');
const API_BASE = 'https://1457331256-984dniw11b.ap-guangzhou.tencentscf.com';

const EXCLUDED_TERMS = ['驾校', '汽车驾驶', '客车租赁', '租车', '驾驶培训'];
const PLATFORM_DOMAINS = [
  { domain: 'crrcgo.cc', name: '中车购2.0平台' },
  { domain: 'cg.95306.cn', name: '国铁采购平台' },
  { domain: 'ggzyfw.beijing.gov.cn', name: '北京市公共资源交易中心' },
  { domain: 'eps.shmetro.com', name: '上海地铁采购平台' },
  { domain: 'cg.shenzhenmc.com', name: '深圳地铁智能招采管理平台' },
  { domain: 'ggzyjy.shandong.gov.cn', name: '青岛市公共资源交易电子服务系统' },
  { domain: 'qianlima.com', name: '千里马招标网' },
  { domain: 'chinabidding.cn', name: '中国招标投标公共服务平台' },
  { domain: 'cebpubservice.com', name: '中国招标投标公共服务平台' },
];

const FIELD_ORDER = ['id', 'name', 'unit', 'category', 'publish', 'deadline', 'link', 'platform', 'priority'];

function log(...args) {
  console.log(...args);
}

function readFile(path) {
  try {
    return fs.readFileSync(path, 'utf-8');
  } catch {
    return null;
  }
}

function detectEOL(text) {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

function splitLines(text) {
  return text.split(/\r?\n/);
}

function joinLines(lines, eol) {
  return lines.join(eol);
}

// ---------- 关键词 ----------

async function fetchKeywords() {
  try {
    const res = await fetch(`${API_BASE}/api/keywords`, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length) return data;
    }
  } catch (e) {
    log('  API 关键词获取失败，使用本地文件 fallback:', e.message);
  }
  const txt = readFile(KEYWORDS_FILE);
  if (!txt) return [];
  return txt
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

// ---------- 招标数据加载与保存 ----------

function loadTendersFromHtml(html) {
  const match = html.match(/let tenders = \[[\s\S]*?\n\s*\];/m);
  if (!match) throw new Error('无法定位 tenders 数组');
  const arrText = match[0].replace(/^let tenders = /, '').replace(/;\s*$/, '');
  return new Function('return ' + arrText)();
}

function parseTenderBlocks(html) {
  const lines = splitLines(html);
  const result = [];
  let arrayStartLine = -1;
  let arrayEndLine = -1;

  for (let i = 0; i < lines.length; i++) {
    if (/let tenders = \[/.test(lines[i])) arrayStartLine = i;
    if (arrayStartLine !== -1 && /^\s*\];\s*$/.test(lines[i])) {
      arrayEndLine = i;
      break;
    }
  }

  if (arrayStartLine === -1 || arrayEndLine === -1) {
    throw new Error('无法定位 tenders 数组边界');
  }

  let depth = 1; // 已在数组 [ 内部
  let objStart = -1;
  let currentId = null;
  for (let i = arrayStartLine + 1; i < arrayEndLine; i++) {
    const line = lines[i];
    const openCount = (line.match(/\{/g) || []).length;
    const closeCount = (line.match(/\}/g) || []).length;

    if (depth === 1 && openCount > 0) {
      objStart = i;
      currentId = null;
    }

    if (objStart !== -1 && currentId === null) {
      const idMatch = line.match(/"id"\s*:\s*(\d+|"[^"]+")/);
      if (idMatch) currentId = idMatch[1].replace(/^"|"$/g, '');
    }

    depth += openCount - closeCount;

    if (objStart !== -1 && depth === 1 && closeCount > 0) {
      result.push({ id: currentId, start: objStart, end: i });
      objStart = -1;
    }
  }

  return { lines, arrayStartLine, arrayEndLine, blocks: result };
}

function formatTender(t, objIndent = 12, fieldIndent = 24) {
  const objSpace = ' '.repeat(objIndent);
  const fieldSpace = ' '.repeat(fieldIndent);
  const out = [objSpace + '{'];
  const presentKeys = FIELD_ORDER.filter((k) => k in t);
  for (let i = 0; i < presentKeys.length; i++) {
    const key = presentKeys[i];
    const comma = i < presentKeys.length - 1 ? ',' : '';
    out.push(fieldSpace + `"${key}": ${JSON.stringify(t[key])}${comma}`);
  }
  out.push(objSpace + '}');
  return out.join('\n');
}

function buildUpdatedArray(html, keptBlocks, newTenders) {
  const { lines, arrayStartLine, arrayEndLine } = parseTenderBlocks(html);
  const eol = detectEOL(html);
  const out = [];

  // 数组声明行
  out.push(lines[arrayStartLine]);

  // 保留的历史对象
  const keptLines = [];
  for (const b of keptBlocks) {
    for (let i = b.start; i <= b.end; i++) keptLines.push(lines[i]);
  }
  if (keptLines.length) {
    out.push(...keptLines);
  }

  // 修正最后一个保留对象的逗号
  if (keptLines.length) {
    const idx = out.length - 1;
    const lastLine = out[idx];
    const hasComma = lastLine.trim().endsWith(',');
    if (newTenders.length && !hasComma) {
      out[idx] = lastLine + ',';
    } else if (!newTenders.length && hasComma) {
      out[idx] = lastLine.replace(/,\s*$/, '');
    }
  }

  // 新增对象
  if (newTenders.length) {
    for (let i = 0; i < newTenders.length; i++) {
      out.push(formatTender(newTenders[i]) + (i < newTenders.length - 1 ? ',' : ''));
    }
  }

  // 结束行
  out.push(lines[arrayEndLine]);

  const before = lines.slice(0, arrayStartLine);
  const after = lines.slice(arrayEndLine + 1);
  const newLines = [...before, ...out, ...after];
  let newHtml = joinLines(newLines, eol);
  return newHtml;
}

function saveTenders(html, tendersToKeep, newTenders) {
  const { blocks } = parseTenderBlocks(html);
  const archiveIds = new Set();
  const keptBlocks = blocks.filter((b) => {
    const keep = tendersToKeep.some((t) => String(t.id) === String(b.id));
    if (!keep) archiveIds.add(b.id);
    return keep;
  });

  let newHtml = buildUpdatedArray(html, keptBlocks, newTenders);

  // 更新统计信息
  const total = tendersToKeep.length + newTenders.length;
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${dateStr} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  newHtml = newHtml.replace(
    /(<span id="totalCount"[^>]*>)[^<]+(<\/span>)/,
    `$1${total}$2`
  );
  newHtml = newHtml.replace(
    /(<span class="text-sm text-slate-500">最近更新：)[^<]+(<\/span>)/,
    `$1${timeStr}$2`
  );
  newHtml = newHtml.replace(
    /(数据来源：招标信息汇总\.md \| 生成时间：)\d{4}-\d{2}-\d{2}/,
    `$1${dateStr}`
  );

  fs.copyFileSync(HTML_PATH, BACKUP_PATH);
  fs.writeFileSync(HTML_PATH, newHtml, 'utf-8');

  return { archiveIds: Array.from(archiveIds), total };
}

// ---------- 搜索与抓取 ----------

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : undefined;
}

async function loadCandidates(keywords) {
  const inputPath = getArg('--input') || process.env.TENDER_SEARCH_RESULTS;
  if (inputPath) {
    log(`使用候选文件: ${inputPath}`);
    const data = JSON.parse(readFile(path.resolve(ROOT, inputPath)) || '[]');
    return Array.isArray(data) ? data : [];
  }

  log('未提供候选文件，尝试 DuckDuckGo 搜索（可能被限制）...');
  const all = [];
  for (const kw of keywords) {
    const results = await duckSearch(`${kw} 招标公告 2026`);
    for (const r of results) {
      all.push({ ...r, keyword: kw });
    }
  }
  return all;
}

async function duckSearch(query) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const results = [];
    // DuckDuckGo HTML 结果
    const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) && results.length < 10) {
      const rawHref = m[1];
      const title = stripHtml(m[2]).trim();
      const link = decodeDuckLink(rawHref);
      if (link && title) results.push({ title, url: link, snippet: '' });
    }
    return results;
  } catch (e) {
    log('  DuckDuckGo 搜索失败:', e.message);
    return [];
  }
}

function decodeDuckLink(href) {
  try {
    if (href.startsWith('http')) return href;
    const u = new URL(href, 'https://duckduckgo.com');
    const real = u.searchParams.get('uddg');
    if (real) return decodeURIComponent(real);
  } catch {}
  return null;
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchPageText(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    log(`  抓取失败 ${url}: ${e.message}`);
    return null;
  }
}

function extractFromPage(html, url, keyword, candidateTitle) {
  const text = stripHtml(html);

  // 标题：优先使用搜索结果传入的标题，fallback 到页面 title/h1
  let name = '';
  if (candidateTitle && candidateTitle.length > 5) {
    name = candidateTitle.trim();
  } else {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    name = stripHtml(titleMatch ? titleMatch[1] : h1Match ? h1Match[1] : '');
  }
  if (!name) name = text.slice(0, 120);

  // 发布时间
  let publish = null;
  const pubRe = /(?:发布|公告|采购)时间[：:]?\s*(\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?)/i;
  const pubMatch = text.match(pubRe);
  if (pubMatch) publish = normalizeDate(pubMatch[1]);
  if (!publish) {
    // 取正文中第一个合理日期
    const firstDate = text.match(/\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?/);
    if (firstDate) publish = normalizeDate(firstDate[0]);
  }
  if (!publish) publish = new Date().toISOString().split('T')[0];

  // 招标单位
  let unit = '';
  const unitRe = /(?:招标人|采购人|招标单位|采购单位|招\s*标\s*人)[：:]?\s*([\u4e00-\u9fa5][\u4e00-\u9fa5a-zA-Z0-9()（）\s]{2,80})/i;
  const unitMatch = text.match(unitRe);
  if (unitMatch) unit = unitMatch[1].trim();

  // 截止日期
  const parsed = parseDeadline(text, publish);
  const deadline = parsed.value || '待确认';

  // 平台
  const platform = detectPlatform(url);

  // 类别
  const category = keyword || '未分类';

  return { name, unit, category, publish, deadline, link: url, platform };
}

function normalizeDate(str) {
  if (!str) return null;
  const m = str
    .replace(/日$/, '')
    .match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})$/);
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function detectPlatform(url) {
  try {
    const host = new URL(url).hostname;
    for (const p of PLATFORM_DOMAINS) {
      if (host.includes(p.domain)) return p.name;
    }
  } catch {}
  return '其他';
}

// ---------- 过滤、去重、优先级 ----------

function isExcluded(text) {
  return EXCLUDED_TERMS.some((term) => text.includes(term));
}

function normalizeName(name) {
  return name.replace(/\s+/g, '').replace(/[\uff08\uff09]/g, '').trim();
}

function daysUntil(deadline) {
  if (!deadline || !isNormalizedDeadline(deadline)) return null;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function assignPriority(tender, keyword) {
  const remaining = daysUntil(tender.deadline);
  const name = tender.name;
  const exactMatch = keyword && name.includes(keyword);
  if (remaining !== null && remaining <= 7 && exactMatch) return '高';
  if ((remaining !== null && remaining <= 30) || exactMatch) return '中';
  return '低';
}

// ---------- 归档 ----------

async function loadStatuses() {
  try {
    const res = await fetch(`${API_BASE}/api/statuses`, { signal: AbortSignal.timeout(8000) });
    if (res.ok) return await res.json();
  } catch {}
  return {};
}

async function archiveOldTenders(tenders) {
  const statuses = await loadStatuses();
  const now = Date.now();
  const archiveIds = [];
  for (const t of tenders) {
    const state = statuses[t.id];
    const time = statuses[`${t.id}_time`];
    if (state === '已查阅' && time) {
      const days = (now - new Date(time).getTime()) / (1000 * 60 * 60 * 24);
      if (days > 30) archiveIds.push(t.id);
    }
  }
  if (!archiveIds.length) return [];

  for (const id of archiveIds) {
    const t = tenders.find((x) => String(x.id) === String(id));
    if (!t) continue;
    try {
      const res = await fetch(`${API_BASE}/api/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(t),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) log(`  归档 POST 失败 id=${id}: ${res.status}`);
    } catch (e) {
      log(`  归档异常 id=${id}: ${e.message}`);
    }
  }

  // 清理超过 7 天未操作的归档
  try {
    const archived = await (await fetch(`${API_BASE}/api/archive`, { signal: AbortSignal.timeout(8000) })).json();
    if (Array.isArray(archived)) {
      for (const a of archived) {
        if (!a.archiveTime) continue;
        const days = (now - new Date(a.archiveTime).getTime()) / (1000 * 60 * 60 * 24);
        if (days > 7) {
          await fetch(`${API_BASE}/api/archive?id=${encodeURIComponent(a.id)}`, { method: 'DELETE', signal: AbortSignal.timeout(8000) });
        }
      }
    }
  } catch (e) {
    log('  清理归档失败:', e.message);
  }

  return archiveIds;
}

// ---------- Git ----------

function runGit(args) {
  const cmd = `git -C "${ROOT}" ${args}`;
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
  } catch (e) {
    throw new Error(`git ${args} 失败: ${e.message}\n${e.stderr || ''}`);
  }
}

function commitAndPush(count, date) {
  runGit('add index.html');
  runGit(`commit -m "自动同步: 新增 ${count} 条招标信息 (${date})"`);
  try {
    runGit('stash');
  } catch {}
  try {
    runGit('pull origin main --rebase --allow-unrelated-histories');
  } catch {}
  try {
    const conflicts = execSync(`git -C "${ROOT}" diff --name-only --diff-filter=U`, { encoding: 'utf-8' }).trim();
    if (conflicts.includes('index.html')) {
      runGit('checkout --ours index.html && git add index.html && git rebase --continue');
    }
  } catch {}
  try {
    runGit('stash pop');
  } catch {}
  runGit('push origin main');
}

// ---------- 主流程 ----------

async function main() {
  const dateStr = new Date().toISOString().split('T')[0];
  log(`== 招标信息同步开始 (${dateStr}) ==`);

  const keywords = await fetchKeywords();
  if (!keywords.length) {
    log('没有关键词，终止。');
    process.exit(1);
  }
  log(`关键词: ${keywords.join(', ')}`);

  const html = readFile(HTML_PATH);
  if (!html) {
    log('index.html 不存在');
    process.exit(1);
  }

  const existingTenders = loadTendersFromHtml(html);
  const dedupKeySet = new Set(
    existingTenders.map((t) => `${normalizeName(t.name)}|${t.publish}`)
  );
  const maxId = existingTenders.reduce((max, t) => {
    const n = typeof t.id === 'number' ? t.id : parseInt(t.id, 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);

  const candidates = await loadCandidates(keywords);
  log(`候选结果: ${candidates.length} 条`);

  const newTenders = [];
  for (const c of candidates) {
    if (!c.url) continue;
    const pageHtml = await fetchPageText(c.url);
    if (!pageHtml) continue;
    const info = extractFromPage(pageHtml, c.url, c.keyword || c.category || '', c.title);
    if (!info.name) continue;
    if (isExcluded(info.name + ' ' + (c.snippet || ''))) continue;

    const key = `${normalizeName(info.name)}|${info.publish}`;
    if (dedupKeySet.has(key)) continue;
    dedupKeySet.add(key);

    info.priority = assignPriority(info, c.keyword);
    newTenders.push(info);
  }

  // 分配 id 并排序
  let nextId = maxId + 1;
  newTenders.forEach((t) => {
    t.id = nextId++;
  });
  newTenders.sort((a, b) => {
    const po = { 高: 0, 中: 1, 低: 2 };
    if (po[a.priority] !== po[b.priority]) return po[a.priority] - po[b.priority];
    return new Date(b.publish) - new Date(a.publish);
  });

  log(`新增招标: ${newTenders.length} 条`);

  // 归档
  const archiveIds = await archiveOldTenders(existingTenders);
  log(`归档已查阅满30天: ${archiveIds.length} 条`);

  const keptTenders = existingTenders.filter((t) => !archiveIds.includes(t.id));

  if (!newTenders.length && !archiveIds.length) {
    log('无新增/归档，跳过文件更新与 Git 提交');
    log(`当前看板总数: ${existingTenders.length}`);
    return;
  }

  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    log('--dry-run 模式：不写入文件，不提交 Git');
    log(`预计看板总数: ${keptTenders.length + newTenders.length}`);
  } else {
    const { total } = saveTenders(html, keptTenders, newTenders);
    log(`当前看板总数: ${total}`);
    try {
      commitAndPush(newTenders.length, dateStr);
      log('Git 推送成功');
    } catch (e) {
      log('Git 推送失败:', e.message);
      process.exit(1);
    }
  }

  log('\n新增项目:');
  for (const t of newTenders) {
    log(`  [${t.priority}] ${t.name} | ${t.platform} | 截止 ${t.deadline}`);
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = {
  loadTendersFromHtml,
  parseTenderBlocks,
  saveTenders,
  formatTender,
  extractFromPage,
  assignPriority,
  isExcluded,
};

