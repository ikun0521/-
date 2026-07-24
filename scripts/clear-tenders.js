const fs = require('fs');
const path = require('path');
const { loadTendersFromHtml, saveTenders } = require('./sync-tenders.js');

const ROOT = path.resolve(__dirname, '..');
const HTML_PATH = path.join(ROOT, 'index.html');
const BACKUP_PATH = path.join(ROOT, 'index_backup.html');

const html = fs.readFileSync(HTML_PATH, 'utf-8');

// 备份原文件
fs.copyFileSync(HTML_PATH, BACKUP_PATH);

// 清空 tenders
const { total, archiveIds } = saveTenders(html, [], []);

console.log(`已清空 tenders 数组，当前总数: ${total}`);
console.log(`原文件已备份到: ${BACKUP_PATH}`);
