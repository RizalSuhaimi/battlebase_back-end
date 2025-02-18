const express = require('express');
const passport = require("passport");
const autheRouter = express.Router();

autheRouter.get('/login', (req, res) => {
    res.status(200).json({message: "Enter login credentials"})
});

autheRouter.post("/login",
    passport.authenticate("local", { failureRedirect: "/authe/login" }),
    (req, res) => {
        res.redirect("/profile");
    }
)

autheRouter.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
    });
    res.redirect("/");
});

module.exports = autheRouter;