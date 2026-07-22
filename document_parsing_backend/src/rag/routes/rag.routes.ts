import { Router } from 'express';
import { RAGController } from '../controllers/rag.controller';

const router = Router();
const controller = new RAGController();

router.post('/query', controller.query);
router.post('/ask', controller.ask);
router.post('/test', controller.test);
router.get('/config', controller.getConfig);

export default router;
