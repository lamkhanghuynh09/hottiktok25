const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true
}));

// Hàm đọc/ghi JSON
function readJSON(filename) {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
function writeJSON(filename, data) {
  fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(data, null, 2));
}

// Trang chủ
app.get('/home', (req, res) => {
  if (!req.session.user) return res.redirect('/login.html');
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Đăng ký
app.post('/register', (req, res) => {
  const { email, password } = req.body;
  const users = readJSON('users.json');
  if (users.find(u => u.email === email)) {
    return res.send('<script>alert("Email đã tồn tại"); window.location.href="/register.html";</script>');
  }
  const newUser = { email, password, coins: 0 };
  users.push(newUser);
  writeJSON('users.json', users);
  res.redirect('/login.html');
});

// Đăng nhập
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const users = readJSON('users.json');
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.send('<script>alert("Sai thông tin đăng nhập"); window.location.href="/login.html";</script>');
  }
  req.session.user = user;
  res.redirect('/home');
});

// Gửi thẻ (nạp xu)
app.post('/submit-card', (req, res) => {
  const { email, cardType, serial, code, amount } = req.body;

  if (!email) return res.send('Thiếu email.');

  const newCard = {
    email,
    cardType,
    serial,
    code,
    amount: parseInt(amount)
  };

  let cardList = [];
  if (fs.existsSync('cards.json')) {
    cardList = JSON.parse(fs.readFileSync('cards.json'));
  }

  cardList.push(newCard);
  fs.writeFileSync('cards.json', JSON.stringify(cardList, null, 2));

  res.send('Thẻ đã được gửi, chờ duyệt.');
});

// Admin cộng xu
app.post('/admin/add-coins', (req, res) => {
  if (!req.session.user || req.session.user.email !== 'admin') {
    return res.status(403).send('Không có quyền truy cập');
  }

  const { targetEmail, amount } = req.body;
  const users = readJSON('users.json');
  const user = users.find(u => u.email === targetEmail);
  if (!user) return res.send('Người dùng không tồn tại');

  user.coins += parseInt(amount);
  writeJSON('users.json', users);
  res.send('Đã cộng xu thành công');
});

// API lấy thông tin người dùng hiện tại (cho home.html dùng)
app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
  res.json(req.session.user);
});

// Đăng xuất
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

app.get('/admin/card-list', (req, res) => {
  if (!req.session.user || req.session.user.email !== 'admin') {
    return res.status(403).send('Forbidden');
  }
  const cards = JSON.parse(fs.readFileSync('cards.json', 'utf8'));
  res.json(cards);
});

const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.post('/api/watch', (req, res) => {
  const user = req.session.user;
  if (!user) return res.json({ success: false });

  const filePath = './users.json';
  const users = JSON.parse(fs.readFileSync(filePath));
  const currentUser = users.find(u => u.email === user.email);

  if (!currentUser || currentUser.coins < 5) {
    return res.json({ success: false });
  }

  currentUser.coins -= 5;
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
  res.json({ success: true });
});
app.listen(PORT, () => {
  console.log(`Server chạy ở http://localhost:${PORT}`);
});