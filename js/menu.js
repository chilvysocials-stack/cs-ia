/* Customer menu: category chips, sub-category filter and search. */
(function () {
  "use strict";

  var store = window.SathiStore;

  var state = {
    category: "all", // "all" or a category id
    filter: null, // sub-category name, or (under "all") a category id / "popular"
    query: "",
  };

  var els = {
    body: document.body,
    chips: document.getElementById("chips"),
    subnavList: document.getElementById("subnav-list"),
    grid: document.getElementById("card-grid"),
    empty: document.getElementById("empty"),
    titleDesktop: document.getElementById("title-desktop"),
    titleMobile: document.getElementById("title-mobile"),
    input: document.getElementById("search-input"),
    toggle: document.getElementById("search-toggle"),
    close: document.getElementById("search-close"),
    template: document.getElementById("card-template"),
  };

  function plural(n, word) {
    return n + " " + word + (n === 1 ? "" : "s");
  }

  function visibleItems() {
    return store.all().filter(function (item) {
      return item.active;
    });
  }

  function matchesQuery(item, query) {
    var category = store.getCategory(item.category);
    var haystack = [item.name, item.description, item.subcategory, category ? category.label : ""]
      .join(" ")
      .toLowerCase();
    return haystack.indexOf(query) !== -1;
  }

  function currentItems() {
    var items = visibleItems();

    if (state.query) {
      var q = state.query.toLowerCase();
      return items.filter(function (item) {
        return matchesQuery(item, q);
      });
    }

    if (state.category === "all") {
      if (state.filter === "popular") {
        return items.filter(function (item) {
          return item.popular;
        });
      }
      return items;
    }

    return items.filter(function (item) {
      return item.category === state.category && (!state.filter || item.subcategory === state.filter);
    });
  }

  /* ---------- Rendering ---------- */

  function renderChips() {
    var searching = state.query !== "";
    var chips = [{ id: "all", label: "All", shortLabel: "All" }].concat(store.categories);

    els.chips.textContent = "";
    chips.forEach(function (cat) {
      var button = document.createElement("button");
      var active = !searching && state.category === cat.id;
      button.type = "button";
      button.className = "chip" + (active ? " is-active" : "");
      button.setAttribute("aria-pressed", String(active));
      button.dataset.category = cat.id;

      var full = document.createElement("span");
      full.className = "chip-label--desktop";
      full.textContent = cat.label;
      var short = document.createElement("span");
      short.className = "chip-label--mobile";
      short.textContent = cat.shortLabel;

      button.append(full, short);
      els.chips.appendChild(button);
    });
  }

  function subnavEntries() {
    var items = visibleItems();

    if (state.category === "all") {
      var entries = [{ key: null, label: "All", count: items.length }];
      store.categories.forEach(function (cat) {
        entries.push({
          key: cat.id,
          label: cat.navLabel,
          count: items.filter(function (i) {
            return i.category === cat.id;
          }).length,
        });
      });
      entries.push({
        key: "popular",
        label: "Popular",
        count: items.filter(function (i) {
          return i.popular;
        }).length,
      });
      return entries;
    }

    var inCategory = items.filter(function (i) {
      return i.category === state.category;
    });
    var names = store.getCategory(state.category).subcategories.slice();
    inCategory.forEach(function (i) {
      if (i.subcategory && names.indexOf(i.subcategory) === -1) names.push(i.subcategory);
    });

    return [{ key: null, label: "All", count: inCategory.length }].concat(
      names.map(function (name) {
        return {
          key: name,
          label: name,
          count: inCategory.filter(function (i) {
            return i.subcategory === name;
          }).length,
        };
      })
    );
  }

  function renderSubnav() {
    els.subnavList.textContent = "";
    subnavEntries().forEach(function (entry) {
      var li = document.createElement("li");
      var button = document.createElement("button");
      var active = state.filter === entry.key;
      button.type = "button";
      button.className = "subnav-item" + (active ? " is-active" : "");
      button.setAttribute("aria-pressed", String(active));
      button.dataset.key = entry.key === null ? "" : entry.key;

      var label = document.createElement("span");
      label.textContent = entry.label;
      var count = document.createElement("span");
      count.className = "subnav-count";
      count.textContent = entry.count;

      button.append(label, count);
      li.appendChild(button);
      els.subnavList.appendChild(li);
    });
  }

  function titles(count) {
    if (state.query) {
      return {
        desktop: plural(count, "result") + ' for "' + state.query + '"',
        mobile: plural(count, "item") + " found",
      };
    }
    var desktop;
    if (state.category === "all") {
      desktop = state.filter === "popular" ? plural(count, "popular item") : plural(count, "item") + " available";
    } else if (state.filter) {
      desktop = state.filter + " · " + plural(count, "item");
    } else {
      desktop = count + " " + store.getCategory(state.category).heading + " available";
    }
    return { desktop: desktop, mobile: plural(count, "item") + " available" };
  }

  function renderCards(items) {
    els.grid.textContent = "";
    items.forEach(function (item) {
      var card = els.template.content.firstElementChild.cloneNode(true);
      var mark = card.querySelector(".food-mark");
      var veg = item.type === "veg";

      card.querySelector(".card-title").textContent = item.name;
      card.querySelector(".card-desc").textContent = item.description;
      card.querySelector(".card-price").textContent = "Rs. " + item.price;
      mark.classList.add(veg ? "food-mark--veg" : "food-mark--nonveg");
      mark.setAttribute("aria-label", veg ? "Vegetarian" : "Non-vegetarian");
      mark.title = veg ? "Vegetarian" : "Non-vegetarian";
      if (!item.inStock) card.classList.add("is-out");

      els.grid.appendChild(card);
    });
    els.empty.hidden = items.length > 0;
  }

  function render() {
    var items = currentItems();
    var t = titles(items.length);

    els.body.classList.toggle("has-query", state.query !== "");
    els.titleDesktop.textContent = t.desktop;
    els.titleMobile.textContent = t.mobile;

    renderChips();
    renderSubnav();
    renderCards(items);
  }

  /* ---------- Events ---------- */

  function clearSearch() {
    state.query = "";
    els.input.value = "";
  }

  els.chips.addEventListener("click", function (event) {
    var chip = event.target.closest(".chip");
    if (!chip) return;
    clearSearch();
    state.category = chip.dataset.category;
    state.filter = null;
    render();
  });

  els.subnavList.addEventListener("click", function (event) {
    var button = event.target.closest(".subnav-item");
    if (!button) return;
    var key = button.dataset.key || null;

    // Under "All", picking a category jumps straight to that category.
    if (state.category === "all" && key && key !== "popular") {
      state.category = key;
      state.filter = null;
    } else {
      state.filter = key;
    }
    render();
  });

  els.input.addEventListener("input", function () {
    state.query = els.input.value.trim();
    render();
  });

  // Phone: the search button swaps the header for the search box.
  els.toggle.addEventListener("click", function () {
    els.body.classList.add("is-mobile-search");
    els.input.focus();
  });

  els.close.addEventListener("click", function () {
    clearSearch();
    els.body.classList.remove("is-mobile-search");
    render();
  });

  render();
})();
