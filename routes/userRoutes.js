const express = require('express');
const usersRouter = express.Router();
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const isAuthenticated = require("../utils/middlewareAuthe");
const createUpdateTableQuery = require('../utils/createUpdateTableQuery');
const createSelectIdQuery = require('../utils/createSelectIdQuery');
const createInsertQuery = require('../utils/createInsertQuery');

usersRouter.get("/", (req, res, next) => {
    const getUsersQuery = `
         SELECT id, name, username, email, phone, is_seller, address_id
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
        address_id=null
    } = req.body

    let client

    try {
        client = await pool.connect();

        await client.query('BEGIN');

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const usersCols = {
            name,
            username,
            email,
            password: hash,
            phone,
            seller,
            address_id
        };
        const { insertQuery: userInsertQuery, valsArr: userInsertVals } = createInsertQuery("users", usersCols);

        const userInsertResult = await client.query(
            userInsertQuery, 
            userInsertVals
        );
        const userId = userInsertResult.rows[0].id;

        // Commit the transaction
        await client.query('COMMIT');

        res.status(201).json({ message: "User created successfully", userId });
        
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
    const userInfoQuery = `
        SELECT 
            id,
            name, 
            username, 
            email, 
            phone, 
            is_seller,
            address_id
        FROM users
        WHERE id = $1`;
    
    try {
        const results = await pool.query(userInfoQuery, [id]);

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
        address_id
    } = req.body

    const user_id = req.user.id;

    let client

    try {
        client = await pool.connect();

        await client.query('BEGIN');

        // In a real production, you need to check whether the user knows her current password before changing to a new one
        // OR check a flag indicating whether the user forgot her password
        // Only fill up hash with the appropriate value if password is to be updated
        let hash;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            hash = await bcrypt.hash(password, salt);
        }

        const usersCols = {
            name,
            username,
            email,
            password: hash,
            phone,
            seller,
            address_id
        }
        const userUpdateQueryObj = createUpdateTableQuery("users", usersCols, user_id);
        const userUpdateQuery = userUpdateQueryObj.tableUpdateQuery;
        const userUpdateVals = userUpdateQueryObj.updateValsArr;

        const userUpdateResults = await client.query(
            userUpdateQuery,
            userUpdateVals
        );

        const updatedCols = userUpdateResults.rows[0]

        await client.query('COMMIT');

        res.status(200).json({ 
            message: "User data was successfully updated", 
            user_id,
            updatedColumns: updatedCols
        });

    } catch(err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ errorMessage: `${err.message ? err.message : "An error occurred while updating the user data"}`});

    } finally {
        client.release();
    }

    
})

usersRouter.delete("/:userId", isAuthenticated, (req, res, next) => {
    const deleteUserQuery = `
         DELETE FROM users
         WHERE id = $1;
    `

    try {
        pool.query(deleteUserQuery, [req.user.id], (err, results) => {
            if (err) {
                throw err;
            }

            req.logout((err) => {
                if (err) {
                    return res.status(500).json({errorMessage: err.message});
                }
        
                req.session.destroy((err) => {
                    if (err) {
                        return res.status(500).json({errorMessage: err.message});
                    }
        
                    res.status(204).json({message: "User deleted and logged out successfully"});
                });
            });
            
        })
    } catch(err) {
        res.status(500).json({ errorMessage: `${err.message ? err.message : "An error occurred when deleting user"}`});
    }
})

module.exports = usersRouter;