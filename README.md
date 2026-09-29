# Sathi Café — digital menu

A QR-code café menu with an admin panel, built from the [Sathi Café menu design](https://www.figma.com/design/1OwhPBIAGFC0p5yfKZUXsA/Sathi-Cafe-menu-design?node-id=1040-64).

- **Front end:** HTML, CSS and JavaScript (`index.html`, `admin/`, `css/`, `js/`)
- **Back end:** PHP (`api/api.php`)
- **Database:** MySQL (`database/schema.sql`)

## Run it with XAMPP

1. Install [XAMPP](https://www.apachefriends.org/) and start **Apache** and **MySQL** in the XAMPP Control Panel.
2. Copy this folder into XAMPP's `htdocs` folder, e.g. `C:\xampp\htdocs\cs-ia`.
3. Open http://localhost/phpmyadmin, go to **Import**, choose `database/schema.sql` and press **Import**. This creates the `sathi_cafe` database with the menu and the admin account.
4. Open http://localhost/cs-ia/ for the customer menu. The ⚙ icon opens the admin panel; log in with **admin / sathi123**.

If your MySQL user or password isn't XAMPP's default (`root` with no password), change it in `api/config.php`.

## Features

- **Customer menu:** category chips, a sub-category sidebar, search, and a phone layout below 640px wide. Only items switched on in the admin panel are shown.
- **Admin panel:** add, edit and delete items; show or hide an item; mark it in or out of stock. Every change is saved to MySQL, so all customers see it straight away.
- **Undo:** a stack of the last 20 changes.
- **Sorting:** click a column header. It uses a hand-written merge sort.
- **CSV export and import:** imports are validated row by row and saved in one database transaction.
- **Secure login:** passwords are stored as bcrypt hashes (`password_hash` / `password_verify`). A PHP session keeps the admin logged in for 8 hours.
- **Server-side checks:** the API validates every item and uses prepared statements, which protect against SQL injection.

## API (`api/api.php?action=…`)

| Action | Who | Does |
| --- | --- | --- |
| `list` | anyone | items shown on the menu |
| `login`, `me` | anyone | log in, check who is logged in |
| `all` | admin | every item, including hidden ones |
| `create`, `update`, `delete` | admin | change one item |
| `replace` | admin | replace the whole menu (CSV import, undo) |
| `logout` | admin | end the session |
