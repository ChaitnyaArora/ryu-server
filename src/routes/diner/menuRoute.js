import express from 'express';
import fetchMenuData from '../../utils/fetchMenuData.js';
import cache from '../../utils/cache.js';

const router = express.Router();
router.use(express.json());

router.get('/', async (req, res) => {
	const cachedData = cache.get('menuData');
	if (cachedData) {
		req.logger.info('Returning cached menu data');
		return res.status(200).json(cachedData);
	}

	try {
		const menuData = await fetchMenuData();

		res.status(200).json(menuData);

		req.logger.info('Caching menu data');
		cache.set('menuData', menuData);
		return;
	} catch (error) {
		req.logger.info(error.message);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
