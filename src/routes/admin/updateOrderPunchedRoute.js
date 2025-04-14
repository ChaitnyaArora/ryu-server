import express from 'express';
import getMongoClient from '../../db/mongoConn.js';
import initializeAbly from '../../db/ablyConn.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();
router.use(express.json());

const validateOrderPunched = [
	body('order_id').notEmpty().isUUID(4).withMessage('Invalid Order ID'),
	body('table_id').notEmpty().isUUID(4).withMessage('Invalid Table ID'),
	body('sub_order_id').isInt({ min: 1, max: 30 }).withMessage('Invalid Sub Order ID'),
];

router.patch('/', validateOrderPunched, async (req, res) => {
	// Check for validation errors
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		req.logger.error('Validation errors:', errors.array()[0]);
		return res.status(400).json({ message: 'Bad Request', errors: errors.array() });
	}

	const { table_id: tableId, order_id: orderId, sub_order_id: subOrderId } = req.body;
	const parsedSubOrderId = parseInt(subOrderId);
	const mongoClient = getMongoClient();
	const ably = initializeAbly();
	const channel = ably.channels.get('punched_sub_order');

	try {
		// Punch the order in MongoDB
		const mongoResult = await mongoClient
			.db(process.env.MONGO_DB)
			.collection(process.env.MONGO_COLLECTION)
			.updateOne(
				{
					order_id: orderId,
					table_id: tableId,
					order_info: { $elemMatch: { sub_order_id: parsedSubOrderId } },
				},
				{ $set: { 'order_info.$.is_punched': true } }
			);

		if (mongoResult.modifiedCount > 0) {
			req.logger.info('Order punched in MongoDB: ', mongoResult.modifiedCount);
			await channel.publish(
				orderId,
				JSON.stringify({ order_id: orderId, sub_order_id: parsedSubOrderId })
			);
			return res.status(200).json({ message: 'Order punched' });
		} else {
			req.logger.error('Order not found in MongoDB');
			return res.status(404).json({ error: 'Order not found or already punched' });
		}
	} catch (error) {
		req.logger.error('Unexpected error punching order:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
