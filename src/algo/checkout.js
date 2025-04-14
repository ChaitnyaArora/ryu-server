import recommendation1 from './checkout1.js';
import recommendation2 from './checkout2.js';

const getMenuUniverseDiet = (menu, diet) => {
	// filter the menu on basis of diet, alchohol, and combos
	const menu_universe_diet = menu.filter((item) => {
		if (diet === 'E') {
			return item.diet === 'E' || item.diet === 'V';
		} else if (diet === 'V') {
			return item.diet === 'V';
		} else {
			return (
				item.item_category === 'Desserts' ||
				item.item_category === 'Beverages' ||
				item.diet === diet
			);
		}
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

const predictCheckout = (menu, pax, cart, diet) => {
	menu = menu.items;

	// filter out unavailable items, alcohol, combo items and the ANCHOR ITEM from menu
	const menu_universe_available = menu.filter(
		(item) =>
			item.item_subcategory !== 'Combos' &&
			item.item_subcategory !== 'Alcoholic' &&
			item.is_available
	);

	const menu_universe_diet = getMenuUniverseDiet(menu_universe_available, diet);
	const menu_universe_cart = getMenuUniverseCart(menu_universe_diet, cart);

	const prediction1 = recommendation1(menu_universe_diet, menu_universe_cart);
	const prediction2 = recommendation2(pax, cart, menu_universe_cart, 3);
	// console.log(prediction1);
	// prediction2.forEach((item_id) => {
	// 	console.log(menu_universe_diet.find((item) => item.item_id === item_id));
	// });
	return [...prediction1.map((item) => item.item_id), ...prediction2]; // convert prediction1 items to item_id
};
const menuJSON = await import('./menu.json', { assert: { type: 'json' } });
const menu = menuJSON.default;

// const cartJSON = await import("./testCarts/cartA.json", { assert: { type: "json" } });
// const cartJSON = await import('./testCarts/cartB.json', { assert: { type: 'json' } });
const cartJSON = await import('./testCarts/cartC.json', { assert: { type: 'json' } });
// const cartJSON = await import("./testCarts/cartD.json", { assert: { type: "json" } });
// const cartJSON = await import("./testCarts/cartE.json", { assert: { type: "json" } });
// const cartJSON = await import("./testCarts/cartF.json", { assert: { type: "json" } });
// const cartJSON = await import("./testCarts/cartG.json", { assert: { type: "json" } });
// const cartJSON = await import("./testCarts/cartH.json", { assert: { type: "json" } });
// const cartJSON = await import("./testCarts/cartI.json", { assert: { type: "json" } });
// const cartJSON = await import("./testCarts/cartJ.json", { assert: { type: "json" } });
// const cartJSON = await import("./testCarts/cartK.json", { assert: { type: "json" } });
// const cartJSON = await import("./testCarts/cartL.json", { assert: { type: "json" } });
const cart = cartJSON.default.items;

const prediction = predictCheckout(menu, 3, cart, 'V');
console.log('prediction: ', prediction);

export default predictCheckout;
