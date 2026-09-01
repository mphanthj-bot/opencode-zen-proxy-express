'use strict';

const express = require('express');
const cors = require('cors');

const { authMiddleware } = require('./middleware/auth');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health');
const modelsRoutes = require('./routes/models');
const chatRoutes = require('./routes/chatCompletions');
const responsesRoutes = require('./routes/responses');
const messagesRoutes = require('./routes/messages');
const geminiRoutes = require('./routes/gemini');

/**
 * Create and configure the Express application.
 */
function createApp() {
  const app = express();

  // ----- Global Middleware -----
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // ----- Open Routes (no auth required) -----
  app.use('/', healthRoutes);

  // ----- Authenticated Routes -----
  // Apply auth middleware to all /v1/* routes
  app.use('/v1', authMiddleware);

  // Model listing endpoints (require auth per Zen API convention)
  app.use('/v1', modelsRoutes);

  // Chat completions endpoint
  app.use('/v1', chatRoutes);
  // Responses API (OpenAI GPT) — cho OpenCode mặc định
  app.use('/v1', responsesRoutes);
  // Anthropic messages (Claude)
  app.use('/v1', messagesRoutes);
  // Gemini passthrough — mount sau chatRoutes để tránh conflict GET /v1/models
  // Chỉ POST /v1/models/:modelId mới đi vào gemini, GET vẫn do modelsRoutes xử lý
  app.use('/v1', geminiRoutes);

  // ----- Error Handling -----
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
