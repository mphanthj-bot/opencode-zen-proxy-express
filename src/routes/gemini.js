'use strict';

const express = require('express');
const zen = require('../services/zenClient');

const router = express.Router();

/**
 * POST /v1/models/:modelId  (Google Gemini passthrough)
 * Zen expose gemini qua /zen/v1/models/gemini-3-flash...
 * Proxy nhận /v1/models/gemini-* để OpenCode cấu hình provider google qua proxy.
 * Cũng hỗ trợ POST /v1/models/gemini-*:streamGenerateContent nếu client Google SDK gửi.
 */
router.post('/models/:modelId(*)', async (req, res, next) => {
  try {
    const modelId = req.params.modelId;
    const result = await zen.forwardGemini(modelId, req.body);
    if (result.stream) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
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
