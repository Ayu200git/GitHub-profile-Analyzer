import { Router } from 'express';
import * as profileController from '../controllers/profileController';

const router = Router();

// Define API Endpoints
router.post('/analyze', profileController.analyzeProfile);
router.get('/', profileController.getAllProfiles);
router.get('/:username', profileController.getProfileByUsername);
router.put('/:username/reanalyze', profileController.reanalyzeProfile);
router.delete('/:username', profileController.deleteProfile);

export default router;
