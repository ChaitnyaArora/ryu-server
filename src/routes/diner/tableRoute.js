import express from 'express';
import supabase from '../../db/supaConn.js';
import getMongoClient from '../../db/mongoConn.js';
import { v4 as uuid } from 'uuid';
import predictLandingPage from '../../algo/landingPage.js';
import menuCache from '../../utils/menuCache.js';

const router = express.Router();
router.use(express.json());

router.get('/:table_id', async (req, res) => {
	const tableId = req.params.table_id;
	const mongoClient = getMongoClient();

	try {
		// find table_number
		const { data: tableNumber, tableError } = await supabase
			.from(process.env.SUPABASE_TABLES)
			.select('table_number')
			.eq('table_id', tableId);

		if (tableError) {
			req.logger.error('Error fetching Table data: ', tableError);
			return res.status(500).json({ error: 'Internal server error' });
		}

		// find order_id
		const { data: orderId, error: orderError } = await supabase
			.from(process.env.SUPABASE_ORDERS)
			.select('order_id')
			.eq('order_completed', false)
			.eq('table_id', tableId);
		if (orderError) {
			req.logger.error('Error fetching Order data: ', orderError);
			return res.status(500).json({ error: 'Internal server error' });
		}

		const menu = await menuCache();
		const lpCombos = await predictLandingPage(menu);

		//check if order is fresh or ongoing
		if (orderId.length === 0) {
			// (1) Fresh order
			// create a fresh order doc in mongodb
			const newOrderId = uuid();
			const response = {
				table_id: tableId,
				table_number: tableNumber[0].table_number,
				fresh_order: true,
				order_id: newOrderId,
				lp_combos: lpCombos,
			};

			const insertResult = await mongoClient
				.db(process.env.MONGO_DB)
				.collection(process.env.MONGO_COLLECTION)
				.insertOne({
					order_id: newOrderId,
					table_id: tableId,
					order_info: [],
					pax: 0,
					diet: '',
					lp_combos: lpCombos,
				});
			if (!insertResult.acknowledged) {
				req.logger.error('Error inserting order: ', insertResult);
				return res.status(500).json({ error: 'Internal server error' });
			}

			return res.status(200).json({ response: response });
		} else {
			// (2) Existing order
			// find existing order doc
			const existingOrderInfo = await mongoClient
				.db(process.env.MONGO_DB)
				.collection(process.env.MONGO_COLLECTION)
				.findOne({ order_id: orderId[0].order_id });


			const response = {
				table_id: tableId,
				table_number: tableNumber[0].table_number,
				fresh_order: false,
				order_id: orderId[0].order_id,
				order_info: existingOrderInfo.order_info,
				pax: existingOrderInfo.pax,
				diet: existingOrderInfo.diet,
				lp_combos: existingOrderInfo.lp_combos,
			};

			return res.status(200).json({ response: response });
		}
	} catch (error) {
		req.logger.error('Unexpected error fetching Table data: ', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
