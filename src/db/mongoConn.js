import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from 'mongodb';
import logger from '../utils/logger.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI;

const options = {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
	connectTimeoutMS: 10000,
	retryWrites: true,
	maxPoolSize: 10,
};

let mongoClient;

const connectToMongo = async () => {
	try {
		if (!mongoClient) {
			mongoClient = new MongoClient(mongoUri, options);
			await mongoClient.connect();
			logger.info('MongoDB connected successfully');
		}
	} catch (err) {
		logger.error('Error connecting to MongoDB:', err);
	}
};

const getMongoClient = () => {
	if (!mongoClient) {
		logger.info('MongoDB client is not initialized, attempting to connect...');
		connectToMongo();
	}
	return mongoClient;
};

(async () => {
	await connectToMongo();
})();

export default getMongoClient;
