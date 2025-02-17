const express = require('express');
const usersRouter = express.Router();
const bcrypt = require("bcrypt");
const pool = require("../config/db");

const passwordHash = async (password, saltRounds) => {
    try {
        const salt = await bcrypt.genSalt(saltRounds);
        const hash = await bcrypt.hash(password, salt);
        return hash;
    } catch (err) {
        return err;
    }
    return null;
}

usersRouter.get("/", (req, res, next) => {
    const getUsersQuery = `
         SELECT name, username, email, phone
         FROM users
         ORDER BY name ASC;
    `

    try {
        pool.query(getUsersQuery, (err, results) => {
            if (err) {
                throw err;
            }
            res.status(200).json(results.rows);
        })
    } catch(err) {
        res.status(500).json({ errorMessage: `${err.message ? err.message : "An error occurred while getting users"}`});
    }
    
});

usersRouter.post("/", async (req, res, next) => {
    const {
        name,
        username,
        email,
        password,
        phone,
        unitNumber,
        floorNumber=null,
        street,
        city,
        postcode,
        zone,
        country
    } = req.body

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
                RETURNING id;
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

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const userInsertQuery = `
            INSERT INTO users (name, username, email, phone, password, address_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id;
        `;
        const userInsertResult = await client.query(
            userInsertQuery, 
            [
                name,
                username,
                email,
                phone,
                hash,
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