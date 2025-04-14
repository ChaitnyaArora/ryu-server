import express from 'express';
import supabase from '../../db/supaConn.js';
import cache from '../../utils/cache.js';
import fetchMenuData from '../../utils/fetchMenuData.js';

const router = express.Router();
router.use(express.json());

router.patch('/', async (req, res) => {
	const { items, addons, options } = req.body;
	try {
		// for items
		if (items.length > 0) {
			// fetch all items from items table
			const { data: menu_items, error: itemsError } = await supabase
				.from(process.env.SUPABASE_ITEMS)
				.select();
			if (itemsError) {
				req.logger.error('Error fetching items data: ', itemsError);
				return res.status(500).json({ error: 'Internal server error' });
			}

			// toggle the availability of each item present in the 'items' array
			items.forEach(async (id) => {
				const { error } = await supabase
					.from(process.env.SUPABASE_ITEMS)
					.update({
						is_available: !menu_items.find((item) => item.item_id === id).is_available,
					}) // simply toggling the .is_availabile boolean using ! operator
					.eq('item_id', id);

				if (error) {
					req.logger.error(`Error updating "${id}" item availability: `, error);
					return res.status(500).json({ error: 'Internal server error' });
				}
			});
		}

		// for addons
		if (addons.length > 0) {
			// fetch all addons from addons table
			const { data: menu_addons, error: addonsError } = await supabase
				.from(process.env.SUPABASE_ADDONS)
				.select();
			if (addonsError) {
				req.logger.error('Error fetching addons data: ', error);
				return res.status(500).json({ error: 'Internal server error' });
			}

			// toggle the availability of each addon present in the 'addons' array
			addons.forEach(async (id) => {
				const { error } = await supabase
					.from(process.env.SUPABASE_ADDONS)
					.update({
						is_available: !menu_addons.find((addon) => addon.addon_id === id)
							.is_available,
					})
					.eq('addon_id', id);

				if (error) {
					req.logger.error(`Error updating "${id}" addon availability: `, error);
					return res.status(500).json({ error: 'Internal server error' });
				}
			});
		}

		// for options
		if (options.length > 0) {
			// fetch all options from options table
			const { data: menu_options, error: optionsError } = await supabase
				.from(process.env.SUPABASE_OPTIONS)
				.select();
			if (optionsError) {
				req.logger.error('Error fetching options data: ', error);
				return res.status(500).json({ error: 'Internal server error' });
			}

			// toggle the availability of each option present in the 'options' array
			options.forEach(async (id) => {
				const { error } = await supabase
					.from(process.env.SUPABASE_OPTIONS)
					.update({
						is_available: !menu_options.find((option) => option.option_id === id)
							.is_available,
					})
					.eq('option_id', id);

				if (error) {
					req.logger.error(`Error updating "${id}" option availability: `, error);
					return res.status(500).json({ error: 'Internal server error' });
				}
			});
		}

		res.status(200).json({ message: 'Availability updated successfully.' });

		// reset the cache to fetch the updated menu data
		const menuData = await fetchMenuData();
		req.logger.info('Caching menu data');
		cache.set('menuData', menuData);
		return;
	} catch (err) {
		req.logger.error('Error fetching tables for setAvailability: ', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
