import express from 'express';
import getMongoClient from '../../db/mongoConn.js';
import supabase from '../../db/supaConn.js';
import initializeAbly from '../../db/ablyConn.js';
import verifyPrices from '../../utils/verifyPrices.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();
router.use(express.json());

const validateRequestBody = (req, res, next) => {
	const { order_id, table_id, items } = req.body;

	// Check if any of the required fields are missing
	if (!order_id || !table_id || !items) {
		return res.status(400).json({ error: 'Missing required fields in the request body' });
	}
	// If all required fields are present, call the next middleware or route handler
	next();
};

const validatePlaceOrder = [
	body('order_id').isUUID(4).withMessage('Invalid Order ID'),
	body('table_id').isUUID(4).withMessage('Invalid Table ID'),
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

router.post('/', validateRequestBody, validatePlaceOrder, async (req, res) => {
	const { order_id, table_id, items, comment } = req.body;

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
	const channel = ably.channels.get('place_sub_order');
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

		// (1) Check if order is already completed
		if (orderExists.length > 0 && orderExists[0].order_completed) {
			req.logger.warn(`Order already completed: ${order_id}`);
			return res.status(400).json({ error: 'Order already completed' });
		} else if (orderExists.length > 0 && !orderExists[0].order_completed) {
			// (2) if order exists and not completed, append to existing MongoDB document
			try {
				//retrieve mongodb document with same order_id
				const existingOrderInfo = await mongoClient
					.db(process.env.MONGO_DB)
					.collection(process.env.MONGO_COLLECTION)
					.findOne({ order_id: order_id });

				if (
					existingOrderInfo.order_info[existingOrderInfo.order_info.length - 1]
						.is_punched === false
				) {
					return res
						.status(400)
						.json({ error: 'Previous Sub-Order has not been punched yet.' });
				}

				const [grandTotal, grandDiscount] = getGrandTotalAndDiscount(
					existingOrderInfo.order_info
				);

				// create new suborder to be appended
				const newSubOrder = existingOrderInfo.order_info.length + 1;
				const [subOrder_total, subOrder_discount] = getTotalAndDiscount(items);
				const orderDocument = {
					sub_order_id: newSubOrder,
					time: new Date().toLocaleString('en-US', {
						timeZone: 'Asia/Kolkata',
					}),
					is_punched: false,
					subOrder_total,
					subOrder_discount,
					items,
					comment,
				};

				// push new suborder to MongoDB document
				const mongoResult = await mongoClient
					.db(process.env.MONGO_DB)
					.collection(process.env.MONGO_COLLECTION)
					.updateOne(
						{ order_id: order_id },
						{
							$push: { order_info: orderDocument },
							$set: {
								grand_total: grandTotal + subOrder_total,
								grand_discount: grandDiscount + subOrder_discount,
							},
						}
					);

				if (mongoResult.modifiedCount > 0) {
					req.logger.info('Order updated in MongoDB');
					// send update to Ably
					await channel.publish(table_id, {
						order_id: order_id,
						sub_order: orderDocument,
					});
					return res.status(200).json({ message: 'Order updated' });
				} else {
					req.logger.error('Error updating order: ', mongoResult);
					return res.status(404).json({ error: 'Error updating order' });
				}
			} catch (error) {
				req.logger.error('Error updating order:', error);
				return res.status(500).json({ error: 'Internal server error' });
			}
		} else {
			// (3) if order does not exist, update fresh MongoDB order document and add row in Supabase
			try {
				const [subOrder_total, subOrder_discount] = getTotalAndDiscount(items);
				const newOrderDocument = {
					order_info: [
						{
							sub_order_id: 1,
							time: new Date().toLocaleString('en-US', {
								timeZone: 'Asia/Kolkata',
							}),
							is_punched: false,
							subOrder_total,
							subOrder_discount,
							items: items,
							comment
						},
					],
				};

				const { error: supabaseError } = await supabase
					.from(process.env.SUPABASE_ORDERS)
					.insert({ order_id: order_id, table_id: table_id });
				if (supabaseError) {
					req.logger.error('Error creating new Supabase record:', supabaseError);
					return res.status(500).json({ error: 'Internal server error' });
				}

				const updateResult = await mongoClient
					.db(process.env.MONGO_DB)
					.collection(process.env.MONGO_COLLECTION)
					.updateOne(
						{ order_id: order_id },
						{
							$set: {
								order_info: newOrderDocument.order_info,
								grand_total: subOrder_total,
								grand_discount: subOrder_discount,
							},
						}
					);

				if (!updateResult.modifiedCount > 0) {
					req.logger.error('Order document not found or already updated in MongoDB');
					return res.status(404).json({ error: 'Error updating order' });
				}

				req.logger.info('New order placed in Supabase & MongoDB');
				// send update to Ably
				await channel.publish(table_id, {
					order_id: order_id,
					sub_order: newOrderDocument.order_info[0],
				});
				return res.status(201).json({ message: 'New order placed' });
			} catch (error) {
				req.logger.error('Error placing new order', error);
				return res.status(500).json({ error: 'Internal server error' });
			}
		}
	} catch (error) {
		req.logger.error('Unexpected error placing sub order: ', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
