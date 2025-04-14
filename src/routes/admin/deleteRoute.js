import express from 'express';
import supabase from '../../db/supaConn.js';
import cache from '../../utils/cache.js';
import fetchMenuData from '../../utils/fetchMenuData.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();
router.use(express.json());

const validateDeleteItem = [
	body('item_id')
		.matches(/^item_\d{3}$/)
		.withMessage('Invalid Item ID'),
];

router.delete('/item', validateDeleteItem, async (req, res) => {
	// Check for validation errors
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		req.logger.error('Validation errors:', errors.array()[0]);
		return res.status(400).json({ message: 'Bad Request', errors: errors.array() });
	}
	const itemId = req.body.item_id;
	try {
		// Deleting in referencing tables first (ie, addon-items, option-items, tag-items)
		const { error: addonItemsError } = await supabase
			.from(process.env.SUPABASE_ADDONITEMS)
			.delete()
			.eq('item_id', itemId);
		if (addonItemsError) {
			req.logger.error('Error deleting addon-items data: ', addonItemsError);
			return res.status(500).json({ error: 'Internal server error' });
		}

		const { error: optionItemsError } = await supabase
			.from(process.env.SUPABASE_OPTIONITEMS)
			.delete()
			.eq('item_id', itemId);
		if (optionItemsError) {
			req.logger.error('Error deleting option-items data: ', optionItemsError);
			return res.status(500).json({ error: 'Internal server error' });
		}

		const { error: tagItemsError } = await supabase
			.from(process.env.SUPABASE_TAGSITEM)
			.delete()
			.eq('item_id', itemId);
		if (tagItemsError) {
			req.logger.error('Error deleting tag-items data: ', tagItemsError);
			return res.status(500).json({ error: 'Internal server error' });
		}

		// deleting item finally from items table
		const { data, error: itemsError } = await supabase
			.from(process.env.SUPABASE_ITEMS)
			.delete()
			.eq('item_id', itemId)
			.select();
		if (itemsError) {
			req.logger.error('Error deleting items data: ', itemsError);
			return res.status(500).json({ error: 'Internal server error' });
		}
		if (!data.length) {
			return res.status(404).json({ error: 'Item not found.' });
		}

		req.logger.info(`Item with item id "${itemId}" deleted successfully.`);
		return res.status(200).json({ message: 'Item deleted successfully.' });
	} catch (error) {
		req.logger.error('Unexpected error deleting items data: ', error);
		return res.status(500).json({ error: 'Internal server error' });
	} finally {
		// reset the cache to fetch the updated menu data
		const menuData = await fetchMenuData();
		req.logger.info('Caching menu data');
		cache.set('menuData', menuData);
	}
});

// router.delete('/addon', async (req, res) => {
//   const addonId = req.body.addon_id;
//   try {
//     // Deleting in referencing tables first (ie, addon-items, tag-addons)
//     const { error: addonItemsError } = await supabase
//       .from(process.env.SUPABASE_ADDONITEMS)
//       .delete()
//       .eq('addon_id', addonId);
//     if (addonItemsError) {
//       req.logger.error('Error deleting addon-items data: ', addonItemsError);
//       return res.status(500).json({ error: 'Internal server error' });
//     }

//     const { error: tagAddonsError } = await supabase
//       .from(process.env.SUPABASE_TAGSADDON)
//       .delete()
//       .eq('addon_id', addonId);
//     if (tagAddonsError) {
//       req.logger.error('Error deleting tag-addons data: ', tagAddonsError);
//       return res.status(500).json({ error: 'Internal server error' });
//     }

//     // deleting addon finally from addons table
//     const { data, error: addonError } = await supabase
//       .from(process.env.SUPABASE_ADDONS)
//       .delete()
//       .eq('addon_id', addonId)
//       .select();
//     if (addonError) {
//       req.logger.error('Error deleting addons data: ', addonError);
//       return res.status(500).json({ error: 'Internal server error' });
//     }
//     if (!data.length) {
//       return res.status(404).json({ error: 'Addon not found.' });
//     }

//     req.logger.info(`Addon with addon id "${addonId}" deleted successfully.`);
//     res.status(200).json({ message: 'Addon deleted successfully.' });

//     // reset the cache to fetch the updated menu data
//     const menuData = await fetchMenuData();
//     req.logger.info('Caching menu data');
//     cache.set('menuData', menuData);
//     return;
//   } catch (error) {
//     req.logger.error('Unexpected error deleting addons data: ', error);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });

// router.delete('/option', async (req, res) => {
//   const optionId = req.body.option_id;
//   try {
//     // Deleting in referencing tables first (ie, option-items, tag-options)
//     const { error: optionItemsError } = await supabase
//       .from(process.env.SUPABASE_OPTIONITEMS)
//       .delete()
//       .eq('option_id', optionId);
//     if (optionItemsError) {
//       req.logger.error('Error deleting option-items data: ', optionItemsError);
//       return res.status(500).json({ error: 'Internal server error' });
//     }

//     const { error: tagOptionsError } = await supabase
//       .from(process.env.SUPABASE_TAGSOPTION)
//       .delete()
//       .eq('option_id', optionId);
//     if (tagOptionsError) {
//       req.logger.error('Error deleting tag-options data: ', tagOptionsError);
//       return res.status(500).json({ error: 'Internal server error' });
//     }

//     // deleting option finally from options table
//     const { data, error: optionError } = await supabase
//       .from(process.env.SUPABASE_OPTIONS)
//       .delete()
//       .eq('option_id', optionId)
//       .select();
//     if (optionError) {
//       req.logger.error('Error deleting options data: ', optionError);
//       return res.status(500).json({ error: 'Internal server error' });
//     }
//     if (!data.length) {
//       return res.status(404).json({ error: 'Option not found.' });
//     }

//     req.logger.info(`Option with option id "${optionId}" deleted successfully.`);
//     res.status(200).json({ message: 'Option deleted successfully.' });

//     // reset the cache to fetch the updated menu data
//     const menuData = await fetchMenuData();
//     req.logger.info('Caching menu data');
//     cache.set('menuData', menuData);
//     return;
//   } catch (error) {
//     req.logger.error('Unexpected error deleting options data: ', error);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });

export default router;
