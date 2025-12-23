const db = require('../models');
const bcrypt = require('bcryptjs');
const passport = require('passport');

exports.showLogin = (req, res) => {
  res.sendFile('login.html', { root: '../..' });
};

exports.login = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) { return next(err); }
      return res.redirect('/');
    });
  })(req, res, next);
};

router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {  
      return next(err); 
    }
    res.redirect('/login');
  });
});
