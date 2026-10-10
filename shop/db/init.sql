SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  emoji VARCHAR(8) NOT NULL DEFAULT 'box'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  qty INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO products (name, description, price, stock, emoji) VALUES
('Ceramic Pour-Over Set','Dripper, carafe and two cups in matte stoneware.',2499.00,25,'☕'),
('Linen Tote Bag','Heavy washed linen with an inner zip pocket.',899.00,60,'👜'),
('Brass Desk Lamp','Adjustable arm, warm LED bulb included.',3299.00,15,'💡'),
('Merino Beanie','Ribbed, soft and itch-free. One size.',1199.00,40,'🧶'),
('Steel Water Bottle','750 ml, keeps drinks cold for 24 hours.',1499.00,80,'🍶'),
('Notebook Trio','Three dot-grid notebooks, A5, stitched binding.',649.00,100,'📓');
