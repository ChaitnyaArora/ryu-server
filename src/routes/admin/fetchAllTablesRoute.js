import express from 'express';
import supabase from '../../db/supaConn.js';
import cache from '../../utils/cache.js';

const router = express.Router();
router.use(express.json());

router.get('/', async (req, res) => {
	const cachedData = cache.get('tablesData');
	if (cachedData) {
		req.logger.info('Returning cached tables data');
		return res.status(200).json({ data: cachedData });
	}

	try {
		// fetch all tables from table data
		const { data: tables, error } = await supabase
			.from(process.env.SUPABASE_TABLES)
			.select();
		if (error) {
			req.logger.error('Error fetching tables data: ', error);
			return res.status(500).json({ error: 'Internal server error' });
		}

		res.status(200).json({ data: tables });

		// Caching the tables data
		req.logger.info('Caching tables data');
		cache.set('tablesData', tables);
		return;
	} catch (error) {
		req.logger.error('Error fetching tables data: ', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
