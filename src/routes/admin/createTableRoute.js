import express from 'express';
import supabase from '../../db/supaConn.js';
import { v4 as uuid } from 'uuid';
import cache from '../../utils/cache.js';

const router = express.Router();
router.use(express.json());

router.get('/', async (req, res) => {
	let tableData = null;
	try {
		// fetch all table data
		const { data, error } = await supabase.from(process.env.SUPABASE_TABLES).select();

		if (error) {
			req.logger.error('Error fetching tables data: ', error);
			return res.status(500).json({ error: 'Internal server error' });
		}

		// Iterating through all tables to find the max table number for the new table
		let maxId = 0;
		data.forEach((table) => {
			const tableId = Number(table.table_number.substring(6, 8));
			maxId = Math.max(maxId, tableId);
		});

		// incrementing by 1 to get the new table number
		maxId += 1;
		let newTableNumber = '';
		if (maxId < 10) {
			newTableNumber = 'Table-0' + maxId;
		} else {
			newTableNumber = 'Table-' + maxId;
		}

		// Creating new uuid for table id and url
		const newTableId = uuid();
		const newTableUrl = 'https://ryba.flavifylabs.com/' + newTableId;

		// inserting new table data into the database
		const { error: insertError } = await supabase
			.from(process.env.SUPABASE_TABLES)
			.insert({
				table_id: newTableId,
				table_number: newTableNumber,
				url: newTableUrl,
			});
		if (insertError) {
			req.logger.error('Error inserting new table: ', insertError);
			return res.status(500).json({ error: 'Internal server error' });
		}

		req.logger.info(
			`New table with table number "${newTableNumber}" created successfully.`
		);
		data.push({ table_id: newTableId, table_number: newTableNumber, url: newTableUrl });
		tableData = data;
		return res.status(201).json({ message: 'New table created successfully.' });
	} catch (err) {
		req.logger.error('Unexpected error fetching tables data: ', err);
		return res.status(500).json({ error: 'Internal server error' });
	} finally {
		// Resetting the cache to add the new table
		req.logger.info('Caching tables data');
		cache.set('tablesData', tableData);
	}
});

export default router;
