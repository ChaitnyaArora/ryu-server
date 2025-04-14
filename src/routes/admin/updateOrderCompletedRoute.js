import express from 'express';
import supabase from '../../db/supaConn.js';
import initializeAbly from '../../db/ablyConn.js';
import getMongoClient from '../../db/mongoConn.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();
router.use(express.json());

const validateOrderCompleted = [
	body('order_id').notEmpty().isUUID(4).withMessage('Invalid Order ID'),
	body('table_id').notEmpty().isUUID(4).withMessage('Invalid Table ID'),
];

router.patch('/', validateOrderCompleted, async (req, res) => {
	// Check for validation errors
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		req.logger.error('Validation errors:', errors.array()[0]);
		return res.status(400).json({ message: 'Bad Request', errors: errors.array() });
	}

	const { order_id: orderId, table_id: tableId } = req.body;
	const mongoClient = getMongoClient();
	const ably = initializeAbly();
	const channel = ably.channels.get('order_completed');

	try {
		// Fetch order information from Supabase
		const { data, error } = await supabase
			.from(process.env.SUPABASE_ORDERS)
			.select('order_id, order_completed')
			.eq('order_id', orderId)
			.eq('table_id', tableId)
			.eq('order_completed', false);

		if (error) {
			req.logger.error('Error fetching order: ', error);
			return res.status(500).json({ error: 'Internal server error' });
		}
		// Check if the order exists in Supabase
		if (data.length === 0) {
			req.logger.info('Order not found or already completed in Supabase');
			await channel.publish(orderId, 'Order not found');
			return res.status(404).json({ error: 'Order not found or already completed' });
		}

		// Check if any sub-order in MongoDB has is_punched set to false
		const mongoOrderInfo = await mongoClient
			.db(process.env.MONGO_DB)
			.collection(process.env.MONGO_COLLECTION)
			.findOne({ order_id: orderId });

		if (
			mongoOrderInfo &&
			mongoOrderInfo.order_info.some((subOrder) => !subOrder.is_punched)
		) {
			req.logger.error('One or more sub-orders are not punched yet');
			return res
				.status(404)
				.json({ error: 'One or more sub-orders are not punched yet' });
		}

		// Update the order in Supabase and mark it as completed
		const { data: orderExists, error: updateError } = await supabase
			.from(process.env.SUPABASE_ORDERS)
			.update({ order_completed: true })
			.eq('order_id', orderId)
			.eq('table_id', tableId)
			.select();

		if (updateError) {
			req.logger.error('Supabase update error: ', updateError);
			return res.status(500).json({ error: 'Internal server error' });
		}
		// Check if the order was updated in Supabase
		if (orderExists.length === 1) {
			req.logger.info('Order completed in Supabase:', orderId);
			await channel.publish(orderId, 'Order Completed');
			return res
				.status(200)
				.json({ message: 'Order completed', order_details: mongoOrderInfo });
		} else {
			return res.status(404).json({ error: 'Order was not updated' });
		}
	} catch (err) {
		req.logger.error('Unexpected error completing order: ', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
