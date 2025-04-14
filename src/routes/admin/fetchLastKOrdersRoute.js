import express from 'express';
import supabase from '../../db/supaConn.js';
import getMongoClient from '../../db/mongoConn.js';

const router = express.Router();
router.use(express.json());

router.get('/:table_id', async (req, res) => {
	const { table_id: tableId } = req.params;
	const mongoClient = getMongoClient();

	req.logger.info('tableId:', tableId);
	// set the value of K
	const K = 5;

	try {
		// fetch the order_ids for the last K completed orders for the given table
		const { data: orders, error } = await supabase
			.from(process.env.SUPABASE_ORDERS)
			.select('order_id')
			.eq('table_id', tableId)
			.eq('order_completed', true)
			.order('order_initiated', { ascending: false })
			.limit(K);

		if (error) {
			req.logger.error('Error fetching orders from Supabase:', error);
			return res.status(500).json({ error: 'Internal server error' });
		}

		if (orders.length === 0) {
			// No orders found for the given table
			req.logger.info('No past orders found for the given table:', tableId);
			return res.status(204).end();
		}

		// fetch mongo docs for all the orders fetched from supabase
		const mongoResult = await mongoClient
			.db(process.env.MONGO_DB)
			.collection(process.env.MONGO_COLLECTION)
			.find({ order_id: { $in: orders.map((order) => order.order_id) } })
			.toArray();

		return res.status(200).json({ past_orders: mongoResult });
	} catch (err) {
		req.logger.error(`Error fetching orders for table ${tableId}:`, err);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
