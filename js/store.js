/*
 * Sathi Café — menu data, loaded from and saved to the MySQL database
 * through api/api.php. Reads come from a local copy (`items`); every change
 * is sent to the server and the copy is then reloaded.
 */
(function () {
  "use strict";

  // api/api.php, worked out from where this script lives (works from / and /admin/).
  var API = new URL("../api/api.php", document.currentScript.src).href;

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

  // Call the server: GET for reads, POST with a JSON body for changes.
  async function api(action, body) {
    var options = body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
    var response, data;
    try {
      response = await fetch(API + "?action=" + action, options);
      data = await response.json();
    } catch (err) {
      throw new Error("Can't reach the server. Is XAMPP (Apache and MySQL) running?");
    }
    if (!response.ok) throw new Error(data.error);
    return data;
  }

  var items = [];
  var loadAction = "list"; // "all" in the admin panel, which also sees hidden items

  // Undo history: a stack of earlier versions of the menu (newest on top).
  var history = [];
  var HISTORY_LIMIT = 20;

  // Send one change, remember the menu as it was before, then reload it.
  async function change(action, body) {
    var before = items;
    var result = await api(action, body);
    history.push(before);
    if (history.length > HISTORY_LIMIT) history.shift(); // drop the oldest
    items = await api(loadAction);
    return result;
  }

  window.SathiStore = {
    api: api,
    categories: CATEGORIES,

    getCategory: function (id) {
      return CATEGORIES.find(function (c) {
        return c.id === id;
      });
    },

    load: async function (includeHidden) {
      loadAction = includeHidden ? "all" : "list";
      items = await api(loadAction);
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
      return change("create", data); // resolves to { id }
    },

    update: function (id, changes) {
      return change("update", Object.assign({}, this.get(id), changes));
    },

    remove: function (id) {
      return change("delete", { id: id });
    },

    // Replace the whole menu (CSV import).
    replaceAll: function (newItems) {
      return change("replace", { items: newItems, reason: "import" });
    },

    // Raise or lower prices by a percentage ("all" or one category id).
    adjustPrices: function (category, percent) {
      return change("adjust_prices", { category: category, percent: percent }); // resolves to { changed }
    },

    stats: function () {
      return api("stats");
    },

    activity: function () {
      return api("activity");
    },

    canUndo: function () {
      return history.length > 0;
    },

    undo: async function () {
      if (!history.length) return false;
      await api("replace", { items: history[history.length - 1], reason: "undo" });
      history.pop(); // only forget it once the server has restored it
      items = await api(loadAction);
      return true;
    },
  };
})();
