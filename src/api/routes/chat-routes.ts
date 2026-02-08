/**
 * Chat Routes - POST /api/chat
 *
 * Handles conversation interactions with the digital employee.
 * Accepts user messages, parses intent, creates execution plans,
 * and returns structured responses.
 *
 * Requirements: 1.1
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { createConversationEngine, addMessageToContext } from '../../services/conversation-engine.js';
import { createTaskOrchestrator } from '../../services/task-orchestrator.js';

const router = Router();
const conversationEngine = createConversationEngine();
const taskOrchestrator = createTaskOrchestrator();

/**
 * POST /api/chat
 *
 * Accept a user message and session ID, parse intent,
 * create and execute a plan, return the response.
 *
 * Body: { message: string, sessionId: string }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: '缺少必填字段: message' });
      return;
    }

    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ error: '缺少必填字段: sessionId' });
      return;
    }

    // 1. Get or create conversation context
    const context = await conversationEngine.getContext(sessionId);

    // 2. Add user message to context
    addMessageToContext(context, 'user', message);

    // 3. Parse intent
    const intent = await conversationEngine.parseIntent(message);

    // 4. If confidence is too low, return clarification
    if (intent.confidence < 0.4) {
      context.currentIntent = intent;
      const clarification = await conversationEngine.generateClarification(context);
      addMessageToContext(context, 'assistant', clarification);

      res.json({
        type: 'clarification',
        message: clarification,
        intent,
        sessionId,
      });
      return;
    }

    // 5. Create execution plan
    context.currentIntent = intent;
    const plan = await taskOrchestrator.createPlan(intent);

    // 6. Execute plan
    await taskOrchestrator.executePlan(plan.id);

    // 7. Build response
    const responseMessage = `已完成任务: ${intent.taskType}，平台: ${intent.platform}，赛道: ${intent.category || '通用'}`;
    addMessageToContext(context, 'assistant', responseMessage);

    res.json({
      type: 'response',
      message: responseMessage,
      intent,
      plan: {
        id: plan.id,
        status: plan.status,
        steps: plan.steps.map((s) => ({
          id: s.id,
          type: s.type,
          status: s.status,
        })),
      },
      sessionId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: `处理消息失败: ${errorMessage}` });
  }
});

export default router;
