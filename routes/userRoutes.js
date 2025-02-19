const express = require('express');
const usersRouter = express.Router();
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const isAuthenticated = require("../utils/middlewareAuthe");

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
        seller=false,
        unit_number,
        floor_number=null,
        buidling_name=null,
        street,
        city,
        postcode,
        zone,
        country
    } = req.body

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Get the region id. New regions are added manually by the admin as the operations scale up
        const region_idQuery = `
            SELECT id
            FROM regions
            WHERE
                zone = $1
                AND country = $2`;

        const region_idResult = await client.query(
            region_idQuery,
            [zone, country]
        );

        let region_id;

        if (region_idResult.rows.length === 0) {
            throw new Error("Service not available for this region")
        } else {
            region_id = region_idResult.rows[0].id;
        }
        
        // Check if address already exists
        // If not, create address
        // Get the address id
        const address_idQuery = `
            SELECT id
            FROM address
            WHERE
                unit_number = $1
                AND floor_number = $2
                AND buidling_name = $3
                AND street = $4
                AND city = $5
                AND postcode = $6
                AND region_id = $7`;

        const address_idResult = await client.query(
            address_idQuery,
            [
                unit_number,
                floor_number,
                buidling_name,
                street,
                city,
                postcode,
                region_id
            ]
        )

        let address_id;

        if (address_idResult.rows.length === 0) {
            const addressInsertQuery = `
                INSERT INTO address (
                    unit_number,
                    floor_number,
                    buidling_name,
                    street,
                    city,
                    postcode,
                    region_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id;
            `

            const addressInsertResult = await client.query(
                addressInsertQuery,
                [
                    unit_number,
                    floor_number,
                    buidling_name,
                    street,
                    city,
                    postcode,
                    region_id
                ]
            )

            address_id = addressInsertResult.rows[0].id;
        } else {
            address_id = address_idResult.rows[0].id;
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const userInsertQuery = `
            INSERT INTO users (
                name, 
                username, 
                email, 
                password, 
                phone, 
                seller, 
                address_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id;
        `;
        const userInsertResult = await client.query(
            userInsertQuery, 
            [
                name,
                username,
                email,
                hash,
                phone,
                seller,
                address_id
            ]
        );
        const userId = userInsertResult.rows[0].id;

        // Commit the transaction
        await client.query('COMMIT');

        // Send success response
        res.status(201).json({ message: "User created successfully", userId, address_id, region_id });
        
    } catch (err) {
        // Rollback the transaction in case of an error
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ errorMessage: `${err.message ? err.message : "An error occurred while creating the user"}`});

    } finally {
        client.release(); // Release the client back to the pool
    }
    
});

// DRY validate userId
usersRouter.param("userId", async (req, res, next, id) => {
    const userLoginQuery = `
        SELECT 
            id,
            address_id
        FROM users
        WHERE id = $1`;
    
    try {
        const results = await pool.query(userLoginQuery, [id]);

        const user = results.rows[0];

        if (user) {
            req.user = user;
            next()
        }

    } catch(err) {
        res.status(404).json({ errorMessage: `${err.message}` });
    }
    
})

usersRouter.get("/:userId", isAuthenticated, (req, res, next) => {
    res.status(200).send(req.user);
})

usersRouter.put("/:userId", isAuthenticated, async (req, res, next) => {
    const {
        name,
        username,
        email,
        password,
        phone,
        seller,
        unit_number,
        floor_number,
        street,
        city,
        postcode,
        zone,
        country
    } = req.body

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        let region_id;

        const regionsColsObj = {
            zone,
            country
        };

        for (const col of Object.keys(regionsColsObj)) {
            if (!regionsColsObj[col]) {
                delete regionsColsObj[col];
            }
        }

        const updateRegionsColsArr = Object.keys(regionsColsObj);
        const updateRegionsValsArr = Object.values(regionsColsObj);

        // Get the region id. New regions are added manually by the admin as the operations scale up
        if (updateRegionsColsArr.length > 0) {
            let columnCount = 0;
            let whereColsStr = "";

            for (const col of updateRegionsColsArr) {
                columnCount += 1;
                whereColsStr += `${col} = $${columnCount.toString()}${(columnCount === updateRegionsColsArr.length) ? "" : `
                    AND `}`
            }

            const region_idQuery = `
                SELECT id
                FROM regions
                WHERE ${whereColsStr}`;
            
            const region_idResult = await client.query(
                region_idQuery, 
                updateRegionsValsArr
            );

            if (region_idResult.rows.length === 0) {
                throw new Error("Service not available for this region")
            } else {
                region_id = region_idResult.rows[0].id;
            };

        } 
        
        // If the region is not being updated, leave region_id as undefined
    
        const addressColsObj = {
            unit_number,
            floor_number,
            street,
            city,
            postcode,
            region_id
        };

        for (const col of Object.keys(addressColsObj)) {
            if (!addressColsObj[col]) {
                delete addressColsObj[col];
            }
        }
        
        const usersColsObj = {
            name, 
            username, 
            email, 
            hash, 
            phone, 
            seller,
            address_id
        };
    
        for (const col of Object.keys(usersColsObj)) {
            if (!usersColsObj[col]) {
                delete usersColsObj[col];
            }
        }
    
        // Split the object into two arrays: 1 for keys, 1 for values. This is needed to build the query string
        const updateUsersColsArr = Object.keys(usersColsObj);
        const updateUsersValsArr = Object.values(usersColsObj);

        if (updateUsersColsArr.length !== 0) {
            let columnCount = 0;
            let updateColsStr = "";

            for (const col of updateUsersColsArr) {
                columnCount += 1;
                updateColsStr += `${col} = $${columnCount.toString()}${(columnCount === updateUsersColsArr.length) ? "" : `,
                    `}`
            }

            const usersUpdateQuery = `
                UPDATE users
                SET ${updateColsStr}
                WHERE id = $${(columnCount + 1).toString()};
            `;

            // add the user's id to the end of the array of values
            updateUsersValsArr.push(req.user.id)

            await client.query(
                usersUpdateQuery, 
                updateUsersValsArr
            );
        }
        

        await client.query('COMMIT');

        res.status(200).json({ 
            message: "Data was successfully updated", 
            userId: req.user.id
        });

    } catch(err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ errorMessage: `${err.message ? err.message : "An error occurred while updating the data"}`});

    } finally {
        client.release();
    }

    
})

usersRouter.delete("/:userId", isAuthenticated, (req, res, next) => {
    
})

module.exports = usersRouter;