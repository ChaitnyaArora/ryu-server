import Ably from 'ably';
import logger from '../utils/logger.js';

let realtime = null;

const connectToAbly = () => {
	realtime = new Ably.Realtime({
		key: process.env.ABLY_API_KEY,
		logLevel: 2,
	});
};

const initializeAbly = () => {
	if (!realtime) {
		logger.info('Ably client is not initialized, attempting to connect...');
		connectToAbly();
	}
	return realtime;
};

export default initializeAbly;
