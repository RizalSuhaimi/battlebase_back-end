function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        return res.status(401).json({ message: "You must be logged in to access this resource"})
    }
}

module.exports = isAuthenticated;