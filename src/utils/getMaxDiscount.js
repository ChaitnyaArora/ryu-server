import fs from 'fs/promises';

const getMaxDiscount = async () => {
	const path = './src/algo/maxDiscount.json';
	const data = await fs.readFile(path, 'utf8');
	const config = JSON.parse(data);
	return config.max_discount;
};

export default getMaxDiscount;
