const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_it';

// ===== ГЛАВНОЕ ИЗМЕНЕНИЕ ДЛЯ RAILWAY =====
// CORS - разрешаем запросы с любого источника в продакшене
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL || 'https://bakerybagel.up.railway.app'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));

app.use(express.json());

// Статические файлы (загруженные изображения)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Для продакшена — отдаём статику React (если фронт собран)
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../frontend/build');
  app.use(express.static(frontendBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

// Настройка multer для загрузки изображений
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = Date.now() + '-' + Math.round(Math.random() * 10000) + ext;
    cb(null, safeName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Только изображения! Поддерживаются форматы: jpg, png, gif, webp'));
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

// Инициализация базы данных
let db;

async function initDB() {
  db = await open({
    filename: './bakery.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      old_price DECIMAL(10,2),
      category_id INTEGER,
      image TEXT,
      weight TEXT,
      calories INTEGER,
      is_available BOOLEAN DEFAULT 1,
      is_on_sale BOOLEAN DEFAULT 0,
      sale_percent INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      UNIQUE(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS cart (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_number TEXT UNIQUE NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      delivery_address TEXT NOT NULL,
      delivery_date DATE,
      delivery_time TEXT,
      phone TEXT NOT NULL,
      comment TEXT,
      status TEXT DEFAULT 'pending',
      payment_method TEXT,
      payment_status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      quantity INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      discount_percent INTEGER,
      code TEXT UNIQUE,
      start_date DATE,
      end_date DATE,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Добавление тестовых категорий
  const categoriesCount = await db.get('SELECT COUNT(*) as count FROM categories');
  if (categoriesCount.count === 0) {
    await db.exec(`
      INSERT INTO categories (name, description) VALUES
      ('Классические', 'Традиционные бейглы с мясными и рыбными начинками'),
      ('Новинки', 'Сезонные и авторские бейглы'),
      ('Сладкие', 'Десертные бейглы с ягодами и фруктами');
    `);
  }

  // Добавление тестовых товаров
  const productsCount = await db.get('SELECT COUNT(*) as count FROM products');
  if (productsCount.count === 0) {
    await db.exec(`
      INSERT INTO products (name, description, price, category_id, image, weight, calories, is_available, is_on_sale, sale_percent) VALUES
      ('Средиземноморский бейгл', 'Ветчина, листья салата, плавленый сыр, помидор, маринованный огурец, лук, оливки', 350, 1, '/images/med.svg', '250г', 450, 1, 0, NULL),
      ('Бейгл с беконом', 'Жареный бекон, яичница-болтунья, творожный сыр', 320, 1, '/images/bac.svg', '280г', 520, 1, 0, NULL),
      ('Бейгл с креветкой', 'Креветки, майонез, огурец, руккола, листья салата', 420, 1, '/images/shr.svg', '260г', 380, 1, 0, NULL),
      ('Бейгл с лососем', 'Лосось, творожный сыр, листья салата, ростки брокколи, лимон', 450, 1, '/images/sal.svg', '270г', 490, 1, 1, 10),
      ('Итальянский бейгл', 'Прошутто, творожный сыр, груша, руккола', 380, 1, '/images/ita.svg', '260г', 470, 1, 0, NULL),
      ('Бейгл Бенедикт', 'Яйцо Бенедикт, авокадо пюре, руккола', 370, 1, '/images/ben.svg', '250г', 510, 1, 0, NULL),
      ('Солнечный бейгл', 'Желтые томаты, свежие листья салата, микрозелень', 340, 2, '/images/sun.svg', '240г', 320, 1, 1, 15),
      ('Сибирский бейгл', 'Буженина, свекла, укроп', 360, 2, '/images/sib.svg', '270г', 430, 1, 0, NULL),
      ('Летний бейгл', 'Ванильное мороженое, малиновый соус, малина, голубика, мята', 380, 2, '/images/sum.svg', '220г', 480, 1, 0, NULL),
      ('Нежный клубничный бейгл', 'Клубника, сливочный сыр, мята, кокосовая стружка', 320, 3, '/images/sof.svg', '230г', 420, 1, 0, NULL),
      ('Лесной ягодный бейгл', 'Сливочный сыр, малина, голубика, мята', 340, 3, '/images/wil.svg', '230г', 410, 1, 1, 10),
      ('Хрустящий клубничный бейгл', 'Клубника, сливочный сыр, грецкие орехи, мята', 350, 3, '/images/har.svg', '240г', 460, 1, 0, NULL);
    `);
  }

  // Добавление тестового админа
  const adminExists = await db.get('SELECT * FROM users WHERE email = ?', 'admin@example.com');
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.run(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
      ['admin@example.com', hashedPassword, 'Администратор', 'admin']
    );
  }

  // Добавление тестовой акции
  const promoCount = await db.get('SELECT COUNT(*) as count FROM promotions');
  if (promoCount.count === 0) {
    await db.exec(`
      INSERT INTO promotions (title, description, discount_percent, start_date, end_date, is_active) VALUES
      ('Скидка 20% на первый заказ', 'При первом заказе скидка 20%', 20, date('now'), date('now', '+30 days'), 1),
      ('Сладкая пятница', 'По пятницам скидка 15% на всё', 15, date('now'), date('now', '+60 days'), 1);
    `);
  }

  console.log('Database initialized');
}

// Middleware для проверки JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Недействительный токен' });
    }
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора.' });
  }
  next();
};

// ==================== ВСЕ ТВОИ API-МАРШРУТЫ ====================
// (оставляем всё как есть, они не меняются)

app.post('/api/auth/register', [
  body('email').isEmail().withMessage('Неверный формат email'),
  body('password').isLength({ min: 6 }).withMessage('Пароль должен быть не менее 6 символов'),
  body('name').notEmpty().withMessage('Имя обязательно')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, name, phone, address } = req.body;

  try {
    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', email);
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (email, password, name, phone, address, role) VALUES (?, ?, ?, ?, ?, ?)',
      [email, hashedPassword, name, phone || '', address || '', 'user']
    );

    const token = jwt.sign(
      { id: result.lastID, email, name, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: result.lastID, email, name, phone, address, role: 'user' }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await db.get('SELECT * FROM users WHERE email = ?', email);
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        address: user.address,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, email, name, phone, address, role, created_at FROM users WHERE id = ?',
      req.user.id
    );
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  const { name, phone, address } = req.body;

  try {
    await db.run(
      'UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?',
      [name, phone, address, req.user.id]
    );
    res.json({ message: 'Профиль обновлен' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ТОВАРЫ ====================

app.get('/api/products', async (req, res) => {
  const { category, search, minPrice, maxPrice, isOnSale, sort } = req.query;

  let query = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_available = 1';
  const params = [];

  if (category) {
    query += ' AND p.category_id = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (minPrice) {
    query += ' AND p.price >= ?';
    params.push(minPrice);
  }

  if (maxPrice) {
    query += ' AND p.price <= ?';
    params.push(maxPrice);
  }

  if (isOnSale === 'true') {
    query += ' AND p.is_on_sale = 1';
  }

  if (sort === 'price_asc') {
    query += ' ORDER BY p.price ASC';
  } else if (sort === 'price_desc') {
    query += ' ORDER BY p.price DESC';
  } else if (sort === 'newest') {
    query += ' ORDER BY p.created_at DESC';
  } else {
    query += ' ORDER BY p.id';
  }

  try {
    const products = await db.all(query, params);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await db.get(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?',
      req.params.id
    );
    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.all('SELECT * FROM categories');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== КОРЗИНА ====================

app.get('/api/cart', authenticateToken, async (req, res) => {
  try {
    const cartItems = await db.all(
      `SELECT c.*, p.name, p.price, p.image, p.is_on_sale, p.old_price 
       FROM cart c 
       JOIN products p ON c.product_id = p.id 
       WHERE c.user_id = ?`,
      req.user.id
    );
    res.json(cartItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cart', authenticateToken, async (req, res) => {
  const { product_id, quantity = 1 } = req.body;

  try {
    const existing = await db.get(
      'SELECT * FROM cart WHERE user_id = ? AND product_id = ?',
      [req.user.id, product_id]
    );

    if (existing) {
      await db.run(
        'UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
        [quantity, req.user.id, product_id]
      );
    } else {
      await db.run(
        'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
        [req.user.id, product_id, quantity]
      );
    }

    res.json({ message: 'Товар добавлен в корзину' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/cart/:id', authenticateToken, async (req, res) => {
  const { quantity } = req.body;

  try {
    await db.run(
      'UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?',
      [quantity, req.params.id, req.user.id]
    );
    res.json({ message: 'Корзина обновлена' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/cart/:id', authenticateToken, async (req, res) => {
  try {
    await db.run('DELETE FROM cart WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Товар удален из корзины' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/cart', authenticateToken, async (req, res) => {
  try {
    await db.run('DELETE FROM cart WHERE user_id = ?', req.user.id);
    res.json({ message: 'Корзина очищена' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ИЗБРАННОЕ ====================

app.get('/api/favorites', authenticateToken, async (req, res) => {
  try {
    const favorites = await db.all(
      `SELECT f.*, p.name, p.price, p.image, p.description 
       FROM favorites f 
       JOIN products p ON f.product_id = p.id 
       WHERE f.user_id = ?`,
      req.user.id
    );
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/favorites', authenticateToken, async (req, res) => {
  const { product_id } = req.body;

  try {
    await db.run(
      'INSERT INTO favorites (user_id, product_id) VALUES (?, ?)',
      [req.user.id, product_id]
    );
    res.json({ message: 'Добавлено в избранное' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/favorites/:product_id', authenticateToken, async (req, res) => {
  try {
    await db.run(
      'DELETE FROM favorites WHERE user_id = ? AND product_id = ?',
      [req.user.id, req.params.product_id]
    );
    res.json({ message: 'Удалено из избранного' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ЗАКАЗЫ ====================

app.post('/api/orders', authenticateToken, async (req, res) => {
  const { delivery_address, delivery_date, delivery_time, phone, comment, payment_method } = req.body;

  try {
    const cartItems = await db.all(
      `SELECT c.*, p.name, p.price 
       FROM cart c 
       JOIN products p ON c.product_id = p.id 
       WHERE c.user_id = ?`,
      req.user.id
    );

    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Корзина пуста' });
    }

    const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const result = await db.run(
      `INSERT INTO orders (user_id, order_number, total_amount, delivery_address, delivery_date, delivery_time, phone, comment, payment_method) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, orderNumber, totalAmount, delivery_address, delivery_date, delivery_time, phone, comment, payment_method]
    );

    for (const item of cartItems) {
      await db.run(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity) 
         VALUES (?, ?, ?, ?, ?)`,
        [result.lastID, item.product_id, item.name, item.price, item.quantity]
      );
    }

    await db.run('DELETE FROM cart WHERE user_id = ?', req.user.id);

    res.json({ 
      message: 'Заказ успешно создан', 
      orderId: result.lastID,
      orderNumber 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await db.all(
      `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
      req.user.id
    );
    
    for (const order of orders) {
      order.items = await db.all(
        `SELECT * FROM order_items WHERE order_id = ?`,
        order.id
      );
    }
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    let query = `SELECT o.*, u.name as user_name 
                 FROM orders o 
                 JOIN users u ON o.user_id = u.id 
                 WHERE o.id = ?`;
    let params = [req.params.id];
    
    if (req.user.role !== 'admin') {
      query += ` AND o.user_id = ?`;
      params.push(req.user.id);
    }
    
    const order = await db.get(query, params);
    
    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }
    
    const items = await db.all(
      `SELECT * FROM order_items WHERE order_id = ?`,
      [order.id]
    );
    
    res.json(items);
  } catch (error) {
    console.error('Ошибка получения заказа:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== АДМИН-ПАНЕЛЬ ====================

app.get('/api/admin/products', authenticateToken, isAdmin, async (req, res) => {
  try {
    const products = await db.all(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id'
    );
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/products', authenticateToken, isAdmin, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Ошибка загрузки файла:', err);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  const { name, description, price, old_price, category_id, weight, calories, is_available, is_on_sale, sale_percent } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const result = await db.run(
      `INSERT INTO products (name, description, price, old_price, category_id, image, weight, calories, is_available, is_on_sale, sale_percent) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, price, old_price, category_id, image, weight, calories, is_available || 1, is_on_sale || 0, sale_percent]
    );
    
    res.json({ message: 'Товар добавлен', id: result.lastID });
  } catch (error) {
    console.error('Ошибка добавления товара:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/products/:id', authenticateToken, isAdmin, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Ошибка загрузки файла:', err);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  const { name, description, price, old_price, category_id, weight, calories, is_available, is_on_sale, sale_percent } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    let query = `UPDATE products SET name=?, description=?, price=?, old_price=?, category_id=?, weight=?, calories=?, is_available=?, is_on_sale=?, sale_percent=?`;
    const params = [name, description, price, old_price, category_id, weight, calories, is_available, is_on_sale, sale_percent];
    
    if (image) {
      query += `, image=?`;
      params.push(image);
    }
    
    query += ` WHERE id=?`;
    params.push(req.params.id);
    
    await db.run(query, params);
    res.json({ message: 'Товар обновлен' });
  } catch (error) {
    console.error('Ошибка обновления товара:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/products/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await db.run('DELETE FROM products WHERE id = ?', req.params.id);
    res.json({ message: 'Товар удален' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/orders', authenticateToken, isAdmin, async (req, res) => {
  try {
    const orders = await db.all(
      `SELECT o.*, u.name as user_name, u.email as user_email 
       FROM orders o 
       JOIN users u ON o.user_id = u.id 
       ORDER BY o.created_at DESC`
    );
    
    for (const order of orders) {
      order.items = await db.all(
        `SELECT * FROM order_items WHERE order_id = ?`,
        [order.id]
      );
    }
    
    res.json(orders);
  } catch (error) {
    console.error('Ошибка получения заказов:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/orders/:id/status', authenticateToken, isAdmin, async (req, res) => {
  const { status } = req.body;

  try {
    await db.run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Статус заказа обновлен' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await db.all(
      'SELECT id, email, name, phone, address, role, created_at FROM users'
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/promotions', async (req, res) => {
  try {
    const promotions = await db.all(
      "SELECT * FROM promotions WHERE is_active = 1 AND date('now') BETWEEN start_date AND end_date"
    );
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/promotions', authenticateToken, isAdmin, async (req, res) => {
  const { title, description, discount_percent, code, start_date, end_date } = req.body;

  try {
    await db.run(
      `INSERT INTO promotions (title, description, discount_percent, code, start_date, end_date) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, description, discount_percent, code, start_date, end_date]
    );
    res.json({ message: 'Акция добавлена' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reviews', authenticateToken, async (req, res) => {
  const { product_id, rating, comment } = req.body;

  try {
    await db.run(
      'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
      [product_id, req.user.id, rating, comment]
    );
    res.json({ message: 'Отзыв добавлен' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/:product_id/reviews', async (req, res) => {
  try {
    const reviews = await db.all(
      `SELECT r.*, u.name as user_name 
       FROM reviews r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.product_id = ? 
       ORDER BY r.created_at DESC`,
      req.params.product_id
    );
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const totalUsers = await db.get('SELECT COUNT(*) as count FROM users WHERE role = "user"');
    const totalOrders = await db.get('SELECT COUNT(*) as count FROM orders');
    const totalProducts = await db.get('SELECT COUNT(*) as count FROM products');
    const totalRevenue = await db.get('SELECT SUM(total_amount) as total FROM orders');
    const recentOrders = await db.all('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5');
    
    res.json({
      users: totalUsers.count,
      orders: totalOrders.count,
      products: totalProducts.count,
      revenue: totalRevenue.total || 0,
      recentOrders
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ЗАПУСК СЕРВЕРА (адаптирован для Railway) =====
async function startServer() {
  await initDB();
  
  const fs = require('fs');
  if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
  }
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`🔐 Админ панель: admin@example.com / admin123`);
    console.log(`🚀 Режим: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(console.error);