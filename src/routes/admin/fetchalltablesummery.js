import express from 'express';
import supabase from '../../db/supaConn.js';
import getMongoClient from '../../db/mongoConn.js';
import { DateTime } from 'luxon';  // Luxon for easy date formatting

const router = express.Router();
router.use(express.json());

router.get('/', async (req, res) => {
  const mongoClient = getMongoClient();

  req.logger.info('Fetching daily report for all tables.');

  try {
    // Get today's date in YYYY-MM-DD format
    const startOfDay = DateTime.local().setZone('Asia/Kolkata').startOf('day').toUTC().toISO(); // start of the day in UTC
    const endOfDay = DateTime.local().setZone('Asia/Kolkata').endOf('day').toUTC().toISO();   // end of the day in UTC

    // Fetch all distinct table IDs from Supabase
    const { data: tables, error: tableError } = await supabase
      .from(process.env.SUPABASE_TABLES)
      .select('table_id, table_number');

    if (tableError) {
      req.logger.error('Error fetching table IDs from Supabase:', tableError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (tables.length === 0) {
      req.logger.info('No tables found in the database.');
      return res.status(204).end();
    }

    // Prepare to store the daily reports for each table
    const dailyReports = [];
    let allTablesTotalOrders = 0;
    let allTablesTotalAmount = 0;
    let allTablesTotalDiscount = 0;
    // Loop through all the table IDs to generate reports
    for (const table of tables) {
      const {table_id, table_number} = table;

      // Fetch orders from Supabase for the given table for today
      const { data: orders, error: orderError } = await supabase
        .from(process.env.SUPABASE_ORDERS)
        .select('order_id')
        .eq('table_id', table_id)
        .eq('order_completed', true)
        .gte('order_initiated', startOfDay)  // Start of the day
        .lt('order_initiated', endOfDay) // End of the day

      if (orderError) {
        req.logger.error(`Error fetching orders for table ${table_id}:`, orderError);
        continue;  // Skip this table and continue to the next one
      }

      // Fetch corresponding MongoDB documents for the orders
      const mongoResult = await mongoClient
        .db(process.env.MONGO_DB)
        .collection(process.env.MONGO_COLLECTION)
        .find({ order_id: { $in: orders.map((order) => order.order_id) } })
        .toArray();

      // Calculate total amount and total discount
      const { totalAmount, totalDiscount } = mongoResult.reduce(
        (acc, order) => {
          acc.totalAmount += order.grand_total;
          acc.totalDiscount += order.grand_discount;
          return acc;
        },
        { totalAmount: 0, totalDiscount: 0 }
      );
      

      // Prepare the daily report for this table
      const dailyReport = {
        table_id,
        table_number,
        total_orders: mongoResult.length,
        total_amount: totalAmount,
        total_discount: totalDiscount,
        // orders: mongoResult,
      };
      allTablesTotalOrders += mongoResult.length;
      allTablesTotalAmount += totalAmount;
      allTablesTotalDiscount += totalDiscount;

      dailyReports.push(dailyReport);
    }

    dailyReports.push({
      table_id: 'all',
      table_number: 'All',
      total_orders: allTablesTotalOrders,
      total_amount: allTablesTotalAmount,
      total_discount: allTablesTotalDiscount,
      // orders: mongoResult,
    });

    // Return the aggregated report for all tables
    return res.status(200).json({ daily_reports: dailyReports });
  } catch (err) {
    req.logger.error('Error fetching daily report for all tables:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
