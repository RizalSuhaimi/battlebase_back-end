const express = require('express');
const usersRouter = express.Router();

import pool from "../config/db";

usersRouter.post("/", async (req, res, next) => {
    const {
        name,
        username,
        email,
        password,
        phone,
        unitNumber,
        floorNumber,
        street,
        city,
        postcode,
        zone,
        country
    } = req.body

    // Need to query the regions table for the region_id using the zone and coutnry values
    // Need to encrypt the password

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Need to make use some kind of algorithm for these two and check that the id has not yet existed in the database
        const addressId = "a0000000000000000000"
        const userId = "u000000000000000"

        const userInsertQuery = `
            INSERT INTO address (
                id,
                unit_number,
                floor_number,
                street,
                city,
                postcode,
                region_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `

        client.query(

        )
    } catch (err) {

    } finally {

    }
    
});

module.exports = usersRouter;