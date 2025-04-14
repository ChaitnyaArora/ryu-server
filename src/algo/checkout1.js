// import cache from "../utils/cache.js";
// const menuJSON = await import("./menu.json", { assert: { type: "json" } });

// Fisher-Yates Shuffle Implementation
// completely unbiased method of shuffling an array.
// NOTE: the method I used initially (sort(() => 0.5 - Math.random())) is biased in the sense that
// it is unpredictable and therefore cannot be proved to be unbiased. However, it's unpredictability
// imo makes it more random than a uniform random method like the one given below.
function shuffleArrayFisherYates(array) {
	for (let i = array.length - 1; i > 0; i--) {
		// Generate a random index from 0 to i
		const j = Math.floor(Math.random() * (i + 1));
		// Swap elements at indices i and j
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

const getMenuUniverseDiet = (diet) => {
	// WORKING
	// what if there is no cache present ?
	// wouldn't happen since GET/menu call will automatically create the cache

	const menu = menuJSON.default.items;

	// filter the menu on basis of diet, alchohol, and combos
	const menu_universe_diet = menu.filter((item) => {
		return (
			item.diet === diet &&
			item.item_subcategory !== 'Alcoholic' &&
			item.item_subcategory !== 'Combos'
		);
	});

	return menu_universe_diet;
};

const getMenuUniverseCart = (menu_universe_diet, cart) => {
	// make note of the items in the cart by their item_id's
	const itemIds = cart.map((item) => item.item_id);
	// only include those items in menu_universe_cart which are not present in the cart
	const menu_universe_cart = menu_universe_diet.filter((item) => {
		return !itemIds.includes(item.item_id);
	});

	return menu_universe_cart;
};

const ifDessert = (menu_universe_cart) => {
	// check if dessert is present in the menu
	// if present, return true
	for (let i = 0; i < menu_universe_cart.length; i++) {
		if (menu_universe_cart[i].item_category === 'Desserts') {
			console.log('Returning TRUE from ifDessert');
			return true;
		}
	}
	return false;
};

const getLeftOverBeverages = (menu) => {
	// get all the beverages from the menu
	const leftOverBeverages = menu.filter((item) => {
		return item.item_category === 'Beverages';
	});
	return leftOverBeverages;
};

const getBeveragesAndDesserts = (menu) => {
	// get all the beverages and desserts from the menu
	const beverages = getLeftOverBeverages(menu);

	const desserts = menu.filter((item) => {
		return item.item_category === 'Desserts';
	});

	return [beverages, desserts];
};

const filterBasedOnFlavifyCategory = (shuffledArray, noOfItemsToRecommend = 1) => {
	// filters the shuffled array based on flavify_category and returns the first
	// 'noOfItemsToRecommend' items. If not enough items are found with flavify_category as
	// "Horses" or "Stars", then return the other items while making sure that they're not repeated

	// NOTE: If shuffledArray.length < noOfItemsToRecommend, then the number of recommendations
	// will be less than required (obviously)

	let recommendations = [];
	for (let i = 0; i < shuffledArray.length; i++) {
		if (
			shuffledArray[i].flavify_category === 'Horses' ||
			shuffledArray[i].flavify_category === 'Stars'
		) {
			recommendations.push(shuffledArray[i]);
			if (recommendations.length === noOfItemsToRecommend) {
				return recommendations;
			}
		}
	}
	for (let i = 0; i < shuffledArray.length; i++) {
		if (
			shuffledArray[i].flavify_category !== 'Horses' ||
			shuffledArray[i].flavify_category !== 'Stars'
		) {
			recommendations.push(shuffledArray[i]);
			if (recommendations.length === noOfItemsToRecommend) {
				return recommendations;
			}
		}
	}
	return recommendations;
};

const recommendation1 = (menu_universe_diet, menu_universe_cart) => {
	// WORKING
	// recommendation 1: if dessert is present, recommend 1 dessert & 1 beverage else recommend 2 beverages
	if (ifDessert(menu_universe_cart)) {
		// recommend 1 dessert and 1 beverage // WORKING
		const [beverages, desserts] = getBeveragesAndDesserts(menu_universe_cart);
		let recommendedBeverage = {};
		let recommendedDessert = {};

		// recommend 1 dessert
		const shuffledDesserts = desserts.sort(() => 0.5 - Math.random());
		recommendedDessert = filterBasedOnFlavifyCategory(shuffledDesserts, 1);

		if (beverages.length > 0) {
			// shuffle the beverages (from menu_universe_cart) and filter based on flavify_category
			const shuffledBevs = beverages.sort(() => 0.5 - Math.random());
			recommendedBeverage = filterBasedOnFlavifyCategory(shuffledBevs, 1);
		} else {
			// if no beverages returned from menu_universe_cart, recommend a beverage from
			// menu_universe_diet based on flavify_category
			const BeveragesFromDiet = getLeftOverBeverages(menu_universe_diet);
			const shuffledBevs = BeveragesFromDiet.sort(() => 0.5 - Math.random());
			recommendedBeverage = filterBasedOnFlavifyCategory(shuffledBevs, 1);
		}

		return [recommendedBeverage[0], recommendedDessert[0]];
	}

	// ELSE recommend 2 beverages
	const leftOverBeveragesCart = getLeftOverBeverages(menu_universe_cart);

	if (leftOverBeveragesCart.length >= 2) {
		// recommend 2 beverages
		let shuffled = leftOverBeveragesCart.sort(() => 0.5 - Math.random());
		return filterBasedOnFlavifyCategory(shuffled, 2);
	}
	const leftOverBeveragesDiet = getLeftOverBeverages(menu_universe_diet);

	if (leftOverBeveragesCart.length === 1) {
		// recommend 1 beverage from leftOverBeveragesCart and 1 other from leftOverBeveragesDiet
		let recommendedBevs = [];
		// No need to add flavify category filter here since we only have 1 item in the menu_universe_cart
		recommendedBevs.push(leftOverBeveragesCart[0]);
		let shuffled = leftOverBeveragesDiet.sort(() => 0.5 - Math.random());

		// remove the recommended beverage from the shuffled array
		shuffled = shuffled.filter((e) => e !== recommendedBevs[0]);

		recommendedBevs.push(filterBasedOnFlavifyCategory(shuffled, 1)[0]);
		return recommendedBevs;
	}

	// ELSE recommend 2 beverages from leftOverBeveragesDiet
	let shuffled = leftOverBeveragesDiet.sort(() => 0.5 - Math.random());
	return filterBasedOnFlavifyCategory(shuffled, 2);
};

const predict = (pax, diet, cart) => {
	// console.log("cart: ", cart);

	const menu_universe_diet = getMenuUniverseDiet(diet);
	const menu_universe_cart = getMenuUniverseCart(menu_universe_diet, cart);

	const recommendation1Output = recommendation1(menu_universe_diet, menu_universe_cart);
	console.log('recommendation1Output: ', recommendation1Output);
};

// const cartJSON = await import("./testCarts/cart1.json", { assert: { type: "json" } });
// const cartJSON = await import("./testCarts/cart2.json", { assert: { type: "json" } });
// const cartJSON = await import("./testCarts/cart3.json", { assert: { type: "json" } });
// const cartJSON = await import("./testCarts/cart4.json", { assert: { type: "json" } });
// const cartJSON = await import("./testCarts/cart5.json", { assert: { type: "json" } });
// const cartJSON = await import("./testCarts/cart6.json", { assert: { type: "json" } });
// const cart = cartJSON.default.items;
// predict(2, "V", cart);

export default recommendation1;
