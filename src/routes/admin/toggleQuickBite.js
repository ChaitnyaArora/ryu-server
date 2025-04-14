import express from 'express';
import supabase from '../../db/supaConn.js';
import cache from '../../utils/cache.js';
import { body, validationResult } from 'express-validator';
import fetchMenuData from '../../utils/fetchMenuData.js';

const router = express.Router();
router.use(express.json());

const validateToggleQuickBite = [
	body('item_id')
		.matches(/^item_\d{3}$/)
		.withMessage('Invalid Item ID'),
];

router.patch('/', validateToggleQuickBite, async (req, res) => {
	// Check for validation errors
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		req.logger.error('Validation errors:', errors.array()[0]);
		return res.status(400).json({ message: 'Bad Request', errors: errors.array() });
	}
	// const itemId = req.params.itemId;
	const { item_id: itemId } = req.body;
	try {
		// fetch item data for the selected item
		const { data, error } = await supabase
			.from(process.env.SUPABASE_ITEMS)
			.select()
			.eq('item_id', itemId);
		if (error) {
			req.logger.error('Error fetching Quick Bites data: ', error);
			return res.status(500).json({ error: 'Internal server error' });
		}
		if (data.length === 0) {
			return res.status(404).json({ error: 'Item not found' });
		}

		// toggle the availability of the selected item
		const { err } = await supabase
			.from(process.env.SUPABASE_ITEMS)
			.update({ is_quickbite: !data[0].is_quickbite })
			.eq('item_id', itemId);
		if (err) {
			req.logger.error(`Error updating "${itemId}" item availability: `, err);
			return res.status(500).json({ error: 'Internal server error' });
		}

		res.status(200).json({ message: 'Quick Bite toggled successfully.' });

		// reset quickBites cache (first need to fetch all other quickBites data)
		const { data: fetchQuickBites, error: fetchQuickBitesError } = await supabase
			.from(process.env.SUPABASE_ITEMS)
			.select()
			.eq('is_quickbite', true);
		if (fetchQuickBitesError) {
			req.logger.error('Error fetching Quick Bites data: ', fetchQuickBites);
			return res.status(500).json({ error: 'Internal server error' });
		}

		req.logger.info('Caching quickBites data');
		cache.set('quickBitesData', fetchQuickBites);

		const menuData = await fetchMenuData();
		req.logger.info('Caching menu data');
		cache.set('menuData', menuData);
		return;
	} catch (error) {
		req.logger.error('Unexpected error fetching Quick Bites data: ', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
