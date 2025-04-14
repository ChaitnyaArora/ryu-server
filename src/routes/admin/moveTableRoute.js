import express from 'express';
import supabase from '../../db/supaConn.js';
import getMongoClient from '../../db/mongoConn.js';
import initializeAbly from '../../db/ablyConn.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();
router.use(express.json());

const validateMoveTable = [
	body('order_id').notEmpty().isUUID(4).withMessage('Invalid Order ID'),
	body('new_table_id').notEmpty().isUUID(4).withMessage('Invalid Table ID'),
];

router.put('/', validateMoveTable, async (req, res) => {
	// Check for validation errors
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		req.logger.error('Validation errors:', errors.array()[0]);
		return res.status(400).json({ message: 'Bad Request', errors: errors.array() });
	}

	const { order_id: orderId, new_table_id: newTableId } = req.body;
	const mongoClient = getMongoClient();
	const ably = initializeAbly();
	const channel = ably.channels.get('move_table');

	// check if order_id is valid/ongoing
	const { data: order, error } = await supabase
		.from(process.env.SUPABASE_ORDERS)
		.select('order_id')
		.eq('order_id', orderId)
		.eq('order_completed', false);

	if (error) {
		req.logger.error('Error fetching order from Supabase:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}

	if (!order.length) {
		return res.status(404).json({ error: 'Order not found or already completed' });
	}

	// check if table is free/available
	const { data: table, error2 } = await supabase
		.from(process.env.SUPABASE_ORDERS)
		.select('table_id')
		.eq('table_id', newTableId)
		.eq('order_completed', false);

	if (error2) {
		req.logger.error('Error fetching table from Supabase:', error2);
		return res.status(500).json({ error: 'Internal server error' });
	}

	if (table.length) {
		return res.status(400).json({ error: 'Table already occupied' });
	}

	// update record in supabase
	const { error3 } = await supabase
		.from(process.env.SUPABASE_ORDERS)
		.update({ table_id: newTableId })
		.eq('order_id', orderId);

	if (error3) {
		req.logger.error('Error updating table in Supabase:', error3);
		return res.status(500).json({ error: 'Internal server error' });
	}

	// update record in mongoDB
	const mongoResult = await mongoClient
		.db(process.env.MONGO_DB)
		.collection(process.env.MONGO_COLLECTION)
		.updateOne({ order_id: orderId }, { $set: { table_id: newTableId } });

	// publish into ably the updated table_id for the given order_id
	await channel.publish(orderId, newTableId);

	req.logger.info('Order moved to new table:', mongoResult.modifiedCount);
	return res.status(200).json({ message: 'Order moved to new table' });
});

export default router;
