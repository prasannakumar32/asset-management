const express = require('express');
const router = express.Router();
const authController = require('./authController');
const passport = require('passport');

//send login page 
router.get('/login', (req, res) => res.sendFile('login.jade', { root: '../..' }));

//handle login
router.post('/login', authController.login);

//api login for authentication
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Authentication error' });
    }
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Login error' });
      }
      return res.json({ success: true, message: 'Login successful', user: { id: user.id, username: user.username } });
    });
  })(req, res, next);
});

router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {  
      return next(err); 
    }
    res.redirect('/login');
  });
});

module.exports = router;
