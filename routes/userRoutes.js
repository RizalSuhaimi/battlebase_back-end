const express = require('express');
const usersRouter = express.Router();

const pool = require("../config/db");

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

        // Get the region id. New regions are added manually by the admin as the operations scale up
        const regionIdQuery = `
            SELECT id
            FROM regions
            WHERE
                zone = $1
                AND country = $2`;

        const regionIdResult = await client.query(
            regionIdQuery,
            [zone, country]
        );

        let regionId;

        if (regionIdResult.rows.length === 0) {
            throw new Error("Service not available for this region")
        } else {
            regionId = regionIdResult.rows[0].id;
        }
        
        // Check if address already exists
        // If not, create address
        // Get the address id
        const addressIdQuery = `
            SELECT id
            FROM address
            WHERE
                unit_number = $1
                AND floor_number = $2
                AND street = $3
                AND city = $4
                AND postcode = $5
                AND region_id = $6`;

        const addressIdResult = await client.query(
            addressIdQuery,
            [
                unitNumber,
                floorNumber,
                street,
                city,
                postcode,
                regionId
            ]
        )

        let addressId;

        if (addressIdResult.rows.length === 0) {
            const addressInsertQuery = `
                INSERT INTO address (
                    unit_number,
                    floor_number,
                    street,
                    city,
                    postcode,
                    region_id)
                VALUES ($1, $2, $3, $4, $5, $6)
            `

            const addressInsertResult = await client.query(
                addressInsertQuery,
                [
                    unitNumber,
                    floorNumber,
                    street,
                    city,
                    postcode,
                    regionId
                ]
            )

            addressId = addressInsertResult.rows[0].id;
        } else {
            addressId = addressIdResult.rows[0].id;
        }

        const userInsertQuery = `
            INSERT INTO users (name, email, phone, password, address_id)
            VALUES ($1, $2, $3, $4, $5);
        `;
        const userInsertResult = await client.query(
            userInsertQuery, 
            [
                name, 
                email,
                phone,
                password,
                addressId
            ]
        );
        const userId = userInsertResult.rows[0].id;

        // Commit the transaction
        await client.query('COMMIT');

        // Send success response
        res.status(201).json({ message: "User created successfully", userId, addressId, regionId });
        
    } catch (err) {
        // Rollback the transaction in case of an error
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ errorMessage: `${err.message ? err.message : "An error occurred while creating the user"}`});

    } finally {
        client.release(); // Release the client back to the pool
    }
    
});

module.exports = usersRouter;

/*
const Pool = require('pg').Pool;
const pool = new Pool({ /* connection details / });

usersRouter.post("/", async (req, res, next) => {
    const {
        name,
        email,
        password,
        phone,
        postcode,
        zone,
        country
    } = req.body;

    const client = await pool.connect();  // Get a client from the pool

    try {
        // Begin the transaction
        await client.query('BEGIN');

        // Insert into the users table and return the user_id
        const userInsertQuery = `
            INSERT INTO users (name, email, password, phone)
            VALUES ($1, $2, $3, $4)
            RETURNING id;`;
        const userResult = await client.query(userInsertQuery, [name, email, password, phone]);
        const userId = userResult.rows[0].id;  // Get the generated user id

        // Insert into the address table, using the userId
        const addressInsertQuery = `
            INSERT INTO address (user_id, postcode, zone, country)
            VALUES ($1, $2, $3, $4);`;
        await client.query(addressInsertQuery, [userId, postcode, zone, country]);

        // Commit the transaction
        await client.query('COMMIT');

        // Send success response
        res.status(201).json({ message: "User created successfully", userId });

    } catch (error) {
        // Rollback the transaction in case of an error
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: "An error occurred while creating the user" });

    } finally {
        client.release();  // Release the client back to the pool
    }
});
*/