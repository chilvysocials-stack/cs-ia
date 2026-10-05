# Sathi Café — digital menu

A QR-code café menu with an admin panel, built from the [Sathi Café menu design](https://www.figma.com/design/1OwhPBIAGFC0p5yfKZUXsA/Sathi-Cafe-menu-design?node-id=1040-64).

- **Front end:** HTML, CSS and JavaScript (`frontend/`)
- **Back end:** Python with Flask (`app.py`, settings in `config.py`)
- **Database:** MySQL (`database/schema.sql`)

## Run it

1. Install [Python 3](https://www.python.org/) and [XAMPP](https://www.apachefriends.org/). Start **MySQL** in the XAMPP Control Panel, plus **Apache** while you use phpMyAdmin in step 2.
2. Open http://localhost/phpmyadmin, go to **Import**, choose `database/schema.sql` and press **Import**. This creates the `sathi_cafe` database with the menu and the admin account.
3. In a terminal in this folder, install the Python packages and start the server:
   ```
   pip install -r requirements.txt
   python app.py
   ```
4. Open http://localhost:5000 for the customer menu. The ⚙ icon opens the admin panel; log in with **admin / sathi123**.

If your MySQL user or password isn't XAMPP's default (`root` with no password), change it in `config.py`.

## Features

- **Customer menu:** category chips, a sub-category sidebar, search, and a phone layout below 640px wide. Only items switched on in the admin panel are shown.
- **Admin panel:** add, edit and delete items; show or hide an item; mark it in or out of stock. Every change is saved to MySQL, so all customers see it straight away.
- **Dashboard:** total items, hidden items, out-of-stock items and average price, calculated by MySQL (`COUNT`, `SUM`, `AVG`).
- **Bulk price change:** raise or lower a category's prices by a percentage in one SQL `UPDATE`.
- **Activity log:** every change is saved in the `activity_log` table with who made it and when.
- **Undo:** a stack of the last 20 changes, including bulk price changes and imports.
- **Sorting:** click a column header. It uses a hand-written merge sort.
- **CSV export and import:** imports are validated row by row and saved in one database transaction.
- **Secure login:** passwords are stored as salted hashes (`generate_password_hash` / `check_password_hash`). A session cookie keeps the admin logged in for 8 hours. After 5 wrong passwords from the same computer, login is locked for 5 minutes.
- **Server-side checks:** the API validates every item and uses prepared statements, which protect against SQL injection.

## API (`/api/<action>`)

| Action | Who | Does |
| --- | --- | --- |
| `list` | anyone | items shown on the menu |
| `login`, `me`, `logout` | anyone | log in, check who is logged in, log out |
| `all` | admin | every item, including hidden ones |
| `create`, `update`, `delete` | admin | change one item |
| `replace` | admin | replace the whole menu (CSV import, undo) |
| `adjust_prices` | admin | change prices by a percentage |
| `stats`, `activity` | admin | dashboard numbers, recent changes |
