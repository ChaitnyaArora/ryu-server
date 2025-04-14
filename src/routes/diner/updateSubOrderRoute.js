import express from 'express';
import getMongoClient from '../../db/mongoConn.js';
import initializeAbly from '../../db/ablyConn.js';
import verifyPrices from '../../utils/verifyPrices.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();
router.use(express.json());

const validateRequestBody = (req, res, next) => {
	const { order_id, items } = req.body;

	// Check if any of the required fields are missing
	if (!order_id || !items) {
		return res.status(400).json({ error: 'Missing required fields in the request body' });
	}
	next();
};

const validateUpdateOrder = [
	body('order_id').isUUID(4).withMessage('Invalid Order ID'),
	body('items').isArray().withMessage('Invalid Items Passed'),
];

const getTotalAndDiscount = (items) => {
	let total = 0;
	let discount = 0;
	items.forEach((item) => {
		total += item.price * item.qty;
		discount += item.discount * item.qty;
	});
	return [total, discount];
};

const getGrandTotalAndDiscount = (orderInfo) => {
	let grandTotal = 0;
	let grandDiscount = 0;
	orderInfo.forEach((subOrder) => {
		grandTotal += subOrder.subOrder_total;
		grandDiscount += subOrder.subOrder_discount;
	});
	return [grandTotal, grandDiscount];
};

router.put('/', validateRequestBody, validateUpdateOrder, async (req, res) => {
	const { order_id, items, comment } = req.body;

	// verify prices and discounts of items
	try {
		// Check for validation errors
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			req.logger.error('Validation errors:', errors.array()[0]);
			return res.status(400).json({ message: 'Bad Request', errors: errors.array() });
		}

		const erroneousItems = await verifyPrices(items);
		if (erroneousItems.length > 0) {
			req.logger.info(
				`PRICING MISMATCH for ORDER ID ${order_id} at indexes:`,
				erroneousItems
			);
			req.logger.info('MISMATCH CART:', items);

			return res.status(409).json({ error: 'Pricing mismatch from current menu' });
		}
	} catch (error) {
		req.logger.error('Error verifying prices:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}

	const mongoClient = getMongoClient();
	const ably = initializeAbly();
	const channel = ably.channels.get('update_sub_order');
	req.logger.info('Updating sub-order:', order_id, items);

	try {
		// Fetch the order details from MongoDB
		const order = await mongoClient
			.db(process.env.MONGO_DB)
			.collection(process.env.MONGO_COLLECTION)
			.findOne({ order_id });

		if (!order) {
			return res.status(404).json({ error: 'Order not found' });
		}

		// grab last suborder (which will be edited)
		const lastSubOrder = order.order_info[order.order_info.length - 1];
		const lastSubOrderId = lastSubOrder.sub_order_id;

		if (lastSubOrder.is_punched) {
			return res.status(400).json({ error: 'Order already punched' });
		}
		// Create a new sub-order with the updated items
		let newSubOrder = JSON.parse(JSON.stringify(lastSubOrder));
		newSubOrder.items = items;
		newSubOrder.comment = comment

		const [subOrder_total, subOrder_discount] = getTotalAndDiscount(items);
		newSubOrder.subOrder_total = subOrder_total;
		newSubOrder.subOrder_discount = subOrder_discount;

		// create a new order_info array with all sub-orders except the last one
		let newOrderInfo = order.order_info.filter(
			(subOrder) => subOrder.sub_order_id !== lastSubOrderId
		);

		// add the updated sub-order to the new order_info array as the latest sub-order
		newOrderInfo.push(newSubOrder);

		// create new MongoDoc object with updated order_info
		const newOrder = {
			...order,
			order_info: newOrderInfo,
		};
		const [grandTotal, grandDiscount] = getGrandTotalAndDiscount(newOrder.order_info);
		newOrder.grand_total = grandTotal;
		newOrder.grand_discount = grandDiscount;

		// Update the order in MongoDB with the new MongoDoc
		const mongoResponse = await mongoClient
			.db(process.env.MONGO_DB)
			.collection(process.env.MONGO_COLLECTION)
			.updateOne({ order_id }, { $set: newOrder });

		if (mongoResponse.matchedCount === 0 && mongoResponse.modifiedCount === 0) {
			req.logger.error('Error updating sub-order:', mongoResponse);
			return res.status(500).json({ error: 'Error updating order' });
		}

		req.logger.info(
			`Sub-order with order_id: ${order_id} updated successfully in MongoDB`
		);
		// Publish the updated sub-order to Ably
		await channel.publish(order.table_id, {
			order_id: order_id,
			sub_order: newSubOrder,
		});

		return res.status(200).json({ message: 'Sub-order updated successfully' });
	} catch (error) {
		req.logger.error('Error updating suborder:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
