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

        // Check if address already exists. If not, create address
        // Get the address id
        const addressCols = {
            unit_number,
            floor_number,
            building_name,
            street,
            city,
            postcode,
            region_id
        }
        const getAddress_idQueryObj = createSelectIdQuery("address", addressCols);
        const address_idQuery = getAddress_idQueryObj.row_idQuery;
        const address_idMatchVals = getAddress_idQueryObj.matchValsArr;

        const address_idResult = await client.query(
            address_idQuery,
            address_idMatchVals
        )

        let address_id;

        if (address_idResult.rows.length === 0) {
            const addressInsertQueryObj = createInsertQuery("address", addressCols);
            const addressInsertQuery = addressInsertQueryObj.insertQuery;
            const addressInsertVals = addressInsertQueryObj.valsArr;

            const addressInsertResult = await client.query(
                addressInsertQuery,
                addressInsertVals
            )

            address_id = addressInsertResult.rows[0].id;
        } else {
            address_id = address_idResult.rows[0].id;
        }

        await client.query('COMMIT');

        res.status(201).json({ message: "Address created successfully", address_id });
    
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ errorMessage: `${err.message ? err.message : "An error occurred while creating the address"}`});
    } finally {
        client.release();
    }
});

addressRouter.put("/", (req, res, next) => {

});

addressRouter.delete("/", (req, res, next) => {

});

module.exports = addressRouter;