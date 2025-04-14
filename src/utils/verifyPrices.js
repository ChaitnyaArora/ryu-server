import menuCache from './menuCache.js';
import getMaxDiscount from './getMaxDiscount.js';

const getPrices = (items, menu) => {
	// returns verified total price of items in the combo
	let price = 0;
	items.forEach((item) => {
		const menuItem = menu.items.find((m) => m.item_id === item.item_id);
		price += menuItem.price;

		let addOnTotal = 0,
			optionTotal = 0;

		if (item.add_ons && item.add_ons.length) {
			addOnTotal = item.add_ons.reduce((acc, addon) => {
				let menuAddon;
				if(addon?.adopit_id) {
					menuAddon = menu.itemAddOnsOptions.find((a) => a.adopit_id === addon.adopit_id);
				} else {
					menuAddon = menu.addOns.find((a) => a.addon_id === addon.addon_id);
				}
				return acc + menuAddon.price;
			}, 0);
			price += addOnTotal;
		}

		if (item.options && item.options.length) {
			optionTotal = item.options.reduce((acc, option) => {
				let menuOption;
				if(option?.optsize_id) {
					menuOption = menu.itemOptionsSize.find((o) => o.optsize_id === option.optsize_id);
				} else {
					menuOption = menu.options.find((o) => o.option_id === option.option_id);
				}
				return acc + menuOption.price;
			}, 0);
			price += optionTotal;
		}
	});
	return price;
};

const getDiscount = (items, menuItems, maxDiscount) => {
	// returns verified total discount of items in the combo
	let totalDiscount = 0;
	const mp = { Stars: 0.15, Horses: 0.5, Puzzles: 0.75, Dogs: 0.9, NA: 0 };

	items.forEach((item) => {
		const menuItem = menuItems.find((m) => m.item_id === item.item_id);
		const discount = menuItem.price * mp[menuItem.flavify_category] * maxDiscount;
		totalDiscount += Math.floor(discount);
	});

	return totalDiscount;
};

// returns boolean whether 'a' & 'b' are approximately equal or not
const approxEqual = (a, b) => Math.abs(a - b) <= 5;

const verifyPrices = async (items) => {
	// param 'items' = 'req.body.items' in /placeorder & /updatesuborder routes
	// returns array of indexes of items with incorrect prices

	const menuData = await menuCache();
	const maxDiscount = await getMaxDiscount();

	const errors = []; // to store indexes of items with incorrect prices
	items.forEach((item, index) => {
		if (
			item.combo === 'None' ||
			item.combo === 'Checkout' ||
			item.combo === 'Quickbites'
		) {
			if (item.discount != 0) {
				errors.push(index);
				return;
			}
			const calcPrice = getPrices(item.items, menuData);
			if (!approxEqual(calcPrice, item.price)) {
				errors.push(index);
				return;
			}
		} else if (item.combo === 'Menu' || item.combo === 'LandingPage') {
			const calcDiscount = getDiscount(item.items, menuData.items, maxDiscount);
			if (!approxEqual(calcDiscount, item.discount)) {
				errors.push(index);
				return;
			}

			const calcPrice = getPrices(item.items, menuData);
			if (!approxEqual(calcPrice, item.price)) {
				errors.push(index);
				return;
			}
		} else {
			errors.push(index);
		}
	});

	return errors;
};

// TESTING CARTS ******BEGIN******
// {
//   const itemsCorrect = [
//     {
//       combo: 'None',
//       items: [
//         {
//           item_id: 'item_007',
//           price: 315,
//           add_ons: [
//             {
//               addon_id: 'add_001',
//               price: 50,
//             },
//           ],
//           options: [
//             {
//               option_id: 'opt_001',
//               price: 0,
//             },
//           ],
//         },
//       ],
//       qty: 1,
//       price: 365,
//       discount: 0,
//     },
//     {
//       combo: 'LandingPage',
//       items: [
//         {
//           item_id: 'item_001',
//           price: 1995,
//           add_ons: [
//             {
//               addon_id: 'add_001',
//               price: 50,
//             },
//           ],
//           options: [
//             {
//               option_id: 'opt_001',
//               price: 0,
//             },
//           ],
//         },
//         { item_id: 'item_002', price: 2195, add_ons: [], options: [] },
//         { item_id: 'item_003', price: 1495, add_ons: [], options: [] },
//       ],
//       qty: 1,
//       price: 5735,
//       discount: 732,
//     },
//   ];
//   const itemsIncorrect = [
//     {
//       combo: 'None',
//       items: [
//         {
//           item_id: 'item_007',
//           price: 200,
//           add_ons: [
//             {
//               addon_id: 'add_001',
//               price: 50,
//             },
//           ],
//           options: [
//             {
//               option_id: 'opt_001',
//               price: 40,
//             },
//           ],
//         },
//       ],
//       qty: 1,
//       price: 290,
//       discount: 0,
//     },
//     {
//       combo: 'Menu',
//       items: [
//         {
//           item_id: 'item_001',
//           price: 100,
//           add_ons: [
//             {
//               addon_id: 'add_001',
//               price: 20,
//             },
//           ],
//           options: [
//             {
//               option_id: 'opt_001',
//               price: 20,
//             },
//           ],
//         },
//         { item_id: 'item_002', price: 400, add_ons: [], options: [] },
//         { item_id: 'item_003', price: 300, add_ons: [], options: [] },
//       ],
//       qty: 1,
//       price: 840,
//       discount: 64,
//     },
//   ];
//   console.log('verifyPrices INCORRECT:', await verifyPrices(itemsIncorrect));
// console.log('verifyPrices CORRECT:', await verifyPrices(itemsCorrect));
// }
// TESTING CARTS ******END******

export default verifyPrices;
