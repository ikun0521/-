#!/usr/bin/env node
/**
 * 定向招标信息同步脚本
 *
 * 用法：
 *   node scripts/sync-targeted-tenders.js
 *   node scripts/sync-targeted-tenders.js --input scripts/search-results.json
 *   node scripts/sync-targeted-tenders.js --search-provider duckduckgo
 *   node scripts/sync-targeted-tenders.js --dry-run
 *
 * 说明：
 * - 读取 COS/本地关键词。
 * - 在指定的一手平台（国铁、中车购、地铁、公共资源交易中心）内搜索与关键词相关的招标公告。
 * - 抓取日期、招标单位，按公告文本判断一手平台；判断不出则保留来源网站。
 * - 去重、分配优先级、写入 index.html、Git 提交推送。
 * - 默认搜索源为 DuckDuckGo（免费），未来可通过 --search-provider agentkey 切换到 AgentKey/Tavily。
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  loadTendersFromHtml,
  saveTenders,
  extractFromPage,
  assignPriority,
  isExcluded,
  normalizeName,
  detectPlatformByText,
  detectPlatform,
  fetchKeywords,
  normalizeDate,
} = require('./sync-tenders');
const { FIRST_HAND_PLATFORMS, SEARCH_GROUPS } = require('./target-platforms');

const ROOT = path.resolve(__dirname, '..');
const HTML_PATH = path.join(ROOT, 'index.html');

const DRY_RUN = process.argv.includes('--dry-run');
const SEARCH_PROVIDER = getArg('--search-provider') || 'duckduckgo';
const INPUT_PATH = getArg('--input');

function log(...args) {
  console.log(...args);
}

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&\w+;/g, ' ').replace(/\s+/g, ' ').trim();
}

// ---------- AgentKey 搜索（需 WorkBuddy 运行时注入）----------

async function searchWithAgentKey(keyword, domains, maxResults = 10) {
  // 在 WorkBuddy 自动化环境中，__AGENTKEY_EXECUTE__ 可能由运行时注入
  const execute = globalThis.__AGENTKEY_EXECUTE__ || global.__AGENTKEY_EXECUTE__;
  if (!execute) {
    throw new Error('AgentKey 执行器未注入。请使用 --search-provider duckduckgo 或在 WorkBuddy 自动化中运行。');
  }
  const res = await execute('Tavily/post_search', {
    query: `${keyword} 招标公告`,
    include_domains: domains,
    max_results: maxResults,
    time_range: 'month',
    include_raw_content: true,
    search_depth: 'basic',
  });
  return (res.results || []).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.raw_content || r.content || '',
    keyword,
    source: 'agentkey',
  }));
}

// ---------- DuckDuckGo 搜索（免费 fallback）----------

async function searchWithDuckDuckGo(keyword, domains, maxResults = 10) {
  const results = [];
  for (const domain of domains) {
    try {
      const query = `site:${domain} ${keyword} 招标`;
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      let m;
      while ((m = re.exec(html)) && results.length < maxResults) {
        const rawHref = m[1];
        const title = stripHtml(m[2]).trim();
        const link = decodeDuckLink(rawHref);
        if (link && title) {
          results.push({ title, url: link, snippet: '', keyword, source: 'duckduckgo' });
        }
      }
    } catch (e) {
      log(`  DuckDuckGo 搜索失败 ${domain}: ${e.message}`);
    }
  }
  return results;
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

async function searchPlatformGroup(keyword, domains, maxResults = 10) {
  if (SEARCH_PROVIDER === 'agentkey') {
    return searchWithAgentKey(keyword, domains, maxResults);
  }
  return searchWithDuckDuckGo(keyword, domains, maxResults);
}

async function searchAllPlatforms(keywords, maxResults = 10) {
  const all = [];
  for (const keyword of keywords) {
    for (const group of SEARCH_GROUPS) {
      log(`[搜索] ${keyword} @ ${group.name}`);
      try {
        const list = await searchPlatformGroup(keyword, group.domains, maxResults);
        log(`  -> ${list.length} 条`);
        all.push(...list);
      } catch (e) {
        log(`  错误: ${e.message}`);
      }
    }
  }
  return all;
}

// ---------- 详情页抓取（DuckDuckGo 结果需要补抓正文）----------

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

async function fetchDetail(url) {
  const html = await fetchPageText(url);
  if (!html) return '';
  return stripHtml(html);
}

// ---------- 一手平台判断（优先按公告文本）----------

function detectFirstHandPlatform(name, text, sourceUrl) {
  const combined = `${name || ''} ${text || ''}`.toLowerCase();
  const rules = [
    { name: '国铁采购平台', kw: ['国铁采购平台', 'cg.95306.cn', '95306'] },
    { name: '中车购2.0平台', kw: ['中车购', 'crrcgo.cc'] },
    { name: '中车集团官网', kw: ['中车太原', 'crrcgc.cc'] },
    { name: '深圳地铁智能招采管理平台', kw: ['深圳地铁智能招采', '深铁招采', 'cg.shenzhenmc.com'] },
    { name: '上海地铁采购平台', kw: ['上海地铁采购', 'eps.shmetro.com'] },
    { name: '无锡地铁采购平台', kw: ['无锡地铁', 'scm.wxmetro.net'] },
    { name: '北京市公共资源交易中心', kw: ['北京公共资源交易', 'ggzyfw.beijing.gov.cn'] },
    { name: '青岛市公共资源交易电子服务系统', kw: ['青岛公共资源交易', 'ggzyjy.shandong.gov.cn'] },
    { name: '新疆公共资源交易网', kw: ['新疆公共资源交易', 'ggzy.xinjiang.gov.cn'] },
    { name: '嘉兴市公共资源交易网', kw: ['嘉兴公共资源交易', 'jxszwsjb.jiaxing.gov.cn'] },
    { name: '四川省公共资源交易信息网', kw: ['四川公共资源交易', 'ggzyjy.sc.gov.cn'] },
    { name: '广东省公共资源交易中心', kw: ['广东公共资源交易', 'ggzyjy.gd.gov.cn', '广州公共资源交易'] },
    { name: '中国招标投标公共服务平台', kw: ['中国招标投标公共服务', 'chinabidding.cn', 'cebpubservice.com'] },
    { name: '天津轨道交通集团', kw: ['天津轨道交通', 'tjgdjt.com'] },
    { name: '安徽江淮汽车集团', kw: ['江淮汽车', 'jac.com.cn'] },
    { name: '中国铁路物资采购平台', kw: ['中国铁路物资', 'zgdlyzc.com'] },
  ];
  for (const r of rules) {
    if (r.kw.some((k) => combined.includes(k.toLowerCase()))) return r.name;
  }
  // 文本判断不出，按来源域名兜底
  return detectPlatform(sourceUrl);
}

// ---------- 发布日期提取 ----------

function extractPublishDate(text, url) {
  if (url) {
    const m1 = url.match(/\/(\d{4})(\d{2})(\d{2})\//);
    if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;
  }
  const m2 = text.match(/(?:发布|公告|采购)时间[：:]?\s*(\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?)/i);
  if (m2) return normalizeDate(m2[1]);
  const all = [...text.matchAll(/\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?/g)]
    .map((m) => normalizeDate(m[0]))
    .filter(Boolean)
    .filter(isReasonableDateStr);
  return all[0] || new Date().toISOString().split('T')[0];
}

function isReasonableDateStr(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const year = d.getFullYear();
  return year >= 2024 && year <= 2027;
}

// ---------- 主流程 ----------

async function main() {
  const keywords = await fetchKeywords();
  if (!keywords.length) {
    console.error('无关键词');
    process.exit(1);
  }
  log(`关键词: ${keywords.join(', ')}`);

  let candidates;
  if (INPUT_PATH) {
    log(`从 ${INPUT_PATH} 加载候选...`);
    candidates = JSON.parse(fs.readFileSync(path.resolve(INPUT_PATH), 'utf-8'));
  } else {
    log(`搜索源: ${SEARCH_PROVIDER}`);
    candidates = await searchAllPlatforms(keywords, 10);
  }

  log(`候选总数: ${candidates.length}`);

  const html = fs.readFileSync(HTML_PATH, 'utf-8');
  const existing = loadTendersFromHtml(html);
  const dedupSet = new Set(existing.map((t) => `${normalizeName(t.name)}|${t.publish}`));
  let maxId = existing.reduce((m, t) => Math.max(m, Number(t.id) || 0), 0);

  const newTenders = [];

  for (const c of candidates) {
    if (!c.url || !c.title) continue;
    const fullText = `${c.title} ${c.snippet || ''}`;
    if (isExcluded(fullText)) continue;

    let snippet = c.snippet || '';
    if (SEARCH_PROVIDER === 'duckduckgo' && snippet.length < 800) {
      snippet = await fetchDetail(c.url);
    }

    const info = await extractFromPage('', c.url, c.keyword, c.title, snippet);
    if (!info || !info.name) continue;

    // 如果候选提供了明确的发布日期或截止日期，优先使用
    if (c.publish && /^\d{4}-\d{2}-\d{2}/.test(c.publish)) {
      info.publish = c.publish;
    }
    if (c.deadline && /^\d{4}-\d{2}-\d{2}/.test(c.deadline)) {
      info.deadline = c.deadline;
    }

    // 修正平台：优先按公告文本判断一手平台
    info.platform = detectFirstHandPlatform(info.name, `${c.title} ${snippet}`, c.url) || info.platform;

    const key = `${normalizeName(info.name)}|${info.publish}`;
    if (dedupSet.has(key)) continue;
    dedupSet.add(key);

    info.priority = assignPriority(info, c.keyword);
    info.id = ++maxId;
    newTenders.push(info);

    log(`  + ${info.name} | ${info.platform} | ${info.deadline} | ${info.priority}`);
  }

  newTenders.sort((a, b) => {
    const po = { 高: 0, 中: 1, 低: 2 };
    if (po[a.priority] !== po[b.priority]) return po[a.priority] - po[b.priority];
    return new Date(b.publish) - new Date(a.publish);
  });

  if (!newTenders.length) {
    log('无新增招标');
    return;
  }

  log(`新增 ${newTenders.length} 条`);

  if (DRY_RUN) {
    log('dry-run 模式，不写入文件');
    console.log(JSON.stringify(newTenders, null, 2));
    return;
  }

  saveTenders(html, existing, newTenders);
  commitAndPush(newTenders.length);
}

function commitAndPush(count) {
  try {
    const date = new Date().toISOString().split('T')[0];
    execSync('git add index.html scripts/sync-targeted-tenders.js scripts/target-platforms.js scripts/sync-tenders.js', {
      cwd: ROOT,
      stdio: 'inherit',
    });
    execSync(`git commit -m "自动同步: 定向新增 ${count} 条招标信息 (${date})"`, { cwd: ROOT, stdio: 'inherit' });
    execSync('git push origin main', { cwd: ROOT, stdio: 'inherit' });
    log('已推送');
  } catch (e) {
    log('Git 提交失败:', e.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
