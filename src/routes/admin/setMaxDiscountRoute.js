import fs from 'fs/promises';
import express from 'express';
import { body, validationResult } from 'express-validator';

const router = express.Router();
router.use(express.json());

const setMaxDiscount = async (newDiscount) => {
	const path = './src/algo/maxDiscount.json';
	const data = await fs.readFile(path, 'utf8');
	const config = JSON.parse(data);
	config.max_discount = newDiscount;
	await fs.writeFile(path, JSON.stringify(config, null, 2), 'utf8');
};

const validateRequestBody = [
	body('new_discount')
		.exists()
		.isFloat({ min: 0, max: 1 })
		.withMessage('Invalid discount value'),
];

router.put('/', validateRequestBody, async (req, res) => {
	// Check for validation errors
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		req.logger.error('Validation errors:', errors.array()[0]);
		return res.status(400).json({ message: 'Bad Request', errors: errors.array() });
	}
	const newDiscount = req.body.new_discount;
	if (!newDiscount) {
		return res.status(400).json({ error: 'New discount not provided' });
	}

	try {
		await setMaxDiscount(newDiscount);
		req.logger.info(`Max discount set to ${newDiscount}`);
		return res.status(200).json({ message: 'Max discount set successfully' });
	} catch (error) {
		req.logger.error('Unexpected error setting max discount: ', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
