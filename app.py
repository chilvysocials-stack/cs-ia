"""
Sathi Café server: Python (Flask) + MySQL.

Serves the website from frontend/ and a JSON API at /api/<action>:
    Anyone:      list (items shown on the menu), login, me, logout
    Admin only:  all, create, update, delete, replace, adjust_prices, stats, activity

Run it with:  python app.py   then open http://localhost:5000
"""
import math
import secrets
import time
from datetime import timedelta

import pymysql
from flask import Flask, g, jsonify, request, send_from_directory, session
from werkzeug.security import check_password_hash

import config

CATEGORIES = ("drinks", "breakfast", "momo", "mains", "special")
COLUMNS = "name, description, price, category, subcategory, type, in_stock, active, popular"
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_SECONDS = 5 * 60

app = Flask(__name__, static_folder="frontend", static_url_path="")
app.secret_key = secrets.token_hex(32)  # signs the login cookie; restarting the server logs admins out
app.permanent_session_lifetime = timedelta(hours=8)  # admins stay logged in for 8 hours
app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Strict")

failed_logins = {}  # IP address -> (wrong attempts so far, locked until as a Unix time)


# ---------- Errors: always answer with JSON ----------

class ApiError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


@app.errorhandler(ApiError)
def api_error(err):
    return jsonify(error=str(err)), err.status


@app.errorhandler(pymysql.MySQLError)
def database_error(err):
    return jsonify(error=f"Database error: {err}"), 500


# ---------- Database ----------

def db():
    """One MySQL connection per request, opened the first time it's needed."""
    if "db" not in g:
        g.db = pymysql.connect(
            host=config.DB_HOST,
            user=config.DB_USER,
            password=config.DB_PASSWORD,
            database=config.DB_NAME,
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
        )
    return g.db


@app.teardown_appcontext
def close_db(_error):
    connection = g.pop("db", None)
    if connection:
        connection.close()  # anything not committed (e.g. after an error) is rolled back


def run(sql, params=()):
    """Run one SQL statement with %s placeholders (prepared, so safe from SQL injection)."""
    cursor = db().cursor()
    cursor.execute(sql, params)
    return cursor


def log_activity(action, details):
    run("INSERT INTO activity_log (admin, action, details) VALUES (%s, %s, %s)",
        (session["admin"], action, details))


def to_item(row):
    """Turn a database row into the shape the JavaScript uses."""
    return {
        "id": row["id"],
        "name": row["name"],
        "description": row["description"],
        "price": row["price"],
        "category": row["category"],
        "subcategory": row["subcategory"],
        "type": row["type"],
        "inStock": bool(row["in_stock"]),
        "active": bool(row["active"]),
        "popular": bool(row["popular"]),
    }


def valid_item(item):
    """Server-side validation: never trust what the browser sends.
    Returns the values in COLUMNS order."""
    name = str(item.get("name") or "").strip()
    description = str(item.get("description") or "").strip()
    price = item.get("price")
    if not name or len(name) > 60:
        raise ApiError("Name must be 1 to 60 characters.")
    if len(description) > 160:
        raise ApiError("Description must be 160 characters or fewer.")
    if type(price) is not int or price <= 0:  # type() check also rejects True/False
        raise ApiError("Price must be a whole number above 0.")
    if item.get("category") not in CATEGORIES:
        raise ApiError("Unknown category.")
    if item.get("type") not in ("veg", "nonveg"):
        raise ApiError("Type must be veg or nonveg.")
    return (name, description, price, item["category"], str(item.get("subcategory") or "").strip(),
            item["type"], bool(item.get("inStock")), bool(item.get("active")), bool(item.get("popular")))


# ---------- API actions ----------

ACTIONS = {}  # action name -> function that handles it


def action(name, admin_only=False):
    """Register a function as /api/<name>, optionally for logged-in admins only."""
    def register(handler):
        def checked(data):
            if admin_only and "admin" not in session:
                raise ApiError("Please log in again.", 401)
            return handler(data)
        ACTIONS[name] = checked
        return handler
    return register


@app.route("/api/<name>", methods=["GET", "POST"])
def api(name):
    if name not in ACTIONS:
        raise ApiError("Unknown action.", 404)
    result = ACTIONS[name](request.get_json(silent=True) or {})
    if "db" in g:
        g.db.commit()  # every change in one request is saved together
    return jsonify(result)


@action("list")
def list_menu(_data):
    """Customer menu: only items switched on."""
    return [to_item(row) for row in run("SELECT * FROM menu_items WHERE active = 1 ORDER BY id").fetchall()]


@action("all", admin_only=True)
def list_all(_data):
    return [to_item(row) for row in run("SELECT * FROM menu_items ORDER BY id").fetchall()]


@action("create", admin_only=True)
def create(data):
    values = valid_item(data)
    item_id = run(f"INSERT INTO menu_items ({COLUMNS}) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                  values).lastrowid
    log_activity("Added", values[0])
    return {"id": item_id}


@action("update", admin_only=True)
def update(data):
    values = valid_item(data)
    run("""UPDATE menu_items SET name = %s, description = %s, price = %s, category = %s, subcategory = %s,
           type = %s, in_stock = %s, active = %s, popular = %s WHERE id = %s""",
        values + (data.get("id"),))
    log_activity("Edited", values[0])
    return {"ok": True}


@action("delete", admin_only=True)
def delete(data):
    rows = run("SELECT name FROM menu_items WHERE id = %s", (data.get("id"),)).fetchall()
    run("DELETE FROM menu_items WHERE id = %s", (data.get("id"),))
    log_activity("Deleted", rows[0]["name"] if rows else "")
    return {"ok": True}


@action("replace", admin_only=True)
def replace(data):
    """CSV import and undo: swap the whole menu in one transaction."""
    items = data.get("items")
    if not isinstance(items, list):
        raise ApiError("No items sent.")
    rows = [valid_item(item) for item in items]  # check every item before changing anything

    run("DELETE FROM menu_items")
    for item, values in zip(items, rows):
        item_id = item.get("id") if type(item.get("id")) is int else None  # None = next free id
        run(f"INSERT INTO menu_items (id, {COLUMNS}) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (item_id,) + values)

    if data.get("reason") == "undo":
        log_activity("Undo", "Restored the previous menu")
    else:
        log_activity("Imported CSV", f"{len(items)} items")
    return {"ok": True}


@action("adjust_prices", admin_only=True)
def adjust_prices(data):
    """Raise or lower prices by a percentage, for one category or all."""
    percent = data.get("percent")
    category = data.get("category", "all")
    if type(percent) is not int or percent == 0 or not -50 <= percent <= 100:
        raise ApiError("Enter a whole-number percentage from -50 to 100 (not 0).")

    sql = "UPDATE menu_items SET price = GREATEST(1, ROUND(price * (100 + %s) / 100))"
    params = [percent]
    if category != "all":
        if category not in CATEGORIES:
            raise ApiError("Unknown category.")
        sql += " WHERE category = %s"
        params.append(category)

    changed = run(sql, params).rowcount
    log_activity("Changed prices", f"{percent:+d}% on {category} ({changed} items)")
    return {"changed": changed}


@action("stats", admin_only=True)
def stats(_data):
    """Dashboard numbers, worked out by MySQL."""
    row = run("""SELECT COUNT(*) AS total, SUM(active = 0) AS hidden, SUM(in_stock = 0) AS outOfStock,
                        ROUND(AVG(price)) AS averagePrice FROM menu_items""").fetchone()
    return {key: int(value or 0) for key, value in row.items()}


@action("activity", admin_only=True)
def activity(_data):
    """The 8 most recent changes."""
    rows = run("""SELECT admin, action, details, created_at AS time FROM activity_log
                  ORDER BY id DESC LIMIT 8""").fetchall()
    return [dict(row, time=str(row["time"])) for row in rows]


@action("login")
def login(data):
    # Lock the login for a while after too many wrong passwords (stops guessing).
    ip = request.remote_addr
    attempts, locked_until = failed_logins.get(ip, (0, 0))
    wait = locked_until - time.time()
    if wait > 0:
        raise ApiError(f"Too many wrong attempts. Try again in {math.ceil(wait / 60)} minute(s).", 429)

    username = str(data.get("username", ""))
    rows = run("SELECT password_hash FROM admins WHERE username = %s", (username,)).fetchall()
    # check_password_hash hashes the typed password and compares it with the stored hash.
    if not rows or not check_password_hash(rows[0]["password_hash"], str(data.get("password", ""))):
        attempts += 1
        if attempts >= MAX_LOGIN_ATTEMPTS:
            failed_logins[ip] = (0, time.time() + LOCKOUT_SECONDS)
            raise ApiError("Too many wrong attempts. Login is locked for 5 minutes.", 429)
        failed_logins[ip] = (attempts, 0)
        raise ApiError(f"Incorrect username or password. {MAX_LOGIN_ATTEMPTS - attempts} attempt(s) left.", 401)

    failed_logins.pop(ip, None)
    session.clear()
    session.permanent = True  # keep the login cookie for permanent_session_lifetime
    session["admin"] = username
    return {"user": username}


@action("me")
def me(_data):
    return {"user": session.get("admin")}


@action("logout")
def logout(_data):
    session.clear()
    return {"ok": True}


# ---------- Website ----------

@app.route("/")
def home():
    return send_from_directory("frontend", "index.html")


if __name__ == "__main__":
    app.run(port=5000, debug=False)
