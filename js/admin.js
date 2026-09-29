/* Admin menu management: list, filter, add, edit, toggle and delete items. */
(function () {
  "use strict";

  var SESSION_KEY = "sathi-cafe-admin";
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
  };

  var fields = els.form.elements;

  /* ---------- Session ---------- */

  var username = null;
  try {
    username = window.sessionStorage.getItem(SESSION_KEY);
  } catch (err) {
    username = null;
  }
  if (username) {
    els.adminName.textContent = username;
    els.adminAvatar.textContent = username.charAt(0);
  }

  els.logout.addEventListener("click", function () {
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch (err) {
      // Nothing to clear.
    }
    window.location.href = "login.html";
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
    return store.all().filter(function (item) {
      if (state.category !== "all" && item.category !== state.category) return false;
      if (!q) return true;
      return (item.name + " " + item.description + " " + item.subcategory).toLowerCase().indexOf(q) !== -1;
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

      var toggle = tr.querySelector(".toggle-btn");
      var toggleLabel = (item.active ? "Hide " : "Show ") + item.name + (item.active ? " from" : " on") + " the menu";
      toggle.setAttribute("aria-label", toggleLabel);
      toggle.title = item.active ? "Active — click to hide from menu" : "Hidden — click to show on menu";
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

  var statusTimer = null;
  function flash(message) {
    els.status.textContent = message;
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(function () {
      els.status.textContent = "";
    }, 2500);
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

  els.tbody.addEventListener("click", function (event) {
    var row = event.target.closest("tr");
    if (!row) return;
    var id = Number(row.dataset.id);

    if (event.target.closest(".toggle-btn")) {
      var item = store.get(id);
      store.update(id, { active: !item.active });
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

  els.form.addEventListener("submit", function (event) {
    event.preventDefault();
    var data = readForm();
    if (!validate(data)) return;

    if (state.isNew) {
      var created = store.create(data);
      state.isNew = false;
      state.selectedId = created.id;
      flash("Item added to the menu.");
    } else {
      store.update(state.selectedId, data);
      flash("Changes saved.");
    }
    renderTable();
    renderEditor();
  });

  els.deleteItem.addEventListener("click", function () {
    var item = store.get(state.selectedId);
    if (!item) return;
    els.deleteSummary.textContent = item.name + " - " + formatPrice(item.price);
    els.dialog.returnValue = "";
    els.dialog.showModal();
  });

  els.dialog.addEventListener("close", function () {
    if (els.dialog.returnValue !== "confirm") return;

    var visible = filteredItems();
    var index = visible.findIndex(function (item) {
      return item.id === state.selectedId;
    });
    var name = store.get(state.selectedId).name;
    store.remove(state.selectedId);

    var remaining = filteredItems();
    var next = remaining[Math.min(index, remaining.length - 1)];
    select(next ? next.id : null);
    flash(name + " deleted.");
  });

  /* ---------- Start ---------- */

  fillCategoryOptions();
  var first = store.all()[0];
  state.selectedId = first ? first.id : null;
  render();
})();
