import supabase from '../db/supaConn.js';

const fetchData = async (table) => {
  const { data, error } = await supabase.from(table).select();
  if (error) {
    throw new Error(`Error fetching data from ${table}: ${error.message}`);
  }
  return data;
};

const fetchMenuData = async () => {
  try {
    const items = await fetchData(process.env.SUPABASE_ITEMS);
    const addOns = await fetchData(process.env.SUPABASE_ADDONS);
    const options = await fetchData(process.env.SUPABASE_OPTIONS);
    const itemOptions = await fetchData(process.env.SUPABASE_OPTIONITEMS);
    const itemAddOns = await fetchData(process.env.SUPABASE_ADDONITEMS);
    const tags = await fetchData(process.env.SUPABASE_TAGS);
    const itemTags = await fetchData(process.env.SUPABASE_TAGSITEM);
    const optionTags = await fetchData(process.env.SUPABASE_TAGSOPTION);
    const addonTags = await fetchData(process.env.SUPABASE_TAGSADDON);
    const itemAddOnsOptions = await fetchData(process.env.SUPABASE_ITEMSADDONSOPTIONS);
    const itemOptionsSize = await fetchData(process.env.SUPABASE_ITEMSOPTIONSIZE);

    const menuData = {
      items,
      addOns,
      options,
      itemOptions,
      itemAddOns,
      tags,
      itemTags,
      optionTags,
      addonTags,
      itemAddOnsOptions,
      itemOptionsSize
    };
    return menuData;
  } catch (error) {
    throw error;
  }
};
export default fetchMenuData;
