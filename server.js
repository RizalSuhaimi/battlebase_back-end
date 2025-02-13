const express = require('express');
const app = express();
const session = require("express-session");
const bodyParser = require('body-parser');
const cors = require('cors');

require('dotenv').config();

const PORT = process.env.PORT || 4001;

const isProduction = process.env.NODE_ENV === 'production';

const store = isProduction
    ? new RedisStore({ client: redisClient })
    : new session.MemoryStore();

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store
    })
)

app.use(cors());

app.use(bodyParser.json());

const usersRouter = require('./routes/userRoutes');
app.use("/users", usersRouter);

app.get('/', (req, res) => {
    res.status(200).json({ info: 'Node.js, Express, and Postgress API'})
});

app.listen(PORT, () => {
    console.log(`Server is listening to port ${PORT}`)
});
