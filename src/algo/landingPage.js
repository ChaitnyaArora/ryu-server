import getMaxDiscount from '../utils/getMaxDiscount.js';

const getItemHelper = (menu, category, flav_category, recommendedItems) => {
	// get item based on category and flavify_category

	// find the first item that matches the category and flavify_category and hasn't been recommended yet
	for (let i = 0; i < menu.length; i++) {
		if (
			menu[i].item_category === category &&
			menu[i].flavify_category === flav_category &&
			!recommendedItems.includes(menu[i].item_id)
		) {
			recommendedItems.push(menu[i].item_id);
			return menu[i];
		}
	}

	// if nothing recommended, then remove already included constraint
	for (let i = 0; i < menu.length; i++) {
		if (
			menu[i].item_category === category &&
			menu[i].flavify_category === flav_category
		) {
			return menu[i];
		}
	}

	// if nothing found, returning null so that another category may be tried
	return null;
};

const getItem = (menu, category, flav_category, recommendedItems) => {
	// get item based on category and flavify_category
	// if no item found in that category and flavify_category, then choose the following priorities:
	// Dogs > Horses > Puzzles > Stars

	let response = getItemHelper(menu, category, flav_category, recommendedItems);
	// console.log("flav_cat: ", response);
	if (response) {
		return response;
	}
	response = getItemHelper(menu, category, 'Dogs', recommendedItems);
	// console.log("dogs: ", response);
	if (response) {
		return response;
	}
	response = getItemHelper(menu, category, 'Horses', recommendedItems);
	// console.log("Horses: ", response);
	if (response) {
		return response;
	}
	response = getItemHelper(menu, category, 'Puzzles', recommendedItems);
	// console.log("puzzles: ", response);
	if (response) {
		return response;
	}
	response = getItemHelper(menu, category, 'Stars', recommendedItems);
	// console.log("stars: ", response);
	if (response) {
		return response;
	}
};

const filterBasedOnFlavifyCategory = (
	category,
	shuffledArray,
	recommendedItems,
	noOfItemsToRecommend = 1
) => {
	// filters the shuffled array based on flavify_category and returns the first
	// 'noOfItemsToRecommend' items. If not enough items are found with flavify_category as
	// "Horses" or "Stars", then return the other items while making sure that they're not repeated

	// NOTE: If shuffledArray.length < noOfItemsToRecommend, then the number of recommendations
	// will be less than required (obviously)
	// shuffledArray = shuffledArray.sort(() => Math.random() - 0.5);

	// CHOICE OF ALGORITHM:
	// Shuffling at every call is O(nlogn).
	// 'Storing those already recommened' algorithm is run thrice in O(n).

	// choosing to run the algorithm thrice in the worst case is till better than randomizing the
	// menu everytime because of the following hypothesis:
	// Considering a menu size of 300, relative speedup of O(n) (for loops) over O(nlogn) (randomizing)
	// is 2.48

	// Since, in the average scenario, at least 50% of the time, the algorithm will only run for 1
	// loop. Let's consider the other 50% of the time, the algorithm runs for 3 loops (worst case).
	// 0.5 * 1 + 0.5 * 3 = 2

	// Therefore, there is still a speedup of 22.32% in the worst case.

	let recommendations = [];
	for (let i = 0; i < shuffledArray.length; i++) {
		if (
			shuffledArray[i].item_category === category &&
			(shuffledArray[i].flavify_category === 'Horses' ||
				shuffledArray[i].flavify_category === 'Stars') &&
			!recommendedItems.includes(shuffledArray[i].item_id)
		) {
			recommendedItems.push(shuffledArray[i].item_id);
			recommendations.push(shuffledArray[i]);
			if (recommendations.length === noOfItemsToRecommend) {
				return recommendations;
			}
		}
	}
	for (let i = 0; i < shuffledArray.length; i++) {
		if (
			shuffledArray[i].item_category === category &&
			(shuffledArray[i].flavify_category === 'Horses' ||
				shuffledArray[i].flavify_category === 'Stars')
		) {
			recommendedItems.push(shuffledArray[i].item_id);
			recommendations.push(shuffledArray[i]);
			if (recommendations.length === noOfItemsToRecommend) {
				return recommendations;
			}
		}
	}
	for (let i = 0; i < shuffledArray.length; i++) {
		if (
			shuffledArray[i].item_category === category &&
			shuffledArray[i].flavify_category === 'Puzzles' &&
			!recommendedItems.includes(shuffledArray[i].item_id)
		) {
			recommendedItems.push(shuffledArray[i].item_id);
			recommendations.push(shuffledArray[i]);
			if (recommendations.length === noOfItemsToRecommend) {
				return recommendations;
			}
		}
	}
	for (let i = 0; i < shuffledArray.length; i++) {
		if (
			shuffledArray[i].item_category === category &&
			shuffledArray[i].flavify_category === 'Puzzles'
		) {
			recommendations.push(shuffledArray[i]);
			if (recommendations.length === noOfItemsToRecommend) {
				return recommendations;
			}
		}
	}
	for (let i = 0; i < shuffledArray.length; i++) {
		if (
			shuffledArray[i].item_category === category &&
			(shuffledArray[i].flavify_category === 'NA' ||
				shuffledArray[i].flavify_category === 'Dogs') &&
			!recommendedItems.includes(shuffledArray[i].item_id)
		) {
			recommendedItems.push(shuffledArray[i].item_id);
			recommendations.push(shuffledArray[i]);
			if (recommendations.length === noOfItemsToRecommend) {
				return recommendations;
			}
		}
	}
	for (let i = 0; i < shuffledArray.length; i++) {
		if (
			shuffledArray[i].item_category === category &&
			(shuffledArray[i].flavify_category === 'NA' ||
				shuffledArray[i].flavify_category === 'Dogs')
		) {
			recommendations.push(shuffledArray[i]);
			if (recommendations.length === noOfItemsToRecommend) {
				return recommendations;
			}
		}
	}
	return recommendations;
};

const calculateDiscount = (items, maxDiscount) => {
	// calculate discount for each combo
	let discount = 0;
	const mp = { Stars: 0.15, Horses: 0.5, Puzzles: 0.75, Dogs: 0.9, NA: 0 };
	items.forEach((item) => {
		if (!item) return;
		discount += mp[item.flavify_category] * maxDiscount * item.price;
	});
	return Math.floor(discount);
};

const calculateTotal = (items) => {
	// calculate total for each combo
	let total = 0;
	items.forEach((item) => {
		if (item) total += item.price;
	});
	return total;
};

const getCombo1 = (menu, recommendedItems, maxDiscount) => {
	const item = {};
	const item1 = getItem(menu, 'Starters', 'Horses', recommendedItems);
	const item2 = getItem(menu, 'Starters', 'Puzzles', recommendedItems);
	const item3 = filterBasedOnFlavifyCategory('Beverages', menu, recommendedItems, 1)[0];
	const items = [item1, item2, item3];

	item.items = [item1?.item_id, item2?.item_id, item3?.item_id];
	item.discount = calculateDiscount(items, maxDiscount);
	item.total = calculateTotal(items);

	return item;
};

const getCombo2 = (menu, recommendedItems, maxDiscount) => {
	const item = {};
	const item1 = getItem(menu, 'Starters', 'Horses', recommendedItems);
	const item2 = getItem(menu, 'Starters', 'Dogs', recommendedItems);
	const item3 = filterBasedOnFlavifyCategory('Beverages', menu, recommendedItems, 1)[0];
	const items = [item1, item2, item3];
	item.items = [item1?.item_id, item2?.item_id, item3?.item_id];
	item.discount = calculateDiscount(items, maxDiscount);
	item.total = calculateTotal(items);

	return item;
};

const getCombo3 = (menu, recommendedItems, maxDiscount) => {
	const item = {};
	const item1 = getItem(menu, 'Main Course', 'Horses', recommendedItems);
	const item2 = getItem(menu, 'Starters', 'Puzzles', recommendedItems);
	const item3 = filterBasedOnFlavifyCategory('Beverages', menu, recommendedItems, 1)[0];
	const items = [item1, item2, item3];

	item.items = [item1?.item_id, item2?.item_id, item3?.item_id];
	item.discount = calculateDiscount(items, maxDiscount);
	item.total = calculateTotal(items);

	return item;
};

const getCombo4 = (menu, recommendedItems, maxDiscount) => {
	const item = {};
	const item1 = getItem(menu, 'Main Course', 'Horses', recommendedItems);
	const item2 = getItem(menu, 'Starters', 'Dogs', recommendedItems);
	const item3 = filterBasedOnFlavifyCategory('Beverages', menu, recommendedItems, 1)[0];
	const items = [item1, item2, item3];

	item.items = [item1?.item_id, item2?.item_id, item3?.item_id];
	item.discount = calculateDiscount(items, maxDiscount);
	item.total = calculateTotal(items);

	return item;
};

const getCombo5 = (menu, recommendedItems, maxDiscount) => {
	const item = {};
	const item1 = getItem(menu, 'Main Course', 'Horses', recommendedItems);
	const item2 = getItem(menu, 'Main Course', 'Puzzles', recommendedItems);
	const item3 = filterBasedOnFlavifyCategory('Desserts', menu, recommendedItems, 1)[0];
	const item4 = filterBasedOnFlavifyCategory('Beverages', menu, recommendedItems, 1)[0];
	const items = [item1, item2, item3, item4];

	item.items = [item1?.item_id, item2?.item_id, item3?.item_id, item4?.item_id];
	item.discount = calculateDiscount(items, maxDiscount);
	item.total = calculateTotal(items);

	return item;
};

const getCombo6 = (menu, recommendedItems, maxDiscount) => {
	const item = {};
	const item1 = getItem(menu, 'Main Course', 'Horses', recommendedItems);
	const item2 = getItem(menu, 'Main Course', 'Dogs', recommendedItems);
	const item3 = filterBasedOnFlavifyCategory('Desserts', menu, recommendedItems, 1)[0];
	const item4 = filterBasedOnFlavifyCategory('Beverages', menu, recommendedItems, 1)[0];
	const items = [item1, item2, item3, item4];

	item.items = [item1?.item_id, item2?.item_id, item3?.item_id, item4?.item_id];
	item.discount = calculateDiscount(items, maxDiscount);
	item.total = calculateTotal(items);

	return item;
};

const predictLandingPage = async (menu) => {
	// retreive maxDiscount from maxDiscount.json
	const maxDiscount = await getMaxDiscount();
	// console.log('maxDiscount; ', maxDiscount);

	// filter out Unavailable, Combos & Alcoholic items
	menu = menu.items;
	// console.log('menu: ', menu.slice(0, 2));
	const menu_universe_available = menu.filter(
		(item) =>
			item.item_subcategory !== 'Combos' &&
			item.item_subcategory !== 'Alcoholic' &&
			item.is_available &&
			item.flav_category !== 'NA'
	);
	const shuffledMenu = menu_universe_available.sort(() => Math.random() - 0.5);
	const finalRecommendations = {};

	['V'].forEach((diet) => {
		const recommendations = [];
		const recommendedItems = [];
		let menu_universe_diet = [];
		// if (diet === 'E') {
		// 	menu_universe_diet = shuffledMenu.filter(
		// 		(item) => item.diet === 'V' || item.diet === diet
		// 	);
		// } else if (diet === 'V') {
			menu_universe_diet = shuffledMenu.filter((item) => item.diet === diet);
		// } else {
		// 	menu_universe_diet = shuffledMenu.filter(
		// 		(item) =>
		// 			item.item_category === 'Desserts' ||
		// 			item.item_category === 'Beverages' ||
		// 			item.diet === diet
		// 	);
		// }

		recommendations.push(getCombo1(menu_universe_diet, recommendedItems, maxDiscount));
		recommendations.push(getCombo2(menu_universe_diet, recommendedItems, maxDiscount));
		recommendations.push(getCombo3(menu_universe_diet, recommendedItems, maxDiscount));
		recommendations.push(getCombo4(menu_universe_diet, recommendedItems, maxDiscount));
		recommendations.push(getCombo5(menu_universe_diet, recommendedItems, maxDiscount));
		recommendations.push(getCombo6(menu_universe_diet, recommendedItems, maxDiscount));

		finalRecommendations[diet] = recommendations;
	});

	// console.log(finalRecommendations.V);
	// console.log(finalRecommendations.E);
	// console.log(finalRecommendations.N);
	return finalRecommendations;
};

// const predict = (menu) => {
// 	const recommendations = predictLandingPage(menu, 0.2);
// console.log(recommendations);
// };

// const menuJSON = await import('./menu.json', { assert: { type: 'json' } });
// const menu = menuJSON.default;
// predict(menu);

export default predictLandingPage;
