const express = require('express');
const addressRouter = express.Router();
const pool = require("../config/db");
const isAuthenticated = require("../utils/middlewareAuthe");
const createUpdateTableQuery = require('../utils/createUpdateTableQuery');
const createSelectIdQuery = require('../utils/createSelectIdQuery');
const createInsertQuery = require('../utils/createInsertQuery');

addressRouter.get("/", (req, res, next) => {
    const getAddressesQuery = `
         SELECT 
            addresses.id,
            addresses.unit_number,
            addresses.floor_number,
            addresses.building_name,
            addresses.street,
            addresses.city,
            addresses.postcode,
            addresses.region_id,
            regions.zone,
            regions.country
        FROM addresses
        JOIN regions
            ON addresses.region_id = regions.id;
    `

    try {
        pool.query(getAddressesQuery, (err, results) => {
            if (err) {
                throw err;
            }
            res.status(200).json(results.rows);
        })
    } catch(err) {
        res.status(500).json({ errorMessage: `${err.message ? err.message : "An error occurred while getting addresses"}`});
    }
    
});

addressRouter.post("/", isAuthenticated, async (req, res, next) => {
    const {
        unit_number,
        floor_number=null,
        building_name=null,
        street,
        city,
        postcode,
        zone,
        country
    } = req.body

    let client;

    try {
        client = await pool.connect();

        await client.query('BEGIN');

        // Get the region id. New regions are added manually by the admin as the operations scale up
        const regionsCols = {zone, country};
        const getRegion_idQueryObj = createSelectIdQuery("regions", regionsCols);
        const region_idQuery = getRegion_idQueryObj.row_idQuery;
        const region_idMatchVals = getRegion_idQueryObj.matchValsArr;

        const region_idResult = await client.query(
            region_idQuery,
            region_idMatchVals
        );

        let region_id;

        if (region_idResult.rows.length === 0) {
            throw new Error("Service not available for this region")
        } else {
            region_id = region_idResult.rows[0].id;
        }

        // Check if address already exists by checking for the address ID. If not, create address
        const addressCols = {
            unit_number,
            floor_number,
            building_name,
            street,
            city,
            postcode,
            region_id
        }
        const getAddress_idQueryObj = createSelectIdQuery("addresses", addressCols);
        const address_idQuery = getAddress_idQueryObj.row_idQuery;
        const address_idMatchVals = getAddress_idQueryObj.matchValsArr;

        const address_idResult = await client.query(
            address_idQuery,
            address_idMatchVals
        )

        let address_id;
        let message = "";

        if (address_idResult.rows.length === 0) {
            const addressInsertQueryObj = createInsertQuery("addresses", addressCols);
            const addressInsertQuery = addressInsertQueryObj.insertQuery;
            const addressInsertVals = addressInsertQueryObj.valsArr;

            const addressInsertResult = await client.query(
                addressInsertQuery,
                addressInsertVals
            )

            address_id = addressInsertResult.rows[0].id;
            message = "New address created succesfully";

        } else {
            address_id = address_idResult.rows[0].id;
            message = "Address already exists. Retrieved said address' ID";
        }

        await client.query('COMMIT');

        res.status(201).json({ message, address_id });
    
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ errorMessage: `${err.message ? err.message : "An error occurred while creating the address"}`});
    } finally {
        client.release();
    }
});

// DRY validate userId
addressRouter.param("addressId", async (req, res, next, id) => {
    const addressInfoQuery = `
        SELECT 
            addresses.id,
            addresses.unit_number,
            addresses.floor_number,
            addresses.building_name,
            addresses.street,
            addresses.city,
            addresses.postcode,
            addresses.region_id,
            regions.zone,
            regions.country
        FROM addresses
        JOIN regions
            ON addresses.region_id = regions.id
        WHERE addresses.id = $1;`;
    
    try {
        const results = await pool.query(addressInfoQuery, [id]);

        const address = results.rows[0];

        if (address) {
            req.address = address;
            next()
        }

    } catch(err) {
        res.status(404).json({ errorMessage: `${err.message}` });
    }
    
})

addressRouter.get("/:addressId", isAuthenticated, (req, res, next) => {
    res.status(200).send(req.address);
});

addressRouter.put("/:addressId", isAuthenticated, async (req, res, next) => {
    const {
        unit_number,
        floor_number,
        building_name,
        street,
        city,
        postcode,
        zone,
        country
    } = req.body

    let address_id = req.address.id;

    let client;

    try {
        client = await pool.connect();

        await client.query('BEGIN');

        // Check if the updated address already exists. If yes, don't update the table row, just return the id of the found address
        // If not, update the table row

        // Get the region id if zone or country are being updated. New regions are added manually by the admin as the operations scale up
        let region_id;

        if (zone || country) {
            const regionsCols = {zone, country};
            const getRegion_idQueryObj = createSelectIdQuery("regions", regionsCols);
            const region_idQuery = getRegion_idQueryObj.row_idQuery;
            const region_idMatchVals = getRegion_idQueryObj.matchValsArr;

            const region_idResult = await client.query(
                region_idQuery,
                region_idMatchVals
            );

            if (region_idResult.rows.length === 0) {
                throw new Error("Service not available for this region")
            } else {
                region_id = region_idResult.rows[0].id;
            }
        }
        
        // two objects need to be prepared:
        // 1 for getting an existin address id
        // 1 for updating the address row if the address does not yet exist

        // When checking for an existing address, we need to have all the table columns(keys) valued with either the updated value (if present) or the current value

        let updateUserData = false; // This tells the client side whether the user data in users table needs to be updated with a new address_id
        const addressColsIdQuery = {
            unit_number: unit_number ? unit_number : req.address.unit_number,
            floor_number: floor_number ? floor_number : req.address.floor_number,
            building_name: building_name ? building_name : req.address.building_name,
            street: street ? street : req.address.street,
            city: city ? city : req.address.city,
            postcode: postcode ? postcode : req.address.postcode,
            region_id: region_id ? region_id : req.address.region_id
        }
        const getAddress_idQueryObj = createSelectIdQuery("addresses", addressColsIdQuery);
        const address_idQuery = getAddress_idQueryObj.row_idQuery;
        const address_idMatchVals = getAddress_idQueryObj.matchValsArr;

        const address_idResult = await client.query(
            address_idQuery,
            address_idMatchVals
        );

        // When updating a row, we should leave any columns(keys) as undefined to improve efficiency
        const addressColsUpdateQuery = {
            unit_number,
            floor_number,
            building_name,
            street,
            city,
            postcode,
            region_id
        }

        let message = "";
        let updatedCols;

        if (address_idResult.rows.length === 0) {
            const addressUpdateQueryObj = createUpdateTableQuery("addresses", addressColsUpdateQuery, address_id);
            const addressUpdateQuery = addressUpdateQueryObj.tableUpdateQuery;
            const addressUpdateVals = addressUpdateQueryObj.updateValsArr;
            console.log(addressUpdateQuery);
            const addressUpdateResults = await client.query(
                addressUpdateQuery,
                addressUpdateVals
            )

            updatedCols = addressUpdateResults.rows[0];
            message = "Address updated succesfully";

        } else {
            address_id = address_idResult.rows[0].id;
            message = "Address already exists. Retrieved said address' ID";
            updateUserData = true;
        }

        await client.query('COMMIT');

        res.status(200).json({ 
            message, 
            address_id,
            updatedColumns: updatedCols,
            updateUserData
        });

    } catch(err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ errorMessage: `${err.message ? err.message : "An error occurred while updating the address data"}`});

    } finally {
        client.release();
    }
});

addressRouter.delete("/:addressId", isAuthenticated, (req, res, next) => {

});

module.exports = addressRouter;