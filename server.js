import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import bodyParser from 'body-parser';
import crypto from 'crypto';

const app = express();
const DATABASE_TIME_ZONE = '+07:00';
const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET;
const TOKEN_LIFETIME_SECONDS = 60 * 60 * 24 * 7;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

if (!TOKEN_SECRET) {
  throw new Error('AUTH_TOKEN_SECRET is required. Set it in your environment before starting the server.');
}

app.use(cors({ origin: CORS_ORIGIN.split(',').map(origin => origin.trim()) }));
app.use(bodyParser.json());
app.use(express.json());

// เชื่อมต่อฐานข้อมูล
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'expense_tracker',
  timezone: DATABASE_TIME_ZONE,
  dateStrings: true,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const query = (sql, values = []) => db.query(sql, values);

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => new Promise((resolve, reject) => {
  crypto.scrypt(password, salt, 64, (err, key) => {
    if (err) return reject(err);
    resolve(`${salt}:${key.toString('hex')}`);
  });
});

const verifyPassword = async (password, storedHash) => {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const candidate = await hashPassword(password, salt);
  const candidateBuffer = Buffer.from(candidate);
  const storedBuffer = Buffer.from(storedHash);
  return candidateBuffer.length === storedBuffer.length && crypto.timingSafeEqual(candidateBuffer, storedBuffer);
};

const signToken = user => {
  const payload = Buffer.from(JSON.stringify({ id: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS })).toString('base64url');
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });
  const [payload, signature] = token.split('.');
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(payload || '').digest('base64url');
  if (!payload || !signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).json({ error: 'เซสชันไม่ถูกต้อง' });
  }
  try {
    const user = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (user.exp < Math.floor(Date.now() / 1000)) return res.status(401).json({ error: 'เซสชันหมดอายุ' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'เซสชันไม่ถูกต้อง' });
  }
};

const validCredentials = (email, password) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length >= 8;

app.post('/api/auth/register', async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const name = req.body.name?.trim() || null;
  const password = req.body.password || '';
  if (!validCredentials(email || '', password)) return res.status(400).json({ error: 'กรอกอีเมลที่ถูกต้อง และรหัสผ่านอย่างน้อย 8 ตัวอักษร' });
  try {
    const passwordHash = await hashPassword(password);
    const [result] = await query('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email, passwordHash]);
    const user = { id: result.insertId, name, email };
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
    console.error('Registration error:', err);
    res.status(500).json({ error: 'ไม่สามารถสร้างบัญชีได้' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password || '';
  try {
    const [users] = await query('SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1', [email]);
    const user = users[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    res.json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'ไม่สามารถเข้าสู่ระบบได้' });
  }
});

app.get('/api/transactions', authenticate, (req, res) => {

  const sql = 'SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 10';
  db.query(sql, [req.user.id], (err, results) => {
    if (err) {
      console.error('Database Error:', err);
      return res.status(500).send('Database Error');
    }
    res.json(results);
  });
});

app.post('/api/transactionsbydate', authenticate, (req, res) => {
  const { date } = req.body;
  const startDate = `${date} 00:00:00`;
  const endDate = `${date} 23:59:59`;
  console.log('🔍 Received date:', date);
  const sql = 'SELECT * FROM transactions WHERE user_id = ? AND created_at BETWEEN ? AND ?';


  db.query(sql, [req.user.id, startDate, endDate], (err, results) => {
    if (err) {
      console.error('เกิดข้อผิดพลาดในการดึงข้อมูล:', err);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลจาก Database' });
    }
    console.log(results);
    res.json(results);
  });
});



app.post('/api/balance', authenticate, (req, res) => {
  const sql = 'SELECT balance FROM users WHERE id = ? ORDER BY id DESC LIMIT 1';

  db.query(sql, [req.user.id], (err, results) => {
    if (err) {
      console.error('Error fetching balance:', err);
      return res.status(500).send('Database error');
    }

    const balance = results.length > 0 ? results[0].balance : 0; // ถ้ามีข้อมูลให้แสดง balance ล่าสุด ถ้าไม่มีก็ให้เป็น 0
    res.json({ balance }); // ส่งค่า balance กลับเป็น JSON
  });
});

app.post('/api/transactions', authenticate, async (req, res) => {
  const description = req.body.description?.trim();
  const amount = Number(req.body.amount);

  if (!description || !Number.isFinite(amount) || amount === 0) {
    return res.status(400).json({
      error: 'กรุณากรอกรายละเอียดและจำนวนเงินที่ไม่เป็นศูนย์'
    });
  }

  // 1. เพิ่ม transaction
  const sql = `
    INSERT INTO transactions (description, amount, user_id)
    VALUES (?, ?, ?)
  `;

  db.query(
    sql,
    [description, amount, req.user.id],
    (err, result) => {
      if (err) {
        console.error('Database Error:', err);
        return res.status(500).send('Database Error');
      }

      // 2. อัปเดต balance ของ user
      const updateBalanceSql = `
        UPDATE users
        SET balance = balance + ?
        WHERE id = ?
      `;

      db.query(
        updateBalanceSql,
        [amount, req.user.id],
        (balanceErr) => {
          if (balanceErr) {
            console.error('Balance Update Error:', balanceErr);
            return res.status(500).send('Balance Update Error');
          }

          // 3. ดึง balance ใหม่กลับไป
          db.query(
            'SELECT balance FROM users WHERE id = ?',
            [req.user.id],
            (selectErr, users) => {
              if (selectErr) {
                console.error('Database Error:', selectErr);
                return res.status(500).send('Database Error');
              }

              const balance = Number(users[0]?.balance || 0);

              res.json({
                id: result.insertId,
                description,
                amount,
                balance
              });
            }
          );
        }
      );
    }
  );
});

app.put('/api/transactions/:id', authenticate, async(req, res) => {
  const id = Number(req.params.id);
  const description = req.body.description?.trim();
  const amount = Number(req.body.amount);

  if (!Number.isInteger(id)){
    return res.status(400).json({ error: 'กรุณากรอก ID ที่ถูกต้อง' });
  }

  if(!description||!Number.isFinite(amount)||amount===0){
    return res.status(400).json({ error: 'กรุณากรอกรายละเอียดและจำนวนเงินที่ไม่เป็นศูนย์' });
  }

  try{
    const [rows] = await query(
      'SELECT id FROM transactions WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบรายการที่ต้องการแก้ไข' });
    }
    await query('UPDATE transactions SET description = ?, amount = ? WHERE id = ? AND user_id = ?', [description, amount, id, req.user.id]);
    
    let balance = 0;

    const [transactions] = await query(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC ',
      [req.user.id],
    );
    for (const transaction of transactions) {
      balance += Number(transaction.amount);
    }
    await query(
      'UPDATE users SET balance = ? WHERE id = ? ',
      [balance, req.user.id],
    );

    res.json({ message: 'แก้ไขสำเร็จ'});
  }catch(err){
    console.error('update transaction error:', err);
    res.status(500).send({error:'แก้ไขไม่สําเร็จ'});
  }

});

app.delete('/api/transactions/:id', authenticate, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'กรุณากรอก ID ที่ถูกต้อง' });
  }
  try {
    const [rows] = await query(
      'SELECT id FROM transactions WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบรายการที่ต้องการลบ' });
    }
    await query('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, req.user.id]);
    let balance = 0;

    const [transactions] = await query(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC ',
      [req.user.id],
    );

    for (const transaction of transactions) {
      balance += Number(transaction.amount);
    }
    await query(
      'UPDATE users SET balance = ? WHERE id = ? ',
      [balance, req.user.id],
    );
    res.json({ message: 'ลบสำเร็จ' });
  } catch (err) {
    console.error('delete transaction error:', err);
    res.status(500).send({ error: 'ลบไม่สําเร็จ' });
  }
})

app.get('/api/balance', authenticate, (req, res) => {
  db.query(
    'SELECT balance FROM users WHERE id = ?',
    [req.user.id],
    (err, users) => {
      if (err) {
        console.error('Database Error:', err);
        return res.status(500).json({ error: 'Database Error' });
      }

      if (users.length === 0) {
        return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
      }

      res.json({
        balance: Number(users[0].balance || 0)
      });
    }
  );
});

const initialiseDatabase = async () => {
  await query('SET time_zone = ?', [DATABASE_TIME_ZONE]);

  await query(`CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await query(`CREATE TABLE IF NOT EXISTS transactions (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    user_id INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_transactions_user_id_id (user_id, id)
  )`);

  const columns = await query(`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'transactions'
      AND COLUMN_NAME = 'user_id'
  `);

  if (columns.length === 0) {
    await query(
      'ALTER TABLE transactions ADD COLUMN user_id INT NULL'
    );
  }

  console.log(`MySQL Connected (time zone: ${DATABASE_TIME_ZONE})...`);
};

const PORT = process.env.PORT || 5000;
initialiseDatabase().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('Unable to initialize database:', err);
  process.exit(1);
});

app.get('/favicon.ico', (req, res) => res.status(204));
