import cache from './cache.js';
import fetchMenuData from './fetchMenuData.js';
import logger from './logger.js';
import supabase from '../db/supaConn.js';

const menuCache = async () => {
	let menuData = cache.get('menuData');
	if (!menuData) {
		menuData = await fetchMenuData();
		logger.info('Caching menu from DB');
		// menuData.items = menuData.items.sort((a, b) => {
		// 	if (a.item_id < b.item_id) return -1;
		// 	if (a.item_id > b.item_id) return 1;
		// 	return 0; // names are equal
		// });
		cache.set('menuData', menuData);
	}
	return menuData;
};

const quickBitesCache = async () => {
	const { data, error } = await supabase
		.from(process.env.SUPABASE_ITEMS)
		.select()
		.eq('is_quickbite', true);

	if (error) {
		logger.error('Error fetching Quick Bites data: ', error);
	}

	logger.info('Caching quickBites from DB');
	cache.set('quickBitesData', data);
};

(async () => {
	try {
		await menuCache();
		await quickBitesCache();
	} catch (error) {
		logger.error('Error caching menu / QB:', error);
	}
})();

export default menuCache;
