// Cloudflare Workers 兼容版
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS 预检
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // ========== GET /api/statuses ==========
    if (path === '/api/statuses' && method === 'GET') {
      try {
        const data = await env.TENDER_DB.get('statuses', 'json');
        return new Response(JSON.stringify(data || {}), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // ========== POST /api/statuses ==========
    if (path === '/api/statuses' && method === 'POST') {
      try {
        const newStatuses = await request.json();
        const current = await env.TENDER_DB.get('statuses', 'json') || {};
        const updated = { ...current, ...newStatuses };
        await env.TENDER_DB.put('statuses', JSON.stringify(updated));
        return new Response(JSON.stringify(updated), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // ========== GET /api/keywords ==========
    if (path === '/api/keywords' && method === 'GET') {
      try {
        const keywords = await env.TENDER_DB.get('keywords', 'json');
        return new Response(JSON.stringify(keywords || []), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // ========== POST /api/keywords ==========
    if (path === '/api/keywords' && method === 'POST') {
      try {
        const newKeywords = await request.json();
        if (!Array.isArray(newKeywords)) {
          return new Response(JSON.stringify({ error: '关键词必须是数组' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        await env.TENDER_DB.put('keywords', JSON.stringify(newKeywords));
        return new Response(JSON.stringify(newKeywords), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // ========== GET / ==========
    if (path === '/') {
      return new Response('🚀 招标看板后端已运行！', {
        headers: { 'Content-Type': 'text/plain', ...corsHeaders }
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};