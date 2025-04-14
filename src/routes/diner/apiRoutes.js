import express from 'express';
import quickBitesRoute from './quickBitesRoute.js';
import menuRoute from './menuRoute.js';
import tableRoute from './tableRoute.js';
import placeOrderRoute from './placeOrderRoute.js';
import customerInfoRoute from './customerInfoRoute.js';
import customerPreferenceRoute from './customerPreferenceRoute.js';
import updateSubOrderRoute from './updateSubOrderRoute.js';

const router = express.Router();

router.use('/quickbites', quickBitesRoute);
router.use('/menu', menuRoute);
router.use('/table', tableRoute);
router.use('/placeorder', placeOrderRoute);
router.use('/customerinfo', customerInfoRoute);
router.use('/customerpreference', customerPreferenceRoute);
router.use('/updatesuborder', updateSubOrderRoute);

export default router;
