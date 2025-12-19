// Middleware to check if user is authenticated
exports.ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
};

// Middleware to check if user has admin role
exports.ensureAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
        return next();
    }
    res.redirect('/dashboard');
};