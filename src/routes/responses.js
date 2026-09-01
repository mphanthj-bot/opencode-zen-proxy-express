'use strict';

const express = require('express');
const zen = require('../services/zenClient');

const router = express.Router();

/**
 * POST /v1/responses
 * OpenAI Responses API — dùng cho GPT-5.x, gpt-oss, muse-spark khi OpenCode gọi responses.
 * Pipe SSE verbatim giống chatCompletions, khác path upstream /responses.
 */
router.post('/responses', async (req, res, next) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: { message: 'Request body must be JSON.', type: 'invalid_request_error' } });
    }
    if (!payload.model) {
      return res.status(400).json({ error: { message: 'model required', type: 'invalid_request_error', param: 'model' } });
    }
    // Responses API dùng `input` thay vì `messages` — không validate messages ở đây
    const result = await zen.forwardResponses(payload);
    if (result.stream) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      const upstream = result.response;
      upstream.pipe(res);
      upstream.on('error', (err) => {
        if (!res.headersSent) next(err);
        else res.end();
      });
      req.on('close', () => upstream.destroy());
      return;
    }
    res.status(result.statusCode).json(result.data);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: { message: err.message, type: err.type || 'api_error', code: err.code || null } });
  }
});

module.exports = router;
