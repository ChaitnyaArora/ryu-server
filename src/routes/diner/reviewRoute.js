import express from 'express';
import { body } from 'express-validator';
import getMongoClient from '../../db/mongoConn.js';
import supabase from '../../db/supaConn.js';

const router = express.Router();
router.use(express.json());

const validateRequestBody = (req, res, next) => {
	const { order_id, review } = req.body;

	// Check if any of the required fields are missing
	if (!order_id || !review) {
		return res.status(400).json({ error: 'Missing required fields in the request body' });
	}
	// If all required fields are present, call the next middleware or route handler
	next();
};

const validatePlaceOrder = [
	body('order_id').isUUID(4).withMessage('Invalid Order ID'),
	body('review').isArray().withMessage('Invalid review Passed'),
];

router.put('/', validateRequestBody, validatePlaceOrder, async (req, res) => {
	const { order_id, review } = req.body;

	const mongoClient = getMongoClient();
	try {
		// check if order_id already exists in Supabase & capture order_id
		const { data: orderExists, error } = await supabase
			.from(process.env.SUPABASE_ORDERS)
			.select('order_id , order_completed')
			.eq('order_id', order_id);
		if (error) {
			req.logger.error('Error checking order existence:', error);
			return res.status(500).json({ error: 'Internal server error' });
		}
        if (orderExists.length > 0) {
			// (2) if order exists and not completed, append to existing MongoDB document
			try {

				// push new suborder to MongoDB document
				const mongoResult = await mongoClient
					.db(process.env.MONGO_DB)
					.collection(process.env.MONGO_COLLECTION)
					.updateOne(
						{ order_id: order_id },
						{
							$set: {
								review: review,
							},
						}
					);

				if (mongoResult.modifiedCount > 0) {
					req.logger.info('review updated in MongoDB');
					return res.status(200).json({ message: 'Order updated' });
				} else {
					req.logger.error('Error updating order: ', mongoResult);
					return res.status(404).json({ error: 'Error updating order' });
				}
			} catch (error) {
				req.logger.error('Error updating order:', error);
				return res.status(500).json({ error: 'Internal server error' });
			}
		}
	} catch (error) {
		req.logger.error('Unexpected error placing sub order: ', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
