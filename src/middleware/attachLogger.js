import logger from '../utils/logger.js';

const attachLogger = (req, res, next) => {
	const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	const path = req.originalUrl;

	req.logger = {
		info: (message, ...meta) => logger.info(message, { ip, path, meta }),
		warn: (message, ...meta) => logger.warn(message, { ip, path, meta }),
		error: (message, ...meta) =>
			logger.error(message, {
				ip,
				path,
				meta: meta.map((m) => JSON.stringify(m, Object.getOwnPropertyNames(m))),
			}),
	};

	next();
};

export default attachLogger;
