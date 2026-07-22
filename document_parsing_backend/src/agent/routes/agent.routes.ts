import { Router } from 'express';
import { AgentController } from '../controllers/agent.controller';

const router = Router();
const controller = new AgentController();

router.post('/chat', controller.chat);
router.post('/query', controller.query);
router.post('/reset', controller.reset);
router.get('/state/:conversationId', controller.getState);

export default router;
