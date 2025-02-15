const express = require('express');
const app = express();
const session = require("express-session");
const bodyParser = require('body-parser');
const cors = require('cors');
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const pool = require("./config/db");
const PgSession = require('connect-pg-simple')(session);

require('dotenv').config();

const PORT = process.env.PORT || 4001;

const isProduction = process.env.NODE_ENV === 'production';

const store = isProduction
    ? new PgSession({
        pool: pool,
        tableName: 'session'
    })
    : new session.MemoryStore();

app.use(cors());

app.use(bodyParser.json());

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        cookie: { maxAge: 1000 * 60 * 60 * 24, secure: true, sameSite: "none" },
        resave: false,
        saveUninitialized: false,
        store
    })
)

app.use(passport.initialize());
app.use(passport.session());

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
                        return done(null, false, { message: "Invalid email or password" });
                    }

                    const user = results.rows[0];

                    if (user.password !== password) {
                        return done(null, false, { message: "Invalid email or password" });
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
         SELECT id
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

app.post("/login",
    passport.authenticate("local", { failureRedirect: "/login" }),
    (req, res) => {
        res.redirect("profile");
    }
)

app.listen(PORT, () => {
    console.log(`Server is listening to port ${PORT}`)
});
