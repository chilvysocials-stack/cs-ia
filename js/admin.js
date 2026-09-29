/* Admin menu management: list, filter, sort, add, edit, toggle, delete, undo and CSV import/export. */
(function () {
  "use strict";

  var store = window.SathiStore;

  var CATEGORY_ICONS = {
    drinks: '<path d="M8 3h8l-1 7a3 3 0 0 1-6 0L8 3ZM12 13v7M8.5 21h7"/>',
    breakfast: '<ellipse cx="12" cy="13" rx="8" ry="7"/><circle cx="12" cy="13" r="3"/>',
    momo: '<path d="M4 15c0-4.5 3.6-8 8-8s8 3.5 8 8H4ZM12 7v-2M9 8.5 8 6.5M15 8.5l1-2M3 18h18"/>',
    mains: '<path d="M3 12h18a9 9 0 0 1-18 0ZM7 8c0-1.5 1-1.5 1-3M12 8c0-1.5 1-1.5 1-3M17 8c0-1.5 1-1.5 1-3"/>',
    special: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
  };

  var PENCIL = '<path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4"/>';

  function svg(paths, size) {
    return (
      '<svg class="icon" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      paths +
      "</svg>"
    );
  }

  function formatPrice(price) {
    return "Rs. " + Number(price).toLocaleString("en-US");
  }

  function categoryLabel(id) {
    var cat = store.getCategory(id);
    return cat ? cat.label : id;
  }

  var state = {
    category: "all",
    query: "",
    selectedId: null, // item being edited
    isNew: false, // editor holds a brand-new, unsaved item
    sortKey: null, // column the table is sorted by (null = menu order)
    sortDir: 1, // 1 = ascending, -1 = descending
  };

  var els = {
    chips: document.getElementById("admin-chips"),
    search: document.getElementById("admin-search-input"),
    tbody: document.getElementById("items-body"),
    tableEmpty: document.getElementById("table-empty"),
    addItem: document.getElementById("add-item"),
    editorEmpty: document.getElementById("editor-empty"),
    form: document.getElementById("editor-form"),
    mode: document.getElementById("editor-mode"),
    title: document.getElementById("editor-title"),
    deleteItem: document.getElementById("delete-item"),
    cancel: document.getElementById("cancel-edit"),
    status: document.getElementById("editor-status"),
    dialog: document.getElementById("delete-dialog"),
    deleteSummary: document.getElementById("delete-summary"),
    logout: document.getElementById("logout"),
    adminName: document.getElementById("admin-name"),
    adminAvatar: document.getElementById("admin-avatar"),
    undo: document.getElementById("undo"),
    exportCsv: document.getElementById("export-csv"),
    importCsv: document.getElementById("import-csv"),
    sortButtons: document.querySelectorAll(".sort-btn"),
  };

  var fields = els.form.elements;

  /* ---------- Session ---------- */

  els.logout.addEventListener("click", async function () {
    try {
      await SathiAuth.logout();
    } finally {
      window.location.href = "login.html";
    }
  });

  /* ---------- Filters ---------- */

  function renderChips() {
    var chips = [{ id: "all", label: "All" }].concat(store.categories);
    els.chips.textContent = "";
    chips.forEach(function (cat) {
      var button = document.createElement("button");
      var active = state.category === cat.id;
      button.type = "button";
      button.className = "chip" + (active ? " is-active" : "");
      button.setAttribute("aria-pressed", String(active));
      button.dataset.category = cat.id;
      button.textContent = cat.label;
      els.chips.appendChild(button);
    });
  }

  function filteredItems() {
    var q = state.query.toLowerCase();
    var items = store.all().filter(function (item) {
      if (state.category !== "all" && item.category !== state.category) return false;
      if (!q) return true;
      return (item.name + " " + item.description + " " + item.subcategory).toLowerCase().indexOf(q) !== -1;
    });
    return state.sortKey ? mergeSort(items, compareItems) : items;
  }

  /* ---------- Sorting (merge sort) ---------- */

  // Value an item is sorted by for the chosen column.
  function sortValue(item) {
    if (state.sortKey === "category") return categoryLabel(item.category);
    if (state.sortKey === "name") return item.name.toLowerCase();
    return Number(item[state.sortKey]); // price, or true/false as 1/0
  }

  function compareItems(a, b) {
    var x = sortValue(a);
    var y = sortValue(b);
    return (x < y ? -1 : x > y ? 1 : 0) * state.sortDir;
  }

  // Split the list in half, sort each half, then merge the two sorted halves.
  // O(n log n), and stable: equal items keep their original order.
  function mergeSort(list, compare) {
    if (list.length <= 1) return list;
    var middle = Math.floor(list.length / 2);
    var left = mergeSort(list.slice(0, middle), compare);
    var right = mergeSort(list.slice(middle), compare);

    var merged = [];
    var i = 0;
    var j = 0;
    while (i < left.length && j < right.length) {
      merged.push(compare(left[i], right[j]) <= 0 ? left[i++] : right[j++]);
    }
    return merged.concat(left.slice(i), right.slice(j));
  }

  function renderSortHeaders() {
    els.sortButtons.forEach(function (button) {
      var th = button.parentElement;
      if (button.dataset.sort === state.sortKey) {
        th.setAttribute("aria-sort", state.sortDir === 1 ? "ascending" : "descending");
      } else {
        th.removeAttribute("aria-sort");
      }
    });
  }

  /* ---------- Table ---------- */

  function itemNote(item) {
    var parts = [];
    if (item.subcategory) parts.push(item.subcategory);
    if (!item.active) parts.push("disabled");
    return parts.join(" · ");
  }

  function renderTable() {
    var items = filteredItems();
    els.tbody.textContent = "";
    els.undo.disabled = !store.canUndo();
    renderSortHeaders();

    items.forEach(function (item) {
      var tr = document.createElement("tr");
      tr.dataset.id = item.id;
      if (item.id === state.selectedId && !state.isNew) tr.classList.add("is-selected");
      if (!item.active) tr.classList.add("is-inactive");

      var note = itemNote(item);
      tr.innerHTML =
        '<td><span class="item-icon">' + svg(CATEGORY_ICONS[item.category] || CATEGORY_ICONS.special, 14) + "</span></td>" +
        '<td><p class="item-name"></p>' + (note ? '<p class="item-note"></p>' : "") + "</td>" +
        '<td><span class="item-category"></span></td>' +
        '<td><span class="item-price"></span></td>' +
        '<td><span class="badge ' + (item.inStock ? "badge-ok" : "badge-bad") + '">' +
        (item.inStock ? "In stock" : "Out of stock") + "</span></td>" +
        '<td><button type="button" class="icon-btn toggle-btn" aria-pressed="' + item.active + '">' +
        '<span class="toggle-dot"></span></button></td>' +
        '<td><button type="button" class="icon-btn edit-btn">' + svg(PENCIL, 14) + "</button></td>";

      // User-entered text goes in via textContent, never innerHTML.
      tr.querySelector(".item-name").textContent = item.name;
      if (note) tr.querySelector(".item-note").textContent = note;
      tr.querySelector(".item-category").textContent = categoryLabel(item.category);
      tr.querySelector(".item-price").textContent = formatPrice(item.price);

      tr.querySelector(".toggle-btn").setAttribute("aria-label", "Show " + item.name + " on the menu");
      tr.querySelector(".edit-btn").setAttribute("aria-label", "Edit " + item.name);

      els.tbody.appendChild(tr);
    });

    els.tableEmpty.hidden = items.length > 0;
  }

  /* ---------- Editor ---------- */

  function fillCategoryOptions() {
    store.categories.forEach(function (cat) {
      var option = document.createElement("option");
      option.value = cat.id;
      option.textContent = cat.label;
      fields.category.appendChild(option);
    });
  }

  function clearErrors() {
    els.form.querySelectorAll(".field").forEach(function (field) {
      field.classList.remove("has-error");
    });
    els.form.querySelectorAll(".field-error").forEach(function (p) {
      p.textContent = "";
    });
  }

  function setError(name, message) {
    var p = els.form.querySelector('[data-error-for="' + name + '"]');
    p.textContent = message;
    p.closest(".field").classList.add("has-error");
  }

  function fillForm(item) {
    fields.name.value = item.name;
    fields.price.value = item.price;
    fields.category.value = item.category;
    fields.description.value = item.description;
    fields.type.value = item.type;
    fields.stock.value = item.inStock ? "in" : "out";
    fields.active.checked = item.active;
  }

  function renderEditor() {
    clearErrors();
    var item = state.isNew ? null : store.get(state.selectedId);

    if (!state.isNew && !item) {
      els.form.hidden = true;
      els.editorEmpty.hidden = false;
      return;
    }

    els.form.hidden = false;
    els.editorEmpty.hidden = true;
    els.deleteItem.hidden = state.isNew;

    if (state.isNew) {
      els.mode.textContent = "NEW ITEM";
      els.title.textContent = "Add a menu item";
      fillForm({
        name: "",
        price: "",
        category: state.category === "all" ? store.categories[0].id : state.category,
        description: "",
        type: "veg",
        inStock: true,
        active: true,
      });
    } else {
      els.mode.textContent = "EDITING";
      els.title.textContent = item.name;
      fillForm(item);
    }
  }

  function readForm() {
    return {
      name: fields.name.value.trim(),
      price: Number(fields.price.value),
      category: fields.category.value,
      description: fields.description.value.trim(),
      type: fields.type.value,
      inStock: fields.stock.value === "in",
      active: fields.active.checked,
    };
  }

  function validate(data) {
    clearErrors();
    var ok = true;
    if (!data.name) {
      setError("name", "Give the item a name.");
      ok = false;
    }
    if (!Number.isInteger(data.price) || data.price <= 0) {
      setError("price", "Enter a whole-number price above 0.");
      ok = false;
    }
    return ok;
  }

  function flash(message, isError) {
    els.status.textContent = message;
    els.status.classList.toggle("is-error", Boolean(isError));
  }

  // Run a change on the server. Shows `message` on success or the server's
  // error on failure, and returns whether it worked.
  async function save(task, message) {
    try {
      await task();
      flash(message);
      return true;
    } catch (err) {
      flash(err.message, true);
      return false;
    }
  }

  function select(id) {
    state.selectedId = id;
    state.isNew = false;
    renderTable();
    renderEditor();
  }

  function render() {
    renderChips();
    renderTable();
    renderEditor();
  }

  /* ---------- Events ---------- */

  els.chips.addEventListener("click", function (event) {
    var chip = event.target.closest(".chip");
    if (!chip) return;
    state.category = chip.dataset.category;
    renderChips();
    renderTable();
  });

  els.search.addEventListener("input", function () {
    state.query = els.search.value.trim();
    renderTable();
  });

  els.tbody.addEventListener("click", async function (event) {
    var row = event.target.closest("tr");
    if (!row) return;
    var id = Number(row.dataset.id);

    if (event.target.closest(".toggle-btn")) {
      var item = store.get(id);
      var message = item.name + (item.active ? " hidden from" : " shown on") + " the menu.";
      if (!(await save(function () {
        return store.update(id, { active: !item.active });
      }, message))) return;
      renderTable();
      if (id === state.selectedId && !state.isNew) fields.active.checked = store.get(id).active;
      return;
    }

    select(id);
    if (event.target.closest(".edit-btn")) fields.name.focus();
  });

  els.addItem.addEventListener("click", function () {
    state.isNew = true;
    renderTable();
    renderEditor();
    fields.name.focus();
  });

  els.cancel.addEventListener("click", function () {
    state.isNew = false;
    renderTable();
    renderEditor();
  });

  els.form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var data = readForm();
    if (!validate(data)) return;

    var saved = state.isNew
      ? await save(async function () {
          var created = await store.create(data);
          state.isNew = false;
          state.selectedId = created.id;
        }, "Item added to the menu.")
      : await save(function () {
          return store.update(state.selectedId, data);
        }, "Changes saved.");

    // On failure keep what the admin typed so they can fix it.
    if (saved) {
      renderTable();
      renderEditor();
    }
  });

  els.deleteItem.addEventListener("click", function () {
    var item = store.get(state.selectedId);
    if (!item) return;
    els.deleteSummary.textContent = item.name + " - " + formatPrice(item.price);
    els.dialog.returnValue = "";
    els.dialog.showModal();
  });

  els.dialog.addEventListener("close", async function () {
    if (els.dialog.returnValue !== "confirm") return;

    var id = state.selectedId;
    var index = filteredItems().findIndex(function (item) {
      return item.id === id;
    });
    if (!(await save(function () {
      return store.remove(id);
    }, store.get(id).name + " deleted."))) return;

    var remaining = filteredItems();
    var next = remaining[Math.min(index, remaining.length - 1)];
    select(next ? next.id : null);
  });

  // Clicking a column header sorts by it; clicking it again flips the order.
  els.sortButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var key = button.dataset.sort;
      state.sortDir = state.sortKey === key ? -state.sortDir : 1;
      state.sortKey = key;
      renderTable();
    });
  });

  /* ---------- Undo ---------- */

  els.undo.addEventListener("click", async function () {
    if (!(await save(function () {
      return store.undo();
    }, "Last change undone."))) return;
    if (!store.get(state.selectedId)) state.selectedId = store.all().length ? store.all()[0].id : null;
    state.isNew = false;
    renderTable();
    renderEditor();
  });

  /* ---------- CSV export / import ---------- */

  var CSV_COLUMNS = ["name", "description", "price", "category", "subcategory", "type", "inStock", "active", "popular"];

  function toCsvField(value) {
    return '"' + String(value).replace(/"/g, '""') + '"'; // quotes inside a field are doubled
  }

  els.exportCsv.addEventListener("click", function () {
    var lines = [CSV_COLUMNS.join(",")].concat(
      store.all().map(function (item) {
        return CSV_COLUMNS.map(function (col) {
          return toCsvField(item[col]);
        }).join(",");
      })
    );
    var link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    link.download = "sathi-cafe-menu.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  });

  // Split one CSV line into fields, handling "quoted, fields" and "" escapes.
  function parseCsvLine(line) {
    var fields = [];
    var field = "";
    var quoted = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (quoted && ch === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = !quoted;
      } else if (ch === "," && !quoted) {
        fields.push(field);
        field = "";
      } else {
        field += ch;
      }
    }
    fields.push(field);
    return fields;
  }

  // Turn CSV text into menu items. Returns { items } or { error }.
  function readCsv(text) {
    var lines = text.split(/\r?\n/).filter(function (line) {
      return line.trim() !== "";
    });
    if (!lines.length || parseCsvLine(lines[0]).join(",") !== CSV_COLUMNS.join(",")) {
      return { error: "The first line must be the header: " + CSV_COLUMNS.join(",") };
    }

    var items = [];
    for (var row = 1; row < lines.length; row++) {
      var values = parseCsvLine(lines[row]);
      var item = {};
      CSV_COLUMNS.forEach(function (col, i) {
        item[col] = (values[i] || "").trim();
      });
      item.price = Number(item.price);
      item.inStock = item.inStock === "true";
      item.active = item.active === "true";
      item.popular = item.popular === "true";

      var where = "Row " + (row + 1) + ": ";
      if (values.length !== CSV_COLUMNS.length) return { error: where + "expected " + CSV_COLUMNS.length + " columns." };
      if (!item.name) return { error: where + "name is empty." };
      if (!Number.isInteger(item.price) || item.price <= 0) return { error: where + "price must be a whole number above 0." };
      if (!store.getCategory(item.category)) return { error: where + 'unknown category "' + item.category + '".' };
      if (item.type !== "veg" && item.type !== "nonveg") return { error: where + 'type must be "veg" or "nonveg".' };
      items.push(item);
    }
    return items.length ? { items: items } : { error: "The file has no menu items." };
  }

  els.importCsv.addEventListener("change", async function () {
    var file = els.importCsv.files[0];
    els.importCsv.value = ""; // allow picking the same file again
    if (!file) return;

    var result = readCsv(await file.text());
    if (result.error) {
      window.alert("Import cancelled. " + result.error);
      return;
    }
    if (!window.confirm("Replace the whole menu with " + result.items.length + " items from " + file.name + "?")) return;

    if (!(await save(function () {
      return store.replaceAll(result.items);
    }, "Imported " + result.items.length + " items. Use Undo to go back."))) return;
    state.selectedId = store.all()[0].id;
    state.isNew = false;
    renderTable();
    renderEditor();
  });

  /* ---------- Start ---------- */

  (async function start() {
    fillCategoryOptions();
    try {
      var username = await SathiAuth.me();
      if (!username) {
        window.location.replace("login.html");
        return;
      }
      els.adminName.textContent = username;
      els.adminAvatar.textContent = username.charAt(0);
      await store.load(true);
    } catch (err) {
      els.tableEmpty.textContent = err.message;
    }
    var first = store.all()[0];
    state.selectedId = first ? first.id : null;
    render();
    document.body.hidden = false; // hidden until we know the admin is logged in
  })();
})();
