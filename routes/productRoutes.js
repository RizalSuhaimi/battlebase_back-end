const express = require('express');
const productRouter = express.Router();
const pool = require("../config/db");
const isAuthenticated = require("../utils/middlewareAuthe");
const createInsertQuery = require('../utils/createInsertQuery');

productRouter.get("/", (req, res, next) => {
    const getProductsQuery = `
         SELECT 
            products.id,
            products.name,
            products.stock,
            products.price,
            users.name,
            product_reviews.rating,
            product_reviews.review,
            categories.name,
			product_image_links.link
        FROM products
        JOIN users
            ON products.seller_id = users.id
        JOIN product_reviews
            ON products.id = product_reviews.product_id
		JOIN products_categories
            ON products.id = products_categories.product_id
		JOIN categories
            ON products_categories.categoryid = categories.id
        JOIN product_image_links
            ON products.id = product_image_links.product_id;
    `

    try {
        pool.query(getProductsQuery, (err, results) => {
            if (err) {
                throw err;
            }
            res.status(200).json(results.rows);
        })

    } catch(err) {
        res.status(500).json({ errorMessage: `${err.message ? err.message : "An error occurred while getting products"}`});
    }
})

productRouter.post("/", isAuthenticated, async (req, res, next) => {
	const {
        name,
        stock,
        price,
        seller_id,
		categories,
        images=null
    } = req.body

	let client;

	try {
		client = await pool.connect();
        await client.query('BEGIN');

		// check if user has registered as seller
		const is_sellerQuery = `
			SELECT is_seller
			FROM users
			WHERE id = $1`

		const is_sellerResult = await client.query(
			is_sellerQuery,
			[seller_id]
		)

        const is_seller = is_sellerResult.rows[0].is_seller

		if (!is_seller) {
			throw new Error("User is not registered as a seller")
		}
		
		await client.query('COMMIT');

		res.status(201).json({ message: "Product published successfully", is_seller });

	} catch (err) {
		await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ errorMessage: `${err.message ? err.message : "An error occurred while publishing the product"}`});

	} finally {
		client.release();
	}
})

module.exports = productRouter;