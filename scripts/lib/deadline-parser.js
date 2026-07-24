/**
 * 招标公告截止日期提取与规范化模块
 *
 * 支持从公告正文中按可信度优先级提取投标/开标/响应/报名/采购文件获取截止时间，
 * 也支持对已有自由文本 deadline 进行清理和规范化。
 */

const DATE_TIME_CAPTURE =
  '\\d{4}[-/.年]\\d{1,2}[-/.月]\\d{1,2}(?:日)?(?:\\s*\\d{1,2}:\\d{2}(?::\\d{2})?)?';

// 按可信度排序的提取规则
const RULES = [
  {
    name: 'bid',
    label: '投标/开标截止',
    patterns: [
      /投标(?:文件)?(?:递交|截止|提交|开启)时间[：:]?\s*(\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?(?:\s*\d{1,2}:\d{2}(?::\d{2})?)?)/gi,
      /开标时间[：:]?\s*(\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?(?:\s*\d{1,2}:\d{2}(?::\d{2})?)?)/gi,
      /响应(?:文件)?(?:递交|截止|提交)时间[：:]?\s*(\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?(?:\s*\d{1,2}:\d{2}(?::\d{2})?)?)/gi,
    ],
  },
  {
    name: 'registration',
    label: '采购文件获取/报名截止',
    patterns: [
      /(?:采购文件|招标文件|报名|登记).*?(?:获取|发售|截止|结束|下载)(?:时间)?[：:]?\s*[^\d]*?(?:\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?\s*\d{1,2}:\d{2}(?::\d{2})?\s*[至到~]\s*)?(\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?(?:\s*\d{1,2}:\d{2}(?::\d{2})?)?)/gi,
    ],
  },
];

const FALLBACK_DATE_RE = new RegExp(
  `\\b(${DATE_TIME_CAPTURE})\\b`,
  'g'
);

function pad(n) {
  return n.toString().padStart(2, '0');
}

function formatDateLocal(date, includeTime) {
  if (!date || isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  if (includeTime && (date.getHours() || date.getMinutes())) {
    const h = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${y}-${m}-${d} ${h}:${min}`;
  }
  return `${y}-${m}-${d}`;
}

function parseDateString(str) {
  if (!str) return null;
  const cleaned = str
    .replace(/[\s]+/g, ' ')
    .trim()
    .replace(/日(?=\s|$)/g, '');
  const m = cleaned.match(
    /^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})(?:\s*(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1;
  const day = parseInt(m[3], 10);
  const hour = m[4] ? parseInt(m[4], 10) : 0;
  const minute = m[5] ? parseInt(m[5], 10) : 0;
  const date = new Date(year, month, day, hour, minute);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function normalizeMatchedDate(str) {
  const date = parseDateString(str);
  if (!date) return null;
  const hasTime = /\d{1,2}:\d{2}/.test(str);
  return formatDateLocal(date, hasTime);
}

function cleanDeadlineText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[（(].*?[）)]/g, ' ')
    .replace(/\b待确认\b|\b见招标文件\b|\b已直采\b/g, ' ')
    .replace(/[\s]+/g, ' ')
    .trim();
}

function extractByRules(text) {
  for (const rule of RULES) {
    for (const re of rule.patterns) {
      const matches = [...text.matchAll(re)];
      for (const match of matches) {
        const normalized = normalizeMatchedDate(match[1]);
        if (normalized) {
          return { value: normalized, source: rule.name };
        }
      }
    }
  }
  return null;
}

function extractFallback(text, publishDate) {
  const all = [...text.matchAll(FALLBACK_DATE_RE)]
    .map((m) => normalizeMatchedDate(m[1]))
    .filter(Boolean);
  if (!all.length) return null;
  const publishTs = publishDate ? new Date(publishDate).getTime() : 0;
  const candidates = all
    .map((s) => ({ str: s, date: parseDateString(s) }))
    .filter((item) => item.date && !isNaN(item.date.getTime()))
    .filter((item) => item.date.getTime() >= publishTs - 86400000) // 允许比发布日期早 1 天（跨时区/日期误差）
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  if (!candidates.length) return null;
  return {
    value: candidates[0].str,
    source: 'fallback',
  };
}

/**
 * 从公告正文中提取截止日期
 * @param {string} text - 公告正文
 * @param {string|Date|null} publishDate - 发布时间，用于兜底过滤
 * @returns {{value: string|null, source: string|null}}
 */
function parseDeadline(text, publishDate) {
  if (!text || typeof text !== 'string') {
    return { value: null, source: null };
  }
  const cleaned = cleanDeadlineText(text);
  const byRules = extractByRules(cleaned);
  if (byRules) return byRules;
  return extractFallback(cleaned, publishDate);
}

/**
 * 对已有的 deadline 字符串做规范化（用于历史数据迁移）
 * @param {string} text
 * @returns {string|null}
 */
function normalizeDeadlineText(text) {
  if (!text || typeof text !== 'string') return null;
  const cleaned = cleanDeadlineText(text);
  const byRules = extractByRules(cleaned);
  if (byRules) return byRules.value;
  const fallback = extractFallback(cleaned, null);
  return fallback ? fallback.value : null;
}

/**
 * 判断字符串是否为已规范化的 deadline
 * @param {string} value
 * @returns {boolean}
 */
function isNormalizedDeadline(value) {
  if (!value || typeof value !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/.test(value);
}

module.exports = {
  parseDeadline,
  normalizeDeadlineText,
  isNormalizedDeadline,
  formatDateLocal,
  parseDateString,
};
