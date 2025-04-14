import express from 'express';
import getMaxDiscount from '../../utils/getMaxDiscount.js';

const router = express.Router();
router.use(express.json());

router.get('/', async (req, res) => {
	try {
		const maxDiscount = await getMaxDiscount();
		return res.status(200).json({ max_discount: maxDiscount });
	} catch (error) {
		req.logger.error('Unexpected error fetching max discount: ', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
