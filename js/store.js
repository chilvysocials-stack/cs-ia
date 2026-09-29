/*
 * Sathi Café — menu data store.
 *
 * Front-end only: the menu lives in localStorage so changes made in the
 * admin panel show up on the customer menu in the same browser. In the full
 * system this file is the part that would be replaced by calls to the
 * MySQL-backed API.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "sathi-cafe-menu-v1";

  var CATEGORIES = [
    {
      id: "drinks",
      navLabel: "Drinks",
      label: "Drinks",
      shortLabel: "Drinks",
      heading: "Drinks",
      subcategories: ["Hot Beverage", "Iced Coffee", "Smoothies", "Lassi", "Thick Shakes", "Refreshers"],
    },
    {
      id: "breakfast",
      navLabel: "Breakfast",
      label: "Breakfast & Brunch",
      shortLabel: "Breakfast",
      heading: "Breakfast items",
      subcategories: ["Eggs", "Pancakes", "Toast", "Parathas", "Continental", "Nepali"],
    },
    {
      id: "momo",
      navLabel: "Momo",
      label: "Momo & Noodles",
      shortLabel: "Momo & noodles",
      heading: "Momo & Noodle items",
      subcategories: ["Chicken Momo", "Veg Momo", "Jhol Momo", "Chow Mein", "Thukpa", "Pan Fried"],
    },
    {
      id: "mains",
      navLabel: "Mains",
      label: "Mains",
      shortLabel: "Mains",
      heading: "Main courses",
      subcategories: ["Chicken", "Mutton", "Fish", "Vegetarian", "Rice", "Dal"],
    },
    {
      id: "special",
      navLabel: "Special",
      label: "Sathi Special",
      shortLabel: "Sathi Special",
      heading: "Sathi Specials",
      subcategories: ["Chef's Pick", "Seasonal", "Signature", "House Special", "Weekend", "New"],
    },
  ];

  // [name, description, price, category, subcategory, type, popular]
  var SEED = [
    ["Lassi", "Thick chilled yogurt drink, sweet or salted", 950, "drinks", "Lassi", "veg", true],
    ["Masala Chai", "Spiced tea with ginger, cardamom and cloves", 250, "drinks", "Hot Beverage", "veg", true],
    ["Mango Smoothie", "Fresh mango blended with milk and honey", 750, "drinks", "Smoothies", "veg"],
    ["Iced Americano", "Double-shot espresso poured over ice", 350, "drinks", "Iced Coffee", "veg"],
    ["Fresh Lime Soda", "Refreshing lime soda, sweet or salted", 300, "drinks", "Refreshers", "veg"],
    ["Hot Chocolate", "Rich cocoa with steamed milk and cream", 400, "drinks", "Hot Beverage", "veg"],
    ["Banana Shake", "Creamy banana shake with vanilla ice cream", 550, "drinks", "Thick Shakes", "veg"],
    ["Mint Refresher", "Fresh mint cooler with lime and soda water", 350, "drinks", "Refreshers", "veg"],

    ["Aloo Paratha", "Stuffed flatbread with spiced potato filling", 450, "breakfast", "Parathas", "veg", true],
    ["Egg Benedict", "Poached eggs on toast with hollandaise sauce", 650, "breakfast", "Eggs", "nonveg"],
    ["Pancake Stack", "Fluffy pancakes with maple syrup and butter", 500, "breakfast", "Pancakes", "veg", true],
    ["French Toast", "Golden toast with cinnamon and fresh berries", 400, "breakfast", "Toast", "nonveg"],
    ["Nepali Breakfast", "Dal bhat with pickles and seasonal greens", 350, "breakfast", "Nepali", "veg"],
    ["Omelette Platter", "Three-egg omelette with cheese and herbs", 400, "breakfast", "Eggs", "nonveg"],
    ["Granola Bowl", "Crunchy granola with yogurt and fresh fruits", 500, "breakfast", "Continental", "veg"],
    ["Croissant Plate", "Butter croissant with jam and cream cheese", 350, "breakfast", "Continental", "veg"],

    ["Chicken Momo", "Steamed dumplings with spiced chicken filling", 550, "momo", "Chicken Momo", "nonveg", true],
    ["Veg Momo", "Steamed dumplings with mixed vegetable filling", 450, "momo", "Veg Momo", "veg"],
    ["Jhol Momo", "Dumplings in spicy sesame-tomato soup broth", 600, "momo", "Jhol Momo", "nonveg"],
    ["Chow Mein", "Stir-fried noodles with vegetables and soy sauce", 400, "momo", "Chow Mein", "veg", true],
    ["Thukpa", "Tibetan noodle soup with vegetables and spices", 500, "momo", "Thukpa", "veg"],
    ["Pan Fried Momo", "Crispy fried dumplings with tangy dipping sauce", 600, "momo", "Pan Fried", "nonveg"],
    ["Buff Momo", "Traditional buffalo meat steamed dumplings", 500, "momo", "Buff Momo", "nonveg"],
    ["Chili Momo", "Spicy stir-fried momo with bell peppers", 550, "momo", "Pan Fried", "nonveg"],

    ["Grilled Chicken", "Marinated chicken grilled over charcoal fire", 850, "mains", "Chicken", "nonveg", true],
    ["Mutton Curry", "Slow-cooked mutton in aromatic Nepali spices", 950, "mains", "Mutton", "nonveg"],
    ["Fish Fry", "Crispy fried river fish with tartar sauce", 750, "mains", "Fish", "nonveg"],
    ["Dal Bhat Set", "Traditional Nepali thali with all the fixings", 550, "mains", "Dal", "veg"],
    ["Paneer Tikka", "Grilled cottage cheese with mint chutney", 600, "mains", "Vegetarian", "veg"],
    ["Chicken Biryani", "Fragrant rice with tender spiced chicken", 700, "mains", "Rice", "nonveg"],
    ["Mushroom Curry", "Wild mushrooms in creamy aromatic gravy", 500, "mains", "Vegetarian", "veg"],
    ["Lamb Chops", "Herb-crusted lamb chops with seasonal sides", 1100, "mains", "Mutton", "nonveg"],

    ["Sathi Thali", "Chef's special platter with dal, rice, and sides", 1200, "special", "Chef's Pick", "veg", true],
    ["Himalayan Trout", "Fresh river trout with herb butter sauce", 1100, "special", "Seasonal", "nonveg"],
    ["Sekuwa Platter", "Nepali-style BBQ with assorted three meats", 1300, "special", "Signature", "nonveg"],
    ["Royal Biryani", "Premium saffron biryani with tender lamb", 1000, "special", "House Special", "nonveg"],
    ["Newari Feast", "Traditional Newari delicacy sampler platter", 1500, "special", "Weekend", "nonveg"],
    ["Garden Bowl", "Seasonal vegetables with quinoa and dressing", 650, "special", "Seasonal", "veg"],
    ["Tandoori Grill", "Assorted tandoori meats with paneer tikka", 1200, "special", "Signature", "nonveg"],
    ["Dessert Trio", "Three signature desserts of the day by chef", 550, "special", "New", "veg"],
  ];

  function seedItems() {
    return SEED.map(function (row, index) {
      return {
        id: index + 1,
        name: row[0],
        description: row[1],
        price: row[2],
        category: row[3],
        subcategory: row[4],
        type: row[5],
        popular: Boolean(row[6]),
        inStock: true,
        active: true,
      };
    });
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {
      // Storage unavailable or corrupt: fall back to the seed menu.
    }
    return seedItems();
  }

  function save(items) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  var items = load();

  // Undo history: a stack of earlier versions of the menu (newest on top).
  var history = [];
  var HISTORY_LIMIT = 20;

  function remember() {
    history.push(JSON.stringify(items));
    if (history.length > HISTORY_LIMIT) history.shift(); // drop the oldest
  }

  function nextId() {
    return items.reduce(function (max, item) {
      return Math.max(max, item.id);
    }, 0) + 1;
  }

  window.SathiStore = {
    categories: CATEGORIES,

    getCategory: function (id) {
      return CATEGORIES.find(function (c) {
        return c.id === id;
      });
    },

    all: function () {
      return items.slice();
    },

    get: function (id) {
      return items.find(function (item) {
        return item.id === id;
      });
    },

    create: function (data) {
      remember();
      var item = Object.assign({ id: nextId(), popular: false, subcategory: "" }, data);
      items.push(item);
      save(items);
      return item;
    },

    update: function (id, changes) {
      var item = this.get(id);
      if (!item) return null;
      remember();
      Object.assign(item, changes);
      save(items);
      return item;
    },

    remove: function (id) {
      remember();
      items = items.filter(function (item) {
        return item.id !== id;
      });
      save(items);
    },

    // Replace the whole menu (CSV import). New ids are given out in order.
    replaceAll: function (newItems) {
      remember();
      items = newItems.map(function (item, index) {
        return Object.assign({}, item, { id: index + 1 });
      });
      save(items);
    },

    canUndo: function () {
      return history.length > 0;
    },

    undo: function () {
      if (!history.length) return false;
      items = JSON.parse(history.pop());
      save(items);
      return true;
    },
  };
})();
