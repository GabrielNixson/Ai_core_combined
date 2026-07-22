import { Router } from 'express';
import { RetrievalController } from '../controllers/retrieval.controller';

const router = Router();
const controller = new RetrievalController();

router.post('/search', controller.search);
router.post('/query', controller.query);
router.get('/config', controller.getConfig);
router.post('/test', controller.test);

export default router;
