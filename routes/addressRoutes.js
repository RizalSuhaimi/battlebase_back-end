const express = require('express');
const addressRouter = express.Router();
const pool = require("../config/db");
const isAuthenticated = require("../utils/middlewareAuthe");
const createUpdateTableQuery = require('../utils/createUpdateTableQuery');
const createSelectIdQuery = require('../utils/createSelectIdQuery');
const createInsertQuery = require('../utils/createInsertQuery');

addressRouter.get("/", (req, res, next) => {

});

addressRouter.post("/", (req, res, next) => {

});

addressRouter.put("/", (req, res, next) => {

});

addressRouter.delete("/", (req, res, next) => {

});

module.exports = addressRouter;