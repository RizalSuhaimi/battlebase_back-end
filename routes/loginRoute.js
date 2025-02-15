const express = require('express');
const loginRouter = express.Router();

const pool = require("../config/db");

loginRouter.post("/", async (req, res, next) => {
    const {email, password} = req.body;
})

module.exports = loginRouter;