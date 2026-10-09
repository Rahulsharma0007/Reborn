const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const path = require('path');

const {
  DB_HOST = 'localhost',
  DB_PORT = 3306,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  JWT_SECRET,
  PORT = 3000
} = process.env;

if (!JWT_SECRET) {
  console.error('JWT_SECRET is required');
  process.exit(1);
}

const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  connectionLimit: 10,
  waitForConnections: true,
  decimalNumbers: true
});

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50kb' }));

app.use('/api/', rateLimit({
  windowMs: 60_000,
  max: 200
}));

const authLimit = rateLimit({
  windowMs: 15 * 60_000,
  max: 30
});

const wrap = fn => (req, res, next) =>
  fn(req, res, next).catch(next);

const sign = u =>
  jwt.sign(
    {
      id: u.id,
      name: u.name
    },
    JWT_SECRET,
    {
      expiresIn: '8h'
    }
  );

const auth = (req, res, next) => {
  try {
    req.user = jwt.verify(
      (req.headers.authorization || '').replace('Bearer ', ''),
      JWT_SECRET
    );

    next();
  } catch {
    res.status(401).json({
      error: 'Please log in to continue.'
    });
  }
};


/* =========================
   FRONTEND
   ========================= */

app.use(express.static(__dirname));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


/* =========================
   API ROUTES
   ========================= */

app.get('/api/health', wrap(async (_req, res) => {
  await pool.query('SELECT 1');

  res.json({
    status: 'ok'
  });
}));


app.get('/api/products', wrap(async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT id,name,description,price,stock,emoji FROM products ORDER BY id'
  );

  res.json(rows);
}));


app.post('/api/auth/register', authLimit, wrap(async (req, res) => {
  const { name, email, password } = req.body || {};

  if (
    !name ||
    !/^\S+@\S+\.\S+$/.test(email || '') ||
    (password || '').length < 8
  ) {
    return res.status(400).json({
      error: 'Enter a name, a valid email and a password of 8+ characters.'
    });
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    const [r] = await pool.query(
      'INSERT INTO users (name,email,password_hash) VALUES (?,?,?)',
      [
        name.trim(),
        email.toLowerCase(),
        hash
      ]
    );

    res.status(201).json({
      token: sign({
        id: r.insertId,
        name
      }),
      name
    });

  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'That email is already registered.'
      });
    }

    throw e;
  }
}));


app.post('/api/auth/login', authLimit, wrap(async (req, res) => {
  const { email, password } = req.body || {};

  const [rows] = await pool.query(
    'SELECT * FROM users WHERE email=?',
    [
      (email || '').toLowerCase()
    ]
  );

  const u = rows[0];

  if (
    !u ||
    !(await bcrypt.compare(
      password || '',
      u.password_hash
    ))
  ) {
    return res.status(401).json({
      error: 'Email or password is incorrect.'
    });
  }

  res.json({
    token: sign(u),
    name: u.name
  });
}));


app.post('/api/orders', auth, wrap(async (req, res) => {
  const items = req.body && req.body.items;

  if (
    !Array.isArray(items) ||
    !items.length ||
    items.length > 50 ||
    items.some(
      i =>
        !Number.isInteger(i.id) ||
        !Number.isInteger(i.qty) ||
        i.qty < 1 ||
        i.qty > 99
    )
  ) {
    return res.status(400).json({
      error: 'Your cart is empty or invalid.'
    });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    let total = 0;
    const lines = [];

    for (const it of items) {
      const [[p]] = await conn.query(
        'SELECT id,name,price,stock FROM products WHERE id=? FOR UPDATE',
        [
          it.id
        ]
      );

      if (!p) {
        throw Object.assign(
          new Error('A product in your cart no longer exists.'),
          {
            status: 400
          }
        );
      }

      if (p.stock < it.qty) {
        throw Object.assign(
          new Error(
            `Only ${p.stock} of "${p.name}" left in stock.`
          ),
          {
            status: 409
          }
        );
      }

      total += p.price * it.qty;

      lines.push([
        p,
        it.qty
      ]);
    }

    const [o] = await conn.query(
      'INSERT INTO orders (user_id,total) VALUES (?,?)',
      [
        req.user.id,
        total.toFixed(2)
      ]
    );

    for (const [p, qty] of lines) {
      await conn.query(
        'INSERT INTO order_items (order_id,product_id,qty,unit_price) VALUES (?,?,?,?)',
        [
          o.insertId,
          p.id,
          qty,
          p.price
        ]
      );

      await conn.query(
        'UPDATE products SET stock=stock-? WHERE id=?',
        [
          qty,
          p.id
        ]
      );
    }

    await conn.commit();

    res.status(201).json({
      orderId: o.insertId,
      total: +total.toFixed(2)
    });

  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}));


app.get('/api/orders', auth, wrap(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id,total,created_at FROM orders WHERE user_id=? ORDER BY id DESC LIMIT 50',
    [
      req.user.id
    ]
  );

  res.json(rows);
}));


/* =========================
   ERROR HANDLING
   ========================= */

app.use((_req, res) => {
  res.status(404).json({
    error: 'Not found'
  });
});


app.use((err, _req, res, _next) => {
  if (err.status) {
    return res.status(err.status).json({
      error: err.message
    });
  }

  console.error(err);

  res.status(500).json({
    error: 'Something went wrong. Please try again.'
  });
});


/* =========================
   START SERVER
   ========================= */

const server = app.listen(
  PORT,
  () => console.log(`API listening on ${PORT}`)
);


/* =========================
   GRACEFUL SHUTDOWN
   ========================= */

for (const s of ['SIGTERM', 'SIGINT']) {
  process.on(s, () => {
    server.close(() => {
      pool.end().then(() => process.exit(0));
    });
  });
}


