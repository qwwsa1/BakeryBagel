const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { Pool } = require('pg');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_it';

// CORS
app.use(cors({
  origin: ['http://localhost:3000', 'https://bakerybagel-production.up.railway.app'],
  credentials: true
}));

app.use(express.json());

// PostgreSQL подключение
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Статические файлы (загруженные изображения)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Настройка multer для загрузки изображений
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
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
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        old_price DECIMAL(10,2),
        category_id INTEGER REFERENCES categories(id),
        image TEXT,
        weight TEXT,
        calories INTEGER,
        is_available BOOLEAN DEFAULT TRUE,
        is_on_sale BOOLEAN DEFAULT FALSE,
        sale_percent INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        product_id INTEGER REFERENCES products(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cart (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id),
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        quantity INTEGER NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS promotions (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        discount_percent INTEGER,
        code TEXT UNIQUE,
        start_date DATE,
        end_date DATE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id),
        user_id INTEGER REFERENCES users(id),
        rating INTEGER CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Добавление тестовых категорий
    const categoriesResult = await pool.query('SELECT COUNT(*) FROM categories');
    if (parseInt(categoriesResult.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO categories (name, description) VALUES
        ('Классические', 'Традиционные бейглы с мясными и рыбными начинками'),
        ('Новинки', 'Сезонные и авторские бейглы'),
        ('Сладкие', 'Десертные бейглы с ягодами и фруктами')
      `);
    }

    // Добавление тестовых товаров
    const productsResult = await pool.query('SELECT COUNT(*) FROM products');
    if (parseInt(productsResult.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO products (name, description, price, category_id, image, weight, calories, is_available, is_on_sale, sale_percent) VALUES
        ('Средиземноморский бейгл', 'Ветчина, листья салата, плавленый сыр, помидор, маринованный огурец, лук, оливки', 350, 1, '/images/med.svg', '250г', 450, true, false, NULL),
        ('Бейгл с беконом', 'Жареный бекон, яичница-болтунья, творожный сыр', 320, 1, '/images/bac.svg', '280г', 520, true, false, NULL),
        ('Бейгл с креветкой', 'Креветки, майонез, огурец, руккола, листья салата', 420, 1, '/images/shr.svg', '260г', 380, true, false, NULL),
        ('Бейгл с лососем', 'Лосось, творожный сыр, листья салата, ростки брокколи, лимон', 450, 1, '/images/sal.svg', '270г', 490, true, true, 10),
        ('Итальянский бейгл', 'Прошутто, творожный сыр, груша, руккола', 380, 1, '/images/ita.svg', '260г', 470, true, false, NULL),
        ('Бейгл Бенедикт', 'Яйцо Бенедикт, авокадо пюре, руккола', 370, 1, '/images/ben.svg', '250г', 510, true, false, NULL),
        ('Солнечный бейгл', 'Желтые томаты, свежие листья салата, микрозелень', 340, 2, '/images/sun.svg', '240г', 320, true, true, 15),
        ('Сибирский бейгл', 'Буженина, свекла, укроп', 360, 2, '/images/sib.svg', '270г', 430, true, false, NULL),
        ('Летний бейгл', 'Ванильное мороженое, малиновый соус, малина, голубика, мята', 380, 2, '/images/sum.svg', '220г', 480, true, false, NULL),
        ('Нежный клубничный бейгл', 'Клубника, сливочный сыр, мята, кокосовая стружка', 320, 3, '/images/sof.svg', '230г', 420, true, false, NULL),
        ('Лесной ягодный бейгл', 'Сливочный сыр, малина, голубика, мята', 340, 3, '/images/wil.svg', '230г', 410, true, true, 10),
        ('Хрустящий клубничный бейгл', 'Клубника, сливочный сыр, грецкие орехи, мята', 350, 3, '/images/har.svg', '240г', 460, true, false, NULL)
      `);
    }

    // Добавление тестового админа
    const adminResult = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@example.com']);
    if (adminResult.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)',
        ['admin@example.com', hashedPassword, 'Администратор', 'admin']
      );
    }

    // Добавление тестовых акций
    const promoResult = await pool.query('SELECT COUNT(*) FROM promotions');
    if (parseInt(promoResult.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO promotions (title, description, discount_percent, start_date, end_date, is_active) VALUES
        ('Скидка 20% на первый заказ', 'При первом заказе скидка 20%', 20, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', true),
        ('Сладкая пятница', 'По пятницам скидка 15% на всё', 15, CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days', true)
      `);
    }

    console.log('PostgreSQL Database initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
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

// ==================== ВСЕ API МАРШРУТЫ ====================

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
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, name, phone, address, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [email, hashedPassword, name, phone || '', address || '', 'user']
    );

    const token = jwt.sign(
      { id: result.rows[0].id, email, name, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: result.rows[0].id, email, name, phone, address, role: 'user' }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    
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
    const result = await pool.query(
      'SELECT id, email, name, phone, address, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  const { name, phone, address } = req.body;

  try {
    await pool.query(
      'UPDATE users SET name = $1, phone = $2, address = $3 WHERE id = $4',
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

  let query = `
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE p.is_available = true
  `;
  const params = [];
  let paramIndex = 1;

  if (category) {
    query += ` AND p.category_id = $${paramIndex++}`;
    params.push(category);
  }

  if (search) {
    query += ` AND (p.name ILIKE $${paramIndex++} OR p.description ILIKE $${paramIndex++})`;
    params.push(`%${search}%`, `%${search}%`);
  }

  if (minPrice) {
    query += ` AND p.price >= $${paramIndex++}`;
    params.push(minPrice);
  }

  if (maxPrice) {
    query += ` AND p.price <= $${paramIndex++}`;
    params.push(maxPrice);
  }

  if (isOnSale === 'true') {
    query += ` AND p.is_on_sale = true`;
  }

  if (sort === 'price_asc') {
    query += ' ORDER BY p.price ASC';
  } else if (sort === 'price_desc') {
    query += ' ORDER BY p.price DESC';
  } else {
    query += ' ORDER BY p.id';
  }

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== КОРЗИНА ====================

app.get('/api/cart', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, p.name, p.price, p.image, p.is_on_sale, p.old_price 
       FROM cart c 
       JOIN products p ON c.product_id = p.id 
       WHERE c.user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cart', authenticateToken, async (req, res) => {
  const { product_id, quantity = 1 } = req.body;

  try {
    const existing = await pool.query(
      'SELECT * FROM cart WHERE user_id = $1 AND product_id = $2',
      [req.user.id, product_id]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE cart SET quantity = quantity + $1 WHERE user_id = $2 AND product_id = $3',
        [quantity, req.user.id, product_id]
      );
    } else {
      await pool.query(
        'INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3)',
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
    await pool.query(
      'UPDATE cart SET quantity = $1 WHERE id = $2 AND user_id = $3',
      [quantity, req.params.id, req.user.id]
    );
    res.json({ message: 'Корзина обновлена' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/cart/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Товар удален из корзины' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/cart', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Корзина очищена' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ИЗБРАННОЕ ====================

app.get('/api/favorites', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, p.name, p.price, p.image, p.description 
       FROM favorites f 
       JOIN products p ON f.product_id = p.id 
       WHERE f.user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/favorites', authenticateToken, async (req, res) => {
  const { product_id } = req.body;

  try {
    await pool.query(
      'INSERT INTO favorites (user_id, product_id) VALUES ($1, $2)',
      [req.user.id, product_id]
    );
    res.json({ message: 'Добавлено в избранное' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/favorites/:product_id', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM favorites WHERE user_id = $1 AND product_id = $2',
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
    const cartResult = await pool.query(
      `SELECT c.*, p.name, p.price 
       FROM cart c 
       JOIN products p ON c.product_id = p.id 
       WHERE c.user_id = $1`,
      [req.user.id]
    );

    const cartItems = cartResult.rows;

    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Корзина пуста' });
    }

    const totalAmount = cartItems.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const orderResult = await pool.query(
      `INSERT INTO orders (user_id, order_number, total_amount, delivery_address, delivery_date, delivery_time, phone, comment, payment_method) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [req.user.id, orderNumber, totalAmount, delivery_address, delivery_date, delivery_time, phone, comment, payment_method]
    );

    const orderId = orderResult.rows[0].id;

    for (const item of cartItems) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity) 
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.product_id, item.name, item.price, item.quantity]
      );
    }

    await pool.query('DELETE FROM cart WHERE user_id = $1', [req.user.id]);

    res.json({ 
      message: 'Заказ успешно создан', 
      orderId: orderId,
      orderNumber 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const ordersResult = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    
    const orders = ordersResult.rows;
    
    for (const order of orders) {
      const itemsResult = await pool.query(
        'SELECT * FROM order_items WHERE order_id = $1',
        [order.id]
      );
      order.items = itemsResult.rows;
    }
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT o.*, u.name as user_name 
      FROM orders o 
      JOIN users u ON o.user_id = u.id 
      WHERE o.id = $1
    `;
    let params = [req.params.id];
    
    if (req.user.role !== 'admin') {
      query += ` AND o.user_id = $2`;
      params.push(req.user.id);
    }
    
    const orderResult = await pool.query(query, params);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }
    
    const itemsResult = await pool.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [req.params.id]
    );
    
    res.json(itemsResult.rows);
  } catch (error) {
    console.error('Ошибка получения заказа:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== АДМИН-ПАНЕЛЬ ====================

app.get('/api/admin/products', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ИСПРАВЛЕННЫЙ МАРШРУТ ДОБАВЛЕНИЯ ТОВАРА =====
app.post('/api/admin/products', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
  console.log('=== ДОБАВЛЕНИЕ ТОВАРА ===');
  console.log('req.body:', req.body);
  console.log('req.file:', req.file);
  
  const { 
    name, description, price, old_price, category_id, 
    weight, calories, is_available, is_on_sale, sale_percent 
  } = req.body;
  
  const image = req.file ? `/uploads/${req.file.filename}` : null;
  
  // Преобразуем пустые строки в null для числовых полей
  const priceNum = price && price !== '' ? parseFloat(price) : null;
  const oldPriceNum = old_price && old_price !== '' ? parseFloat(old_price) : null;
  const categoryIdNum = category_id && category_id !== '' ? parseInt(category_id) : null;
  const caloriesNum = calories && calories !== '' ? parseInt(calories) : null;
  const salePercentNum = sale_percent && sale_percent !== '' ? parseInt(sale_percent) : null;
  
  // Преобразуем строковые значения в булевы
  const isAvailableBool = is_available === '1' || is_available === 'true' || is_available === true;
  const isOnSaleBool = is_on_sale === '1' || is_on_sale === 'true' || is_on_sale === true;

  console.log('Парсим данные:');
  console.log('  name:', name);
  console.log('  priceNum:', priceNum);
  console.log('  categoryIdNum:', categoryIdNum);
  console.log('  isAvailableBool:', isAvailableBool);

  try {
    const result = await pool.query(
      `INSERT INTO products (
        name, description, price, old_price, category_id, 
        image, weight, calories, is_available, is_on_sale, sale_percent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
        name, 
        description || null, 
        priceNum, 
        oldPriceNum, 
        categoryIdNum, 
        image, 
        weight || null, 
        caloriesNum, 
        isAvailableBool, 
        isOnSaleBool, 
        salePercentNum
      ]
    );
    
    console.log('✅ Товар добавлен! ID:', result.rows[0].id);
    res.json({ message: 'Товар добавлен', id: result.rows[0].id });
  } catch (error) {
    console.error('❌ Ошибка добавления товара:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/products/:id', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
  const { name, description, price, old_price, category_id, weight, calories, is_available, is_on_sale, sale_percent } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    let query = `UPDATE products SET name=$1, description=$2, price=$3, old_price=$4, category_id=$5, weight=$6, calories=$7, is_available=$8, is_on_sale=$9, sale_percent=$10`;
    const params = [name, description, price, old_price, category_id, weight, calories, is_available === '1' || is_available === true, is_on_sale === '1' || is_on_sale === true, sale_percent];
    let paramIndex = 11;
    
    if (image) {
      query += `, image=$${paramIndex++}`;
      params.push(image);
    }
    
    query += ` WHERE id=$${paramIndex}`;
    params.push(req.params.id);
    
    await pool.query(query, params);
    res.json({ message: 'Товар обновлен' });
  } catch (error) {
    console.error('Ошибка обновления товара:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/products/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ message: 'Товар удален' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/orders', authenticateToken, isAdmin, async (req, res) => {
  try {
    const ordersResult = await pool.query(
      `SELECT o.*, u.name as user_name, u.email as user_email 
       FROM orders o 
       JOIN users u ON o.user_id = u.id 
       ORDER BY o.created_at DESC`
    );
    
    const orders = ordersResult.rows;
    
    for (const order of orders) {
      const itemsResult = await pool.query(
        'SELECT * FROM order_items WHERE order_id = $1',
        [order.id]
      );
      order.items = itemsResult.rows;
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
    await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ message: 'Статус заказа обновлен' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, phone, address, role, created_at FROM users'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/promotions', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM promotions WHERE is_active = true AND CURRENT_DATE BETWEEN start_date AND end_date"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/promotions', authenticateToken, isAdmin, async (req, res) => {
  const { title, description, discount_percent, code, start_date, end_date } = req.body;

  try {
    await pool.query(
      `INSERT INTO promotions (title, description, discount_percent, code, start_date, end_date) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
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
    await pool.query(
      'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)',
      [product_id, req.user.id, rating, comment]
    );
    res.json({ message: 'Отзыв добавлен' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/:product_id/reviews', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.name as user_name 
       FROM reviews r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.product_id = $1 
       ORDER BY r.created_at DESC`,
      [req.params.product_id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['user']);
    const totalOrders = await pool.query('SELECT COUNT(*) as count FROM orders');
    const totalProducts = await pool.query('SELECT COUNT(*) as count FROM products');
    const totalRevenue = await pool.query('SELECT SUM(total_amount) as total FROM orders');
    const recentOrders = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5');
    
    res.json({
      users: parseInt(totalUsers.rows[0].count),
      orders: parseInt(totalOrders.rows[0].count),
      products: parseInt(totalProducts.rows[0].count),
      revenue: totalRevenue.rows[0].total || 0,
      recentOrders: recentOrders.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== СТАТИКА ДЛЯ ПРОДАКШЕНА =====
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../frontend/build');
  if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendBuildPath, 'index.html'));
    });
  }
}

// ===== ЗАПУСК СЕРВЕРА =====
async function startServer() {
  await initDB();
  
  if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
  }
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`🔐 Админ панель: admin@example.com / admin123`);
    console.log(`💾 База данных: PostgreSQL`);
  });
}

startServer().catch(console.error);