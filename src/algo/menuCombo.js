const getMenuUniverseDiet = (menu, diet, refreshFlag) => {
	// filter the menu on basis of diet
	const menu_universe_diet = menu.filter((item) => {
		if (diet === 'E') {
			return item.diet === 'E' || item.diet === 'V';
		} else if (diet === 'V') {
			return item.diet === 'V';
		} else {
			return (
				item.item_category === 'Desserts' ||
				item.item_category === 'Beverages' ||
				refreshFlag ||
				item.diet === diet
			);
		}
	});

	return menu_universe_diet;
};

const getMenuUniverseCart = (menu, cart) => {
	// make note of the items in the cart by their item_id's
	const itemIds = cart.map((item) => item.item_id);
	// only include those items in menu_universe_cart which are not present in the cart
	const menu_universe_cart = menu.filter((item) => {
		return !itemIds.includes(item.item_id);
	});

	return menu_universe_cart;
};

const getMenuUniverseFlavCat = (menu) => {
	// filter the menu to contain items only from 'Dogs' and 'Puzzles' flavify_categories
	const menu_universe_flavCat = menu.filter((item) => {
		return item.flavify_category === 'Dogs' || item.flavify_category === 'Puzzles';
	});

	return menu_universe_flavCat;
};

const getQuickBites = (menu) => {
	// returns array of item_ids of all quickbites
	const quickBites = menu.filter((item) => item.is_quickbite);
	return quickBites;
};

const getCategoriesToRecommend = (anchor_category) => {
	// returns array of strings denoting the categories to recommend
	const map = {
		'Soups & Salads': ['Starters', 'Soups & Salads', 'Main Course'],
		Starters: ['Starters', 'Beverages', 'Main Course'],
		'Main Course': ['Main Course', 'Beverages', 'Desserts'],
		Desserts: ['Desserts', 'Beverages'],
		Beverages: ['Beverages'],
	};

	return map[anchor_category];
};

const getItem = (menu, category) => {
	// returns the item_id of a random item from the given category
	const items = menu.filter((item) => item.item_category === category);
	if (!items.length) return null;
	return items[Math.floor(Math.random() * items.length)];
};

const getMaxDiscount = async () => {
	// fetches the maximum discount from the API
	const url = 'https://flavify-dev.azurewebsites.net/api/v1/admin/getmaxdiscount';
	let maxDiscount = 0;

	await fetch(url)
		.then((response) => response.json())
		.then((data) => {
			maxDiscount = data.max_discount;
		})
		.catch((error) => {
			console.error('Error:', error);
		});
	return maxDiscount;
};

const calculateDiscount = (item1, item2, maxDiscount) => {
	// returns the discount amount for the given pair of items based on their flavify_category
	const mp = { Stars: 0.15, Horses: 0.5, Puzzles: 0.75, Dogs: 0.9, NA: 0 };
	const discount =
		item1.price * mp[item1.flavify_category] * maxDiscount +
		item2.price * mp[item2.flavify_category] * maxDiscount;
	return Math.floor(discount);
};

const predictMenu = async (menu, cart, diet, anchor, refreshFlag = false) => {
	// anchor => {
	//   item_id: 'item_001',
	//   item_category: 'Starters',
	//   flavify_category: 'Dogs',
	//   price: 100
	// }

	// filter out unavailable items, alcohol, combo items and the ANCHOR ITEM from menu
	menu = menu.items;
	const menu_na = menu.filter((item) => item.flavify_category === 'NA');
	menu = menu.filter(
		(item) =>
			item.is_available &&
			item.item_id !== anchor.item_id &&
			item.item_subcategory !== 'Alcoholic' &&
			item.item_subcategory !== 'Combos' &&
			item.flavify_category !== 'NA'
	);

	const menu_universe_diet = getMenuUniverseDiet(menu, diet, refreshFlag);
	const menu_universe_flavCat = getMenuUniverseFlavCat(menu_universe_diet);
	const menu_universe_cart = getMenuUniverseCart(menu_universe_flavCat, cart);

	const categoriesToRecommend = getCategoriesToRecommend(anchor.item_category);

	const recommendedItems = categoriesToRecommend.map((category) => {
		let item = getItem(menu_universe_cart, category);
		if (!item) item = getItem(menu_universe_flavCat, category);

		return item;
	});

	if (anchor.item_category === 'Beverages') {
		let quickBites = getQuickBites(menu_universe_cart);
		if (!quickBites.length) quickBites = getQuickBites(menu_universe_flavCat);
		if (!quickBites.length) quickBites = getQuickBites(menu_na);
		if (quickBites.length > 0)
			recommendedItems.push(quickBites[Math.floor(Math.random() * quickBites.length)]);
	}

	const maxDiscount = await getMaxDiscount();

	const recommendations = recommendedItems
		.filter((item) => item)
		.map((item) => {
			let recommendation = {};
			recommendation.items = [anchor.item_id, item.item_id];
			recommendation.price = anchor.price + item.price;
			recommendation.discount = calculateDiscount(item, anchor, maxDiscount);

			return recommendation;
		});

	return recommendations;
};

// TESTING CODE
// const menuJSON = await import('./menu.json', { assert: { type: 'json' } });
// const menu = menuJSON.default;
// const cartJSON = await import('./testCarts/cartH.json', { assert: { type: 'json' } });
// const cart = cartJSON.default.items;
// const prediction = await predictMenu(menu, cart, 'N', {
// 	item_id: 'item_001',
// 	item_category: 'Beverages',
// 	flavify_category: 'Puzzles',
// 	price: 100,
// });
// console.log('prediction: ', prediction);

export default predictMenu;
