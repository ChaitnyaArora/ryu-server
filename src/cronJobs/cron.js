import cron from 'node-cron';
import getMongoClient from '../db/mongoConn.js';
import supabase from '../db/supaConn.js';
import nodemailer from 'nodemailer';
import { Parser } from 'json2csv';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';

dayjs.extend(customParseFormat);

const sendDailyReport = async () => {
  const mongoClient = getMongoClient();
  const today = dayjs().format('YYYY-MM-DD');

  try {
    // Fetch all orders (since we can't filter by date in MongoDB directly due to string timestamp)
    const allOrders = await mongoClient
      .db(process.env.MONGO_DB)
      .collection(process.env.MONGO_COLLECTION)
      .find({order_info: { $exists: true, $ne: [] }})
      .toArray();


    // Filter orders that have suborders from today
    const filteredOrders = allOrders
      .map(order => {
        const todaySubOrders = order.order_info.filter(sub => {
          const parsed = dayjs(sub.time, 'M/D/YYYY, h:mm:ss A');
          return parsed.format('YYYY-MM-DD') === today;
        });

        if (todaySubOrders.length === 0) return null;

        return {
          ...order,
          order_info: todaySubOrders,
        };
      })
      .filter(Boolean);



    if (filteredOrders.length === 0) {
      console.log('No orders found for today.');
      return;
    }

    // Fetch Supabase metadata
    const orderIds = filteredOrders.map(order => order.order_id);
    const { data: supabaseData, error } = await supabase
      .from(process.env.SUPABASE_ORDERS)
      .select('*')
      .in('order_id', orderIds);

    if (error) {
      console.error('Error fetching Supabase data:', error);
      return;
    }

    console.log('Supabase data fetched successfully:', supabaseData, filteredOrders);

    // Merge MongoDB + Supabase into flat CSV structure
    const mergedData = [];
    for (const order of filteredOrders) {
      const meta = supabaseData.find(s => s.order_id === order.order_id);
      const { data: supabaseCustData, error } = await supabase
      .from(process.env.SUPABASE_CUSTOMERS)
      .select('*')
      .eq('order_id', order.order_id).single();
      const { data: supabaseTableData, tableError } = await supabase
      .from(process.env.SUPABASE_TABLES)
      .select('*')
      .eq('table_id', meta?.table_id).single();

      console.log({supabaseCustData, meta, supabaseTableData})
      order.order_info.forEach((subOrder) => {
        mergedData.push({
        //   orderId: order.order_id,
          tableId: supabaseTableData?.table_number,
        //   subOrderId: subOrder.sub_order_id,
          time: subOrder.time,
          total: subOrder.subOrder_total,
          discount: subOrder.subOrder_discount,
          customerName: supabaseCustData?.name,
          phoneNumber: supabaseCustData?.phone,
        //   comment: subOrder.comment || '',
          items: subOrder.items.map(i => `${i.items?.map(ii => ii.item_name).join(" , ") || 'Unknown'} (x${i.qty})`).join('; '),
          review: order.review || '',
        });
      });
    }

    const totalAmount = mergedData.reduce((sum, row) => sum + (Number(row.total) || 0), 0);
    const totalDiscount = mergedData.reduce((sum, row) => sum + (Number(row.discount) || 0), 0);

    mergedData.push({
      tableId: 'GRAND TOTAL',
      time: '-',
      total: totalAmount,
      discount: totalDiscount,
      customerName: '-',
      phoneNumber: '-',
      items: '-',
      review: '-',
    });

    // console.log({ mergedData });

    // Convert to CSV
    const json2csv = new Parser();
    const csv = json2csv.parse(mergedData);

    console.log('CSV generated successfully.', csv);

    // Email Setup
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.REPORT_EMAIL,
        pass: process.env.REPORT_EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.REPORT_EMAIL,
    //   to: 'lakhanishubham9750@gmail.com',
      to: process.env.CLIENT_EMAIL,
      cc: process.env.CLIENT_EMAIL_CC,
      subject: `Daily Order Report - ${dayjs().format('DD MMM YYYY')}`,
      text: 'Please find attached the order report for today.',
      attachments: [
        {
          filename: `order-report-${today}.csv`,
          content: csv,
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Daily report sent successfully.');
  } catch (err) {
    console.error('❌ Error generating/sending daily report:', err);
  }
};

// Schedule job to run every night at 11:59 PM
export const runCronJobs = () => {
  cron.schedule('59 23 * * *', () => {
    console.log('📦 Running daily report job...');
    sendDailyReport();
}, {
    timezone: 'Asia/Kolkata'
});
};

