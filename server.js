const express = require('express');
const app = express();
const session = require("express-session");
const bodyParser = require('body-parser');
const cors = require('cors');
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const pool = require("./config/db");
const PgSession = require('connect-pg-simple')(session);
const bcrypt = require("bcrypt");

require('dotenv').config();

const PORT = process.env.PORT || 4001;

const isProduction = process.env.NODE_ENV === 'production';

const store = isProduction
    ? new PgSession({
        pool: pool,
        tableName: 'session'
    })
    : new session.MemoryStore();

const comparePasswords = async (password, hash) => {
    try {
        const matchFound = await bcrypt.compare(password, hash);
        return matchFound;
    } catch(err) {
        console.log(err);
    };
    return false;
}

app.use(cors({
    origin: true, // Allow requests from any origin during development
    credentials: true // This is required to send cookies in cross-origin requests
}));

app.use(bodyParser.json());

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        cookie: { maxAge: 1000 * 60, secure: false, sameSite: "none" },
        resave: false,
        saveUninitialized: false,
        store
    })
)

app.use(passport.initialize());
app.use(passport.session());

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        return res.status(401).json({ message: "You must be logged in to access this resource"})
    }
}

passport.use(
    new LocalStrategy(
        { usernameField: "email" }, // Explicitly define that email is the username field
        async (email, password, done) => {
            const userLoginQuery = `
                SELECT id, email, password
                FROM users
                WHERE
                    email = $1`;
            
            try {
                const results = await pool.query(userLoginQuery, [email]);
                    
                    if (results.rows.length === 0) {
                        return done(null, false, { message: "Invalid email" });
                    }

                    const user = results.rows[0];

                    const matchedPassword = await bcrypt.compare(password, user.password)

                    if (!matchedPassword) {
                        return done(null, false, { message: "Invalid password" });
                    }
                    
                    return done(null, user);

            } catch(err) {
                return done(err);
            }
    })
)

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const getUsersQuery = `
         SELECT id, email
         FROM users
         WHERE id = $1;
    `

    try {
        const results = await pool.query(getUsersQuery, [id]);
            
            if (results.rows.length === 0) {
                return done(new Error('User not found'));
            }
            
            const user = results.rows[0];
            done(null, user)
       
    } catch(err) {
        return done(err);
    }
})

const usersRouter = require('./routes/userRoutes');
app.use("/users", usersRouter);

app.get('/', (req, res) => {
    res.status(200).json({ info: 'Node.js, Express, and Postgress API'})
});

app.get('/login', (req, res) => {
    res.status(200).json({message: "Enter login credentials"})
});

app.post("/login",
    passport.authenticate("local", { failureRedirect: "/login" }),
    (req, res) => {
        res.redirect("/profile");
    }
)

app.get('/profile', isAuthenticated, (req, res) => {
    res.status(200).json({ email: req.user.email })
});

app.get('/protected', isAuthenticated, (req, res) => {
    res.status(200).json({ message: "You are viewing a protected site" })
});

app.listen(PORT, () => {
    console.log(`Server is listening to port ${PORT}`)
});
