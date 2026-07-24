/**
 * 一次性迁移脚本：规范化 index.html 中现有 tenders 的 deadline 字段。
 * 只替换 deadline 值，不改变原文件格式与缩进。
 */

const fs = require('fs');
const path = require('path');
const { normalizeDeadlineText } = require('./lib/deadline-parser');

const ROOT = path.resolve(__dirname, '..');
const HTML_PATH = path.join(ROOT, 'index.html');
const BACKUP_PATH = path.join(ROOT, 'index_backup.html');

function loadTenders(html) {
  const match = html.match(/let tenders = \[[\s\S]*?\n\s*\];/m);
  if (!match) {
    throw new Error('无法定位 tenders 数组');
  }
  const arrText = match[0].replace(/^let tenders = /, '').replace(/;\s*$/, '');
  return new Function('return ' + arrText)();
}

function main() {
  const html = fs.readFileSync(HTML_PATH, 'utf-8');
  const tenders = loadTenders(html);

  let changed = 0;
  let unchanged = 0;
  let failed = 0;
  let idx = 0;

  const newHtml = html.replace(/"deadline":\s*"([^"]*)"/g, (match, value) => {
    const t = tenders[idx++];
    const normalized = normalizeDeadlineText(value);
    if (normalized && normalized !== value) {
      changed++;
      if (t) t.deadline = normalized;
      return `"deadline": "${normalized}"`;
    }
    if (!normalized) {
      failed++;
      if (t) console.log(`  无法解析: id=${t.id}, deadline="${value}"`);
    } else {
      unchanged++;
    }
    return match;
  });

  if (newHtml === html) {
    console.log('没有需要修改的内容。');
    return;
  }

  fs.copyFileSync(HTML_PATH, BACKUP_PATH);
  fs.writeFileSync(HTML_PATH, newHtml, 'utf-8');

  console.log(`\n迁移完成：`);
  console.log(`  总数: ${tenders.length}`);
  console.log(`  成功规范化: ${changed}`);
  console.log(`  无需修改: ${unchanged}`);
  console.log(`  保留原值: ${failed}`);
  console.log(`  已备份: ${BACKUP_PATH}`);
}

main();
