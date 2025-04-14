import express from 'express';
import supabase from '../../db/supaConn.js';
import cache from '../../utils/cache.js';
import fetchMenuData from '../../utils/fetchMenuData.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();
router.use(express.json());

const validateAvailItem = [
	body('item_id')
		.matches(/^item_\d{3}$/)
		.withMessage('Invalid Item ID'),
];

const validateAvailOption = [
	body('option_id')
		.matches(/^opt_\d{3}$/)
		.withMessage('Invalid Option ID'),
];

const validateAvailAddon = [
	body('addon_id')
		.matches(/^add_\d{3}$/)
		.withMessage('Invalid AddOn ID'),
];

router.patch('/item', validateAvailItem, async (req, res) => {
	// Check for validation errors
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		req.logger.error('Validation errors:', errors.array()[0]);
		return res.status(400).json({ message: 'Bad Request', errors: errors.array() });
	}

	const { item_id: itemId } = req.body;

	try {
		// fetch item data for the selected item
		const { data: item, error: getItemError } = await supabase
			.from(process.env.SUPABASE_ITEMS)
			.select()
			.eq('item_id', itemId);
		if (getItemError) {
			req.logger.error('Error fetching item availability: ', error);
			return res.status(500).json({ error: 'Internal server error' });
		}
		if (item.length === 0) {
			return res.status(404).json({ error: 'Item not found' });
		}

		// toggle the availability of the selected item
		const { data, error } = await supabase
			.from(process.env.SUPABASE_ITEMS)
			.update({ is_available: !item[0].is_available })
			.eq('item_id', itemId)
			.select();
		if (error) {
			req.logger.error(`Error updating "${itemId}" item availability: `, error);
			return res.status(500).json({ error: 'Internal server error' });
		}

		res.status(200).json({ message: 'Item availability toggled successfully.' });

		// reset quickBites cache if the item is a quickBite
		if (data[0].is_quickbite) {
			const quickBites = cache.get('quickBitesData');
			quickBites.forEach((quickBite) => {
				if (quickBite.item_id === itemId) {
					quickBite.is_available = !quickBite.is_available;
				}
			});
			req.logger.info('Caching quickBites data');
			cache.set('quickBitesData', quickBites);
		}

		// reset the cache to fetch the updated menu data
		const menuData = await fetchMenuData();
		req.logger.info('Caching menu data');
		cache.set('menuData', menuData);
		return;
	} catch (error) {
		req.logger.error('Error updating item availability: ', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

router.patch('/addon', validateAvailAddon, async (req, res) => {
	// Check for validation errors
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		req.logger.error('Validation errors:', errors.array()[0]);
		return res.status(400).json({ message: 'Bad Request', errors: errors.array() });
	}

	const { addon_id: addonId } = req.body;

	try {
		// fetch addon data for the selected addon
		const { data: addon, error: getAddonError } = await supabase
			.from(process.env.SUPABASE_ADDONS)
			.select()
			.eq('addon_id', addonId);
		if (getAddonError) {
			req.logger.error('Error fetching addon availability: ', error);
			return res.status(500).json({ error: 'Internal server error' });
		}
		if (addon.length === 0) {
			return res.status(404).json({ error: 'Addon not found' });
		}

		// toggle the availability of the selected addon
		const { error } = await supabase
			.from(process.env.SUPABASE_ADDONS)
			.update({ is_available: !addon[0].is_available })
			.eq('addon_id', addonId);
		if (error) {
			req.logger.error(`Error updating "${addonId}" addon availability: `, error);
			return res.status(500).json({ error: 'Internal server error' });
		}

		res.status(200).json({ message: 'Addon availability toggled successfully.' });

		// reset the cache to fetch the updated menu data
		const menuData = await fetchMenuData();
		req.logger.info('Caching menu data');
		cache.set('menuData', menuData);
		return;
	} catch (error) {
		req.logger.error('Error updating addon availability: ', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

router.patch('/option', validateAvailOption, async (req, res) => {
	// Check for validation errors
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		req.logger.error('Validation errors:', errors.array()[0]);
		return res.status(400).json({ message: 'Bad Request', errors: errors.array() });
	}

	const { option_id: optionId } = req.body;

	try {
		// fetch option data for the selected option
		const { data: option, error: getOptionError } = await supabase
			.from(process.env.SUPABASE_OPTIONS)
			.select()
			.eq('option_id', optionId);
		if (getOptionError) {
			req.logger.error('Error fetching option availability: ', error);
			return res.status(500).json({ error: 'Internal server error' });
		}
		if (option.length === 0) {
			return res.status(404).json({ error: 'Option not found' });
		}

		// toggle the availability of the selected option
		const { error } = await supabase
			.from(process.env.SUPABASE_OPTIONS)
			.update({ is_available: !option[0].is_available })
			.eq('option_id', optionId);
		if (error) {
			req.logger.error(`Error updating "${optionId}" option availability: `, error);
			return res.status(500).json({ error: 'Internal server error' });
		}

		res.status(200).json({ message: 'Option availability toggled successfully.' });

		// reset the cache to fetch the updated menu data
		const menuData = await fetchMenuData();
		req.logger.info('Caching menu data');
		cache.set('menuData', menuData);
		return;
	} catch (error) {
		req.logger.error('Error updating option availability: ', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
