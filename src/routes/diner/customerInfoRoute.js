import express from 'express';
import { body, validationResult } from 'express-validator';
import supabase from '../../db/supaConn.js';
import getMongoClient from '../../db/mongoConn.js';

const router = express.Router();
router.use(express.json());

const validateCustomerInfo = [
	body('name')
		.notEmpty()
		.matches(/^[A-Za-z\s]+$/) // checks for a-z A-Z and space
		.isLength({ min: 2, max: 25 })
		.withMessage('Invalid Name'),
	body('phone')
		.notEmpty()
		.isNumeric()
		.isLength({ min: 10, max: 10 })
		.withMessage('Invalid Phone Number'),
	// body('dob')
	// 	.notEmpty()
	// 	.matches(/^(0[1-9]|[12][0-9]|3[01])-[A-Za-z]{3}-\d{4}$/)
	// 	.withMessage('Date of Birth must be in dd-mon-yyyy format'),
	body('order_id').notEmpty().isUUID(4).withMessage('Invalid Order ID'),
];

router.post('/', validateCustomerInfo, async (req, res) => {
	try {
		// Check for validation errors
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			req.logger.error('Validation errors:', errors.array()[0]);
			return res.status(400).json({ message: 'Bad Request', errors: errors.array() });
		}
		// Sanitize user input
		const {
			name,
			phone,
			// dob,
			order_id,
		} = req.body;

		const custData = {
			name,
			phone,
			// dob,
			order_id,
		};

		const { error } = await supabase
			.from(process.env.SUPABASE_CUSTOMERS)
			.insert([custData]);

		if (error) {
			req.logger.error('Error in inserting customer data:', error);
			return res.status(500).json({ error: 'Internal server error' });
		}

		// Adding customer details in the MongoDoc
		const mongoClient = getMongoClient();
		const mongoResponse = await mongoClient
			.db(process.env.MONGO_DB)
			.collection(process.env.MONGO_COLLECTION)
			.updateOne({ order_id: order_id }, { $set: { customer_name: name } });

		if (mongoResponse.modifiedCount > 0) {
			req.logger.info('Customer name updated in MongoDB');
		} else {
			req.logger.error('Order document not found or already updated in MongoDB');
			return res.status(404).json({ error: 'Error updating customer name' });
		}
		req.logger.info('Customer data inserted');
		return res.status(201).json({ message: 'Customer data inserted successfully', name });
	} catch (error) {
		req.logger.error('Unexpected error inserting customer data:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
