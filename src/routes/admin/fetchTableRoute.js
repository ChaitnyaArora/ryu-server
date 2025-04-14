import express from 'express';
import supabase from '../../db/supaConn.js';
import getMongoClient from '../../db/mongoConn.js';

const router = express.Router();
router.use(express.json());

router.get('/:tableId', async (req, res) => {
	const { tableId } = req.params;
	try {
		// fetch order data for the selected table (where order is ongoing)
		const { data: orderExists, error: getOrderError } = await supabase
			.from(process.env.SUPABASE_ORDERS)
			.select()
			.eq('table_id', tableId)
			.eq('order_completed', false);
		if (getOrderError) {
			req.logger.error('Error fetching table data: ', getOrderError);
			return res.status(500).json({ error: 'Internal server error' });
		}
		if (orderExists.length === 0) {
			// No ongoing order on the table
			return res.status(204).end();
		}
		const orderId = orderExists[0].order_id;

		// fetch order details from MongoDB
		const mongoClient = getMongoClient();
		const mongoResponse = await mongoClient
			.db(process.env.MONGO_DB)
			.collection(process.env.MONGO_COLLECTION)
			.findOne({ order_id: orderId });

		const response = {
			customer_name: mongoResponse.customer_name,
			order_id: mongoResponse.order_id,
			order_info: mongoResponse.order_info,
			pax: mongoResponse.pax,
			diet: mongoResponse.diet,
		};

		return res.status(200).json({ response: response });
	} catch (error) {
		req.logger.error('Error fetching table data: ', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
