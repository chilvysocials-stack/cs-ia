-- Sathi Café database. Import this once (e.g. in phpMyAdmin → Import).

CREATE DATABASE IF NOT EXISTS sathi_cafe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sathi_cafe;

DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS admins;

CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL -- bcrypt hash from PHP password_hash(), never the plain password
);

CREATE TABLE menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  description VARCHAR(160) NOT NULL DEFAULT '',
  price INT UNSIGNED NOT NULL,
  category ENUM('drinks', 'breakfast', 'momo', 'mains', 'special') NOT NULL,
  subcategory VARCHAR(40) NOT NULL DEFAULT '',
  type ENUM('veg', 'nonveg') NOT NULL,
  in_stock BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE, -- shown on the customer menu
  popular BOOLEAN NOT NULL DEFAULT FALSE
);

-- Login: admin / sathi123
INSERT INTO admins (username, password_hash) VALUES
  ('admin', '$2y$12$T6vYcj3iD/n/Pv0dRPPFHeUxOd0t82B97c2TiffKT6u2Rks6fmTlO');

INSERT INTO menu_items (name, description, price, category, subcategory, type, popular) VALUES
  ('Lassi', 'Thick chilled yogurt drink, sweet or salted', 950, 'drinks', 'Lassi', 'veg', TRUE),
  ('Masala Chai', 'Spiced tea with ginger, cardamom and cloves', 250, 'drinks', 'Hot Beverage', 'veg', TRUE),
  ('Mango Smoothie', 'Fresh mango blended with milk and honey', 750, 'drinks', 'Smoothies', 'veg', FALSE),
  ('Iced Americano', 'Double-shot espresso poured over ice', 350, 'drinks', 'Iced Coffee', 'veg', FALSE),
  ('Fresh Lime Soda', 'Refreshing lime soda, sweet or salted', 300, 'drinks', 'Refreshers', 'veg', FALSE),
  ('Hot Chocolate', 'Rich cocoa with steamed milk and cream', 400, 'drinks', 'Hot Beverage', 'veg', FALSE),
  ('Banana Shake', 'Creamy banana shake with vanilla ice cream', 550, 'drinks', 'Thick Shakes', 'veg', FALSE),
  ('Mint Refresher', 'Fresh mint cooler with lime and soda water', 350, 'drinks', 'Refreshers', 'veg', FALSE),

  ('Aloo Paratha', 'Stuffed flatbread with spiced potato filling', 450, 'breakfast', 'Parathas', 'veg', TRUE),
  ('Egg Benedict', 'Poached eggs on toast with hollandaise sauce', 650, 'breakfast', 'Eggs', 'nonveg', FALSE),
  ('Pancake Stack', 'Fluffy pancakes with maple syrup and butter', 500, 'breakfast', 'Pancakes', 'veg', TRUE),
  ('French Toast', 'Golden toast with cinnamon and fresh berries', 400, 'breakfast', 'Toast', 'nonveg', FALSE),
  ('Nepali Breakfast', 'Dal bhat with pickles and seasonal greens', 350, 'breakfast', 'Nepali', 'veg', FALSE),
  ('Omelette Platter', 'Three-egg omelette with cheese and herbs', 400, 'breakfast', 'Eggs', 'nonveg', FALSE),
  ('Granola Bowl', 'Crunchy granola with yogurt and fresh fruits', 500, 'breakfast', 'Continental', 'veg', FALSE),
  ('Croissant Plate', 'Butter croissant with jam and cream cheese', 350, 'breakfast', 'Continental', 'veg', FALSE),

  ('Chicken Momo', 'Steamed dumplings with spiced chicken filling', 550, 'momo', 'Chicken Momo', 'nonveg', TRUE),
  ('Veg Momo', 'Steamed dumplings with mixed vegetable filling', 450, 'momo', 'Veg Momo', 'veg', FALSE),
  ('Jhol Momo', 'Dumplings in spicy sesame-tomato soup broth', 600, 'momo', 'Jhol Momo', 'nonveg', FALSE),
  ('Chow Mein', 'Stir-fried noodles with vegetables and soy sauce', 400, 'momo', 'Chow Mein', 'veg', TRUE),
  ('Thukpa', 'Tibetan noodle soup with vegetables and spices', 500, 'momo', 'Thukpa', 'veg', FALSE),
  ('Pan Fried Momo', 'Crispy fried dumplings with tangy dipping sauce', 600, 'momo', 'Pan Fried', 'nonveg', FALSE),
  ('Buff Momo', 'Traditional buffalo meat steamed dumplings', 500, 'momo', 'Buff Momo', 'nonveg', FALSE),
  ('Chili Momo', 'Spicy stir-fried momo with bell peppers', 550, 'momo', 'Pan Fried', 'nonveg', FALSE),

  ('Grilled Chicken', 'Marinated chicken grilled over charcoal fire', 850, 'mains', 'Chicken', 'nonveg', TRUE),
  ('Mutton Curry', 'Slow-cooked mutton in aromatic Nepali spices', 950, 'mains', 'Mutton', 'nonveg', FALSE),
  ('Fish Fry', 'Crispy fried river fish with tartar sauce', 750, 'mains', 'Fish', 'nonveg', FALSE),
  ('Dal Bhat Set', 'Traditional Nepali thali with all the fixings', 550, 'mains', 'Dal', 'veg', FALSE),
  ('Paneer Tikka', 'Grilled cottage cheese with mint chutney', 600, 'mains', 'Vegetarian', 'veg', FALSE),
  ('Chicken Biryani', 'Fragrant rice with tender spiced chicken', 700, 'mains', 'Rice', 'nonveg', FALSE),
  ('Mushroom Curry', 'Wild mushrooms in creamy aromatic gravy', 500, 'mains', 'Vegetarian', 'veg', FALSE),
  ('Lamb Chops', 'Herb-crusted lamb chops with seasonal sides', 1100, 'mains', 'Mutton', 'nonveg', FALSE),

  ('Sathi Thali', 'Chef''s special platter with dal, rice, and sides', 1200, 'special', 'Chef''s Pick', 'veg', TRUE),
  ('Himalayan Trout', 'Fresh river trout with herb butter sauce', 1100, 'special', 'Seasonal', 'nonveg', FALSE),
  ('Sekuwa Platter', 'Nepali-style BBQ with assorted three meats', 1300, 'special', 'Signature', 'nonveg', FALSE),
  ('Royal Biryani', 'Premium saffron biryani with tender lamb', 1000, 'special', 'House Special', 'nonveg', FALSE),
  ('Newari Feast', 'Traditional Newari delicacy sampler platter', 1500, 'special', 'Weekend', 'nonveg', FALSE),
  ('Garden Bowl', 'Seasonal vegetables with quinoa and dressing', 650, 'special', 'Seasonal', 'veg', FALSE),
  ('Tandoori Grill', 'Assorted tandoori meats with paneer tikka', 1200, 'special', 'Signature', 'nonveg', FALSE),
  ('Dessert Trio', 'Three signature desserts of the day by chef', 550, 'special', 'New', 'veg', FALSE);
