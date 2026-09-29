# Sathi Café — digital menu (front-end)

Front-end build of the [Sathi Café menu design](https://www.figma.com/design/1OwhPBIAGFC0p5yfKZUXsA/Sathi-Cafe-menu-design?node-id=1040-64) in plain HTML, CSS and JavaScript. There are no dependencies and no build step.

| Page | File | Figma frames |
| --- | --- | --- |
| Customer menu (desktop + phone) | `index.html` | 09 · Menu – All / Drinks / Breakfast / Momo & Noodles / Mains / Sathi Special / Search / Search Results, Phone Menu, Search Active, Search Results |
| Admin login | `admin/login.html` | Admin Panel Login |
| Menu management | `admin/index.html` | 16 · Menu Management, Delete pop up |

## Running it

Open `index.html` in a browser, or serve the folder so both pages share storage reliably:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

Admin login: **admin** / **sathi123**. The ⚙ icon on the desktop menu opens the admin panel. Once logged in, you stay logged in for 8 hours in that browser, across tabs and visits to the customer menu, until you press log out.

## What works

- **Customer menu**: category chips, a sub-category sidebar with item counts, and live search across name, description and category. On phones (≤ 640px) it switches to the phone layout, with scrolling chips and a pill search box.
- **Veg / non-veg marker** on each card (green = veg, red = non-veg). Items marked out of stock are dimmed and labelled.
- **Admin panel**:
  - filter by category and search
  - add, edit and delete items; deleting asks for confirmation in a dialog
  - show or hide an item on the menu with the Active toggle
  - set stock, type and price, with form validation
  - **Undo** the last 20 changes (adds, edits, deletes, toggles and imports). They're kept on a stack, and the newest is undone first.
  - **Sort** the table by clicking a column header; click again to reverse the order. It uses a hand-written merge sort in `js/admin.js`.
  - **Export CSV** downloads the whole menu. **Import CSV** checks every row (columns, name, price, category, type) and replaces the menu only if the whole file is valid. An import can be undone.
  - **Hashed passwords**: `js/auth.js` stores a SHA-256 hash, never the plain password.

## How data is stored

This is the front-end only. Menu items are seeded from `js/store.js` and saved in the browser's `localStorage`, so admin changes appear on the customer menu **in the same browser**. To reset, clear the site data or run `localStorage.removeItem("sathi-cafe-menu-v1")` in the console.

The system design connects both pages to a MySQL database. Adding that means swapping the functions in `js/store.js` (`all`, `create`, `update`, `remove`) for API calls. The login check in `js/auth.js` also has to move to the server. It currently runs in the browser, so it gates the demo UI but does not secure anything.

## Project layout

```
index.html          customer menu
admin/login.html    admin login
admin/index.html    menu management
css/base.css        design tokens (colours, radii, chips, veg marker)
css/menu.css        customer menu, desktop + phone
css/admin.css       login, admin panel, delete dialog
js/store.js         menu data + localStorage persistence
js/menu.js          customer menu behaviour
js/auth.js          login session + password hashing
js/login.js         login form
js/admin.js         admin panel behaviour
```

Note: icons are inline SVGs drawn to match the design. The original Figma icon exports could not be downloaded when this was built.
