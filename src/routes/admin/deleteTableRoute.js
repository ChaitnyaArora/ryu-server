import express from 'express';
import supabase from '../../db/supaConn.js';
import cache from '../../utils/cache.js';

const router = express.Router();
router.use(express.json());

router.delete('/', async (req, res) => {
	let newTables = null;
	let tableId = 0;
	try {
		// fetch all table IDs from the tables table
		const { data: tables, error: tableErr } = await supabase
			.from(process.env.SUPABASE_TABLES)
			.select();
		if (tableErr) {
			req.logger.error('Error fetching table data: ', tableErr);
			return res.status(500).json({ error: 'Internal server error' });
		}

		// find the table_id for the table with the largest table_number
		let maxNumber = 0;
		tables.forEach((table) => {
			let num = Number(table.table_number.substring(6, 8));
			if (num > maxNumber) {
				maxNumber = num;
				tableId = table.table_id;
			}
		});

		// Check for ongoing order in the selected table
		const { data: fetchData, error: fetchErr } = await supabase
			.from(process.env.SUPABASE_ORDERS)
			.select()
			.eq('table_id', tableId)
			.eq('order_completed', false);

		if (fetchErr) {
			req.logger.error('Error fetching table data: ', fetchErr);
			return res.status(500).json({ error: 'Internal server error' });
		}

		// Delete only if no live order on table
		if (fetchData.length === 0) {
			const { data, error: deleteErr } = await supabase
				.from(process.env.SUPABASE_TABLES)
				.delete()
				.eq('table_id', tableId);

			if (deleteErr) {
				req.logger.error('Error deleting table data: ', deleteErr);
				return res.status(500).json({ error: 'Internal server error' });
			}
			newTables = tables;
			req.logger.info(`Table with table id "${tableId}" deleted successfully.`);
			return res.status(200).json({ message: 'Table deleted successfully.' });
		}
		// If there is a live order on the table, raise error
		else {
			req.logger.error('Table has active orders. Cannot delete table.');
			return res
				.status(400)
				.json({ error: 'Table has active orders. Cannot delete table.' });
		}
	} catch (err) {
		req.logger.error('Unexpected error deleting tables data: ', err);
		return res.status(500).json({ error: 'Internal server error' });
	} finally {
		// Reset the cache to fetch updated tables data
		const updatedTables = newTables.filter((table) => table.table_id !== tableId);
		req.logger.info('Caching tables data');
		cache.set('tablesData', updatedTables);
	}
});

export default router;
