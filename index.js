import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { runCronJobs } from './src/cronJobs/cron.js';
import attachLogger from './src/middleware/attachLogger.js';
import adminApiRoutes from './src/routes/admin/adminApiRoutes.js';
import apiRoutes from './src/routes/diner/apiRoutes.js';
import logger from './src/utils/logger.js';

const app = express();
const port = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

const limitHandler = (req, res, options) => {
	req.logger.info(
		`Rate limit exceeded by IP: ${
			req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'] : req.ip
		}`
	);
	res.status(options.statusCode).json({ message: options.message });
};

const limiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minute
	limit: 30, // Limit each IP to 30 requests per `window` (here, per 1 minute)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	handler: (req, res, next, options) => limitHandler(req, res, options),
	keyGenerator: (req) => {
		const forwardedFor = req.headers['x-forwarded-for']
			? req.headers['x-forwarded-for'].toString().split(':')[0]
			: req.ip;
		return forwardedFor;
	},
});
app.use(attachLogger);
app.use(limiter);

// Heartbeat endpoint
app.get('/heartbeat', (req, res) => {
	res.status(200).json({ message: 'Server is alive 🚀' });
});

// ORIGIN check middleware
app.use((req, res, next) => {
	const origin = req.headers.origin;
	const allowedOrigins = [process.env.ORIGIN_DINER, process.env.ORIGIN_ADMIN].filter(
		Boolean
	);

	// Skip origin check if both allowed origins are not set
	if (allowedOrigins.length === 0) {
		return next();
	}
	
	if (!origin || !allowedOrigins.includes(origin)) {
		const ip = req.headers['x-forwarded-for'] || req.ip;
		req.logger.warn('Access from unauthorized origin by IP:', ip);
		return res.status(403).json({ error: 'Forbidden' });
	}
	next();
});

// API key check middleware (diner)
const apiKeyCheck = (req, res, next) => {
	const apiKey = req.headers.authorization
		? req.headers.authorization.toString().split(' ')[1]
		: null;
	if (process.env.API_KEY_DINER && (!apiKey || apiKey !== process.env.API_KEY_DINER)) {
		req.logger.warn(
			'Unauthorized access to Diner App by IP: ',
			req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'] : req.ip
		);
		return res.status(401).json({ error: 'Unauthorized' });
	} else {
		next();
	}
};

// API key check middleware (admin)
const adminApiKeyCheck = (req, res, next) => {
	const apiKey = req.headers.authorization
		? req.headers.authorization.toString().split(' ')[1]
		: null;
	if (process.env.API_KEY_ADMIN && (!apiKey || apiKey !== process.env.API_KEY_ADMIN)) {
		req.logger.warn(
			'Unauthorized access to Admin App by IP: ',
			req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'] : req.ip
		);
		return res.status(401).json({ error: 'Unauthorized' });
	} else {
		next();
	}
};

// Use the imported adminApiRoutes
app.use('/api/v1/admin', adminApiKeyCheck, adminApiRoutes);

// Use the imported apiRoutes
app.use('/api/v1', apiKeyCheck, apiRoutes);

// 404 error handling middleware
app.use((req, res) => {
	res.status(404).json({ error: 'Route not found' });
});

runCronJobs()

// Error handling middleware
app.use((err, req, res, next) => {
	const errorDetails = {
		url: req.originalUrl,
		method: req.method,
		message: err.message,
		stack: err.stack,
	};
	logger.error('Error:', errorDetails);
	res.status(500).json({ error: 'Unforeseen error. Something went wrong' });
});

app.listen(port, () => {
	logger.info(`Server is running on port ${port}`);
});
