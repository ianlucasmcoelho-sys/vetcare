import express from 'express';
import { getDashboardStats, getHomeOverview, getClinicalDashboard } from '../controllers/dashboardController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/stats', getDashboardStats);
router.get('/home', getHomeOverview);
router.get('/clinical', getClinicalDashboard);

export default router;
