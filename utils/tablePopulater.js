const express = require('express');
const pool = require("../config/db");
const { faker } = require('@faker-js/faker');

const populateProducts = async () => {
    let client

    try {
        client = await pool.connect();
        await client.query('BEGIN');

        let paramsStr = "";
        let paramVals = [];
        for (let i = 1; i < 21; i++) {
            
            const name = faker.book.title()
            // need to check if name has apostrophe

            const row = `( '${name}', ${Math.floor(Math.random() * 11)}, ${Math.floor(Math.random() * 10)}, '0000000003' )`

            // parameterise 20 rows
            // paramsStr += `($${ i })${i === 20 ? "" : `,
            //     `}`;
            paramsStr += `${row}${i === 20 ? "" : `,
                `}`;
            
            // paramVals.push(row)
        }

        let queryString = `
            INSERT INTO products_categories (name, stock, price, seller_id)
            VALUES
                ${paramsStr}
        `

        console.log(queryString)

        await client.query(
            queryString
        )

        await client.query('COMMIT');

        console.log("products table populated")

    } catch(err) {
        await client.query('ROLLBACK');
        console.error(err.message ? err.message : "An error occurred while populating products");

    } finally {
        client.release();
    }
}

module.exports = {
    populateProducts
};