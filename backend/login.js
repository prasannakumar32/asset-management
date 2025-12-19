const express = require('express');
const bodyParser = require('body-parser');
const db = require('./backend/database/db');
const { sequelize, connectDB } = require('./backend/database/db');
const { User } = require('./backend/models/user');
const bcrypt = require('bcryptjs');
const path = require('path');


const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ where: { username } });
  if (!user) return res.send('User not found');
  const isMatch = await bcrypt.compare(password, user.password);
  res.send(isMatch ? 'Login successful' : 'Invalid password');
});

connectDB()
  .then(() => {
    console.log('Database connected and synced');
    app.listen(3333, () =>
      console.log('Server running on http://localhost:3333')
    );
  })
  .catch(err => console.error('Database error:', err));