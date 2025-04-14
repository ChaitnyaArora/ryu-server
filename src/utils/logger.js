import { createLogger, format, transports } from 'winston';

const { combine, printf } = format;

const myFormat = printf(({ level, message, timestamp, ip, path, meta }) => {
	const metaString = meta ? meta.join(' ') : '';
	return `[${level}] ${ip || '-'} ${path || '-'}: ${message} ${metaString}`;
});

const logger = createLogger({
	level: 'info',
	format: myFormat,
	transports: [
		new transports.Console(),
		// new transports.File({ filename: 'combined.log' }),
		// new transports.File({ filename: 'errors.log', level: 'error' }),
	],
});

export default logger;
