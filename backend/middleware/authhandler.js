

// Middleware to check if user has admin role
exports.ensureAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
        return next();
    }
    res.redirect('/dashboard');
};