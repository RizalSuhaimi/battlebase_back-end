const express = require("express");
const pool = require("../config/db");
const { faker } = require("@faker-js/faker");

// the functions in this file are mainly useful for tables with multiple columns
const populateProductsReviews = async () => {
    // get all product ids from products table
    // get all user ids from users table
    // loop through all product ids
    // in each run of the loop
    //  give one product 5 random reviews from 5 random users

	let client

	try {
		client = await pool.connect();
		await client.query("BEGIN");

		const selectProductIdsQuery = `
			SELECT id
			FROM products
		`
		const selectProductIdsResults = await client.query(selectAllIdsQueryStr)

		const selectUserIdsQuery = `
			SELECT id
			FROM users
		`
		const selectUserIdsResults = await client.query(selectUserIdsQuery)

		let products_reviewsInsertQuery

		for (const productId of selectProductIdsResults) {
			for (let i = 0; i < 5; i++) {
				
			}
		}


	} catch(err) {
		await client.query('ROLLBACK');
        console.error(err.message ? err.message : "An error occurred while populating reviews for products");
	} finally {
		client.release();
	}
}

const populateProductDescriptions = async () => {
    let client

    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const selectAllIdsQueryStr = `
            SELECT id
            FROM products
        `

        const selectAllIdsResults = await client.query(selectAllIdsQueryStr)

        let productsValuesStr = "";
        let products_categoriesParamsStr = "";
        let products_image_linksParamsStr = "";

        for (let i = 0; i < selectAllIdsResults.rows.length; i++) {
            
            const productDesc = faker.lorem.lines(3)
            
            // need to make sure any "'" character is doubled to make it usable for sql
            if (productDesc.includes("'")) {
                productDesc.replace("'", "''")
            }

            console.log(productDesc)

            let productsQueryString = `
                UPDATE products
                SET description = '${productDesc}'
                WHERE id = '${selectAllIdsResults.rows[i].id}';
            `

            console.log(productsQueryString)

            await client.query(productsQueryString)

        }

        console.log("products table passed")

        await client.query('COMMIT');

        console.log("Descriptions inserted")

    } catch(err) {
        await client.query('ROLLBACK');
        console.error(err.message ? err.message : "An error occurred while populating descriptions for products");

    } finally {
        client.release();
    }
}

const populateProducts = async () => {
    let client

    try {
        client = await pool.connect();
        await client.query('BEGIN');

        let productsParamsStr = "";
        let products_categoriesParamsStr = "";
        let products_image_linksParamsStr = "";

        for (let i = 1; i < 11; i++) {
            
            const productName = faker.food.spice()
            
            // need to make sure any "'" character is doubled to make it usable for sql
            if (productName.includes("'")) {
                productName.replace("'", "''")
            }

            const row = `( '${productName}', ${Math.floor(Math.random() * 11)}, ${Math.floor(Math.random() * 10 + 1)}, '0000000007' )`

            productsParamsStr += `${row}${i === 10 ? "" : `,
                `}`;

        }

        let productsQueryString = `
            INSERT INTO products (name, stock, price, seller_id)
            VALUES
                ${productsParamsStr}
            RETURNING id;
        `

        console.log(productsQueryString)

        const insertProductsResults = await client.query(productsQueryString)

        console.log("products table passed")

        // Insert into products_categories
        for (let i = 0; i < insertProductsResults.rows.length; i++) {
            const row = `( '${insertProductsResults.rows[i].id}', 22 )`

            products_categoriesParamsStr += `${row}${i === insertProductsResults.rows.length - 1 ? "" : `,
                `}`;
        }

        let products_categoriesQueryString = `
            INSERT INTO products_categories (product_id, category_id)
            VALUES
                ${products_categoriesParamsStr};
        `

        console.log(products_categoriesQueryString)

        await client.query(products_categoriesQueryString)

        console.log("products_categories table passed")

        // insert into products_image_links
        for (let i = 0; i < insertProductsResults.rows.length; i++) {
            const linkNumber = i + 27
            const row = `( '${insertProductsResults.rows[i].id}', 'link${linkNumber.toString()}' )`

            products_image_linksParamsStr += `${row}${i === insertProductsResults.rows.length - 1 ? "" : `,
                `}`;
        }

        let products_image_linksQueryString = `
            INSERT INTO products_image_links (product_id, image_link)
            VALUES
                ${products_image_linksParamsStr};
        `

        console.log(products_image_linksQueryString)

        await client.query(products_image_linksQueryString)

        console.log("products_image_links table passed")

        await client.query('COMMIT');

        console.log("All tables passed")

    } catch(err) {
        await client.query('ROLLBACK');
        console.error(err.message ? err.message : "An error occurred while populating products");

    } finally {
        client.release();
    }
}

module.exports = {
    populateProducts,
    populateProductDescriptions
};