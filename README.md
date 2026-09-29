# Sathi Café — digital menu

Front-end build of the [Sathi Café menu design](https://www.figma.com/design/1OwhPBIAGFC0p5yfKZUXsA/Sathi-Cafe-menu-design?node-id=1040-64) in plain HTML, CSS and JavaScript, with no dependencies.

Open `index.html` in a browser. The ⚙ icon opens the admin panel; log in with **admin / sathi123**. You stay logged in for 8 hours, until you log out.

## Features

- **Customer menu:** category chips, a sub-category sidebar, search, and a phone layout below 640px wide.
- **Admin panel:** add, edit and delete items; show or hide an item; mark it in or out of stock.
- **Undo:** a stack of the last 20 changes.
- **Sorting:** click a column header. It uses a hand-written merge sort.
- **CSV export and import:** imports are validated row by row.
- **Password hashing:** passwords are stored as SHA-256 hashes.

Menu data is saved in the browser's `localStorage` (`js/store.js`). The login is checked in the browser (`js/auth.js`), so it is not real security. A server with a database would replace both.
