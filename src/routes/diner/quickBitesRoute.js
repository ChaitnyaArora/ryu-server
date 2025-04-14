import express from 'express';
import supabase from '../../db/supaConn.js';
import cache from '../../utils/cache.js';

const router = express.Router();
router.use(express.json());

router.get('/', async (req, res) => {
	const cachedData = cache.get('quickBitesData');
	if (cachedData) {
		req.logger.info('Returning cached Quick Bites data');
		return res.status(200).json({ data: cachedData });
	}

	try {
		const { data, error } = await supabase
			.from(process.env.SUPABASE_ITEMS)
			.select()
			.eq('is_quickbite', true);

		if (error) {
			req.logger.error('Error fetching Quick Bites data: ', error);
			return res.status(500).json({ error: 'Internal server error' });
		}

		res.status(200).json({ data: data.splice(0,10) });

		req.logger.info('Caching quickBites data');
		cache.set('quickBitesData', data);
		return;
	} catch (error) {
		req.logger.error('Unexpected error fetching Quick Bites data: ', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
