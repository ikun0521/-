const jsonServer = require('json-server');
const cors = require('cors');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const port = process.env.PORT || 3000;

// 启用 CORS（允许前端跨域请求）
server.use(cors());

// 使用默认中间件（日志、静态文件等）
server.use(middlewares);

// 自定义路由：获取所有状态
server.get('/api/statuses', (req, res) => {
  const db = router.db.get('statuses').value();
  res.json(db);
});

// 自定义路由：更新状态（合并更新）
server.post('/api/statuses', (req, res) => {
  const newStatuses = req.body;
  const current = router.db.get('statuses').value();
  const updated = { ...current, ...newStatuses };
  router.db.set('statuses', updated).write();
  res.json(updated);
});

// 自定义路由：获取关键词列表
server.get('/api/keywords', (req, res) => {
  const keywords = router.db.get('keywords').value();
  res.json(keywords);
});

// 自定义路由：更新关键词列表
server.post('/api/keywords', (req, res) => {
  const newKeywords = req.body;
  if (!Array.isArray(newKeywords)) {
    return res.status(400).json({ error: '关键词必须是数组' });
  }
  router.db.set('keywords', newKeywords).write();
  res.json(newKeywords);
});

// 使用 json-server 默认路由（用于直接操作 db.json）
server.use(router);

server.listen(port, () => {
  console.log(`🚀 后端服务已启动，端口：${port}`);
  console.log(`📊 状态 API: GET/POST /api/statuses`);
  console.log(`🔑 关键词 API: GET/POST /api/keywords`);
});