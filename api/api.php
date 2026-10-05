<?php
/*
 * Sathi Café API. The pages call api.php?action=... and get JSON back.
 *
 *   Anyone:      list (items shown on the menu), login, me
 *   Admin only:  all, create, update, delete, replace, adjust_prices,
 *                stats, activity, logout
 */
require __DIR__ . '/config.php';

const CATEGORIES = ['drinks', 'breakfast', 'momo', 'mains', 'special'];
const COLUMNS = 'name, description, price, category, subcategory, type, in_stock, active, popular';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 5 * 60;

// Keep admins logged in for 8 hours (across tabs) using a PHP session cookie.
ini_set('session.gc_maxlifetime', 8 * 3600);
session_set_cookie_params(['lifetime' => 8 * 3600, 'httponly' => true, 'samesite' => 'Strict']);
session_start();

header('Content-Type: application/json');

function respond($data, $status = 200)
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function fail($message, $status = 400)
{
    respond(['error' => $message], $status);
}

function requireAdmin()
{
    if (empty($_SESSION['admin'])) fail('Please log in again.', 401);
}

set_exception_handler(function ($e) {
    fail('Server error: ' . $e->getMessage(), 500);
});

// Record who changed what, for the activity log.
function logActivity($db, $action, $details)
{
    $db->prepare('INSERT INTO activity_log (admin, action, details) VALUES (?, ?, ?)')
        ->execute([$_SESSION['admin'], $action, $details]);
}

// Turn a database row into the shape the JavaScript uses.
function toItem($row)
{
    return [
        'id' => (int) $row['id'],
        'name' => $row['name'],
        'description' => $row['description'],
        'price' => (int) $row['price'],
        'category' => $row['category'],
        'subcategory' => $row['subcategory'],
        'type' => $row['type'],
        'inStock' => (bool) $row['in_stock'],
        'active' => (bool) $row['active'],
        'popular' => (bool) $row['popular'],
    ];
}

// Server-side validation: never trust what the browser sends.
// Returns the values in COLUMNS order, ready for a prepared statement.
function validItem($item)
{
    $name = trim($item['name'] ?? '');
    $price = $item['price'] ?? null;
    if ($name === '' || strlen($name) > 60) fail('Name must be 1 to 60 characters.');
    if (!is_int($price) || $price <= 0) fail('Price must be a whole number above 0.');
    if (!in_array($item['category'] ?? '', CATEGORIES, true)) fail('Unknown category.');
    if (!in_array($item['type'] ?? '', ['veg', 'nonveg'], true)) fail('Type must be veg or nonveg.');

    return [
        $name,
        trim($item['description'] ?? ''),
        $price,
        $item['category'],
        trim($item['subcategory'] ?? ''),
        $item['type'],
        (int) !empty($item['inStock']),
        (int) !empty($item['active']),
        (int) !empty($item['popular']),
    ];
}

$db = new PDO(
    'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
    DB_USER,
    DB_PASS,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
);

$input = json_decode(file_get_contents('php://input'), true) ?? [];

switch ($_GET['action'] ?? '') {
    case 'list': // customer menu: only items switched on
        respond(array_map('toItem', $db->query('SELECT * FROM menu_items WHERE active = 1 ORDER BY id')->fetchAll()));

    case 'all': // admin panel: every item
        requireAdmin();
        respond(array_map('toItem', $db->query('SELECT * FROM menu_items ORDER BY id')->fetchAll()));

    case 'create':
        requireAdmin();
        $db->prepare('INSERT INTO menu_items (' . COLUMNS . ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
            ->execute(validItem($input));
        $id = (int) $db->lastInsertId();
        logActivity($db, 'Added', trim($input['name']));
        respond(['id' => $id]);

    case 'update':
        requireAdmin();
        $values = validItem($input);
        $values[] = (int) ($input['id'] ?? 0);
        $db->prepare('UPDATE menu_items SET name = ?, description = ?, price = ?, category = ?, subcategory = ?,
                      type = ?, in_stock = ?, active = ?, popular = ? WHERE id = ?')
            ->execute($values);
        logActivity($db, 'Edited', $values[0]);
        respond(['ok' => true]);

    case 'delete':
        requireAdmin();
        $id = (int) ($input['id'] ?? 0);
        $stmt = $db->prepare('SELECT name FROM menu_items WHERE id = ?');
        $stmt->execute([$id]);
        $db->prepare('DELETE FROM menu_items WHERE id = ?')->execute([$id]);
        logActivity($db, 'Deleted', (string) $stmt->fetchColumn());
        respond(['ok' => true]);

    case 'replace': // CSV import and undo: swap the whole menu in one transaction
        requireAdmin();
        $items = $input['items'] ?? null;
        if (!is_array($items)) fail('No items sent.');
        $rows = array_map('validItem', $items); // check every item before changing anything

        $db->beginTransaction();
        $db->exec('DELETE FROM menu_items');
        $insert = $db->prepare('INSERT INTO menu_items (id, ' . COLUMNS . ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        foreach ($items as $i => $item) {
            $insert->execute(array_merge([$item['id'] ?? null], $rows[$i])); // null id = next free id
        }
        $db->commit();
        if (($input['reason'] ?? '') === 'undo') {
            logActivity($db, 'Undo', 'Restored the previous menu');
        } else {
            logActivity($db, 'Imported CSV', count($items) . ' items');
        }
        respond(['ok' => true]);

    case 'adjust_prices': // raise or lower prices by a percentage, for one category or all
        requireAdmin();
        $percent = $input['percent'] ?? null;
        $category = $input['category'] ?? 'all';
        if (!is_int($percent) || $percent === 0 || $percent < -50 || $percent > 100) {
            fail('Enter a whole-number percentage from -50 to 100 (not 0).');
        }
        $sql = 'UPDATE menu_items SET price = GREATEST(1, ROUND(price * (100 + ?) / 100))';
        $params = [$percent];
        if ($category !== 'all') {
            if (!in_array($category, CATEGORIES, true)) fail('Unknown category.');
            $sql .= ' WHERE category = ?';
            $params[] = $category;
        }
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        logActivity($db, 'Changed prices', ($percent > 0 ? '+' : '') . $percent . '% on ' . $category . ' (' . $stmt->rowCount() . ' items)');
        respond(['changed' => $stmt->rowCount()]);

    case 'stats': // dashboard numbers, worked out by MySQL
        requireAdmin();
        $row = $db->query('SELECT COUNT(*) AS total, SUM(active = 0) AS hidden, SUM(in_stock = 0) AS outOfStock,
                                  ROUND(AVG(price)) AS averagePrice FROM menu_items')->fetch();
        respond(array_map('intval', $row));

    case 'activity': // the 8 most recent changes
        requireAdmin();
        respond($db->query('SELECT admin, action, details, created_at AS time FROM activity_log
                            ORDER BY id DESC LIMIT 8')->fetchAll());

    case 'login':
        // Lock the login for a while after too many wrong passwords (stops guessing).
        $wait = ($_SESSION['lockedUntil'] ?? 0) - time();
        if ($wait > 0) fail('Too many wrong attempts. Try again in ' . ceil($wait / 60) . ' minute(s).', 429);

        $stmt = $db->prepare('SELECT password_hash FROM admins WHERE username = ?');
        $stmt->execute([$input['username'] ?? '']);
        $hash = $stmt->fetchColumn();
        // password_verify checks the typed password against the stored bcrypt hash.
        if (!$hash || !password_verify($input['password'] ?? '', $hash)) {
            $_SESSION['failedLogins'] = ($_SESSION['failedLogins'] ?? 0) + 1;
            $left = MAX_LOGIN_ATTEMPTS - $_SESSION['failedLogins'];
            if ($left <= 0) {
                $_SESSION['failedLogins'] = 0;
                $_SESSION['lockedUntil'] = time() + LOCKOUT_SECONDS;
                fail('Too many wrong attempts. Login is locked for 5 minutes.', 429);
            }
            fail("Incorrect username or password. $left attempt(s) left.", 401);
        }
        unset($_SESSION['failedLogins'], $_SESSION['lockedUntil']);
        session_regenerate_id(true);
        $_SESSION['admin'] = $input['username'];
        respond(['user' => $_SESSION['admin']]);

    case 'me':
        respond(['user' => $_SESSION['admin'] ?? null]);

    case 'logout':
        session_destroy();
        respond(['ok' => true]);

    default:
        fail('Unknown action.', 404);
}
