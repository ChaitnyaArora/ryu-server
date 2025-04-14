import express from 'express';
import getMongoClient from '../../db/mongoConn.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();
router.use(express.json());

const validateRequestBody = (req, res, next) => {
	const { pax, diet, order_id } = req.body;
	if (order_id && (pax || diet)) {
		next();
	} else {
		return res.status(400).json({ error: 'Missing required fields in the request body' });
	}
};

const validateCustPrefs = [
	body('diet')
		.optional()
		.isLength({ min: 1, max: 1 })
		.matches(/^[VEN]$/)
		.withMessage('Invalid Diet Selection'),
	body('pax').optional().isInt({ min: 1, max: 15 }).withMessage('Invalid PAX'),
	body('order_id').isUUID(4).withMessage('Invalid Order ID'),
];

router.post('/', validateRequestBody, validateCustPrefs, async (req, res) => {
	try {
		// Check for validation errors
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			req.logger.error('Validation errors:', errors.array()[0]);
			return res.status(400).json({ message: 'Bad Request', errors: errors.array() });
		}

		const { pax, diet, order_id } = req.body;
		const mongoClient = getMongoClient();

		// Prepare the update object based on the presence of pax and diet
		const updateFields = {};
		if (pax !== undefined) {
			updateFields.pax = pax;
		}
		if (diet !== undefined) {
			updateFields.diet = diet;
		}

		//update pax and diet in MongoDB document where order_id matches
		const updateResult = await mongoClient
			.db(process.env.MONGO_DB)
			.collection(process.env.MONGO_COLLECTION)
			.updateOne({ order_id: order_id }, { $set: updateFields });

		if (updateResult.modifiedCount > 0) {
			req.logger.info('Preferences updated in MongoDB');
			return res.status(200).json({ message: 'Customer preferences updated' });
		} else {
			req.logger.error('Order document not found or already updated in MongoDB');
			return res.status(304).json({ error: 'Order not found or already updated' });
		}
	} catch (error) {
		req.logger.error('Error updating Customer preferences: ', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
