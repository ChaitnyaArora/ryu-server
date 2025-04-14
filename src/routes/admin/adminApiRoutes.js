import express from 'express';
import createTableRoute from './createTableRoute.js';
// import deleteTableRoute from './deleteTableRoute.js';
import toggleAvailability from './toggleAvailability.js';
import toggleQuickBite from './toggleQuickBite.js';
// import deleteRoute from './deleteRoute.js';
// import toggleAvailability2 from './toggleAvailability2.js';
import fetchAllTables from './fetchAllTablesRoute.js';
import fetchTable from './fetchTableRoute.js';
import updateOrderPunchedRoute from './updateOrderPunchedRoute.js';
import updateOrderCompletedRoute from './updateOrderCompletedRoute.js';
import getMaxDiscount from './getMaxDiscountRoute.js';
import setMaxDiscount from './setMaxDiscountRoute.js';
import fetchLastKOrders from './fetchLastKOrdersRoute.js';
import moveTable from './moveTableRoute.js';
import fetchalltablesummery from './fetchalltablesummery.js';

// import testRoute from './testRoute.js';

const router = express.Router();

// router.use('/delete', deleteRoute);
// router.use('/test', testRoute);
router.use('/createtable', createTableRoute);
// router.use('/deletetable', deleteTableRoute);
router.use('/toggleavailability', toggleAvailability);
// router.use('/toggleavailability2', toggleAvailability2);
router.use('/togglequickbite', toggleQuickBite);
router.use('/getmaxdiscount', getMaxDiscount);
router.use('/setmaxdiscount', setMaxDiscount);
router.use('/fetchalltables', fetchAllTables);
router.use('/fetchtable', fetchTable);
router.use('/orderpunched', updateOrderPunchedRoute);
router.use('/ordercompleted', updateOrderCompletedRoute);
router.use('/orders', fetchLastKOrders);
router.use('/movetable', moveTable);
router.use('/fetchalltablesummery', fetchalltablesummery); 

export default router;
