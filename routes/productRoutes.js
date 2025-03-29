const express = require('express');
const productRouter = express.Router();
const pool = require("../config/db");
const isAuthenticated = require("../utils/middlewareAuthe");
const createInsertQuery = require('../utils/createInsertQuery');

productRouter.get("/", (req, res, next) => {
    const getProductsQuery = `
         SELECT 
            products.id,
            products.name AS product_name,
            products.stock,
            products.price,
            users.name AS seller_name,
            ARRAY_AGG(categories.name) AS categories,
            AVG(products_reviews.rating) AS average_rating
        FROM products
        JOIN users
            ON products.seller_id = users.id
        JOIN products_categories
            ON products.id = products_categories.product_id
	 	JOIN categories
            ON products_categories.category_id = categories.id
        LEFT JOIN products_reviews
            ON products.id = products_reviews.product_id
        GROUP BY products.id, users.name;
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
		categories,
        images
    } = req.body

    const seller_id = req.user.id

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

        // Insert row into products table, get id
        const productCols = {
            name,
            stock,
            price,
            seller_id
        }

        const { insertQuery: productInsertQuery, valsArr: productInsertVals } = createInsertQuery("products", productCols);

        const insertProductResult = await client.query(
            productInsertQuery,
            productInsertVals
        )

        const productId = insertProductResult.rows[0].id;
        
        // Get IDs of categories
        let categoryCount = 0;
        let categoryParamsStr = "";
        for (const cat of categories) {
            categoryCount++;
            categoryParamsStr += `$${categoryCount}${categoryCount === categories.length ? "" : ", "}`
        }

        const categoryIdsQuery = `
            SELECT id
            FROM categories
            WHERE name IN (${categoryParamsStr})
        `

        const categoryIdsResult = await client.query(
			categoryIdsQuery,
			categories
		)

        let categoryIds = [];
        for (const row of categoryIdsResult.rows) {
            categoryIds.push(row.id)
        }

        // Insert rows into products_categories table
        let categoryIdCount = 0;
        let categoryIdParamsStr = "";
        for (const id of categoryIds) {
            categoryIdCount++;
            categoryIdParamsStr += `($1, $${categoryIdCount + 1})${categoryIdCount === categoryIds.length ? "" : `,
                `}`
        }
        const insertProductCategoryQuery = `
            INSERT INTO products_categories (product_id, category_id)
            VALUES
                ${categoryIdParamsStr}
        `
        const insertProductCategoryVals = [productId, ...categoryIds]
        const insertProductCategoryResults = await client.query(
            insertProductCategoryQuery,
            insertProductCategoryVals
        )

        // Insert row into product_image_links table, get id
        // Need to upload the images to the CDN, get the links to the images, AND THEN, carry out this endpoint
        let imageLinkCount = 0;
        let productImgLinksParamsStr = "";
        for (const link of images) { // needs to change into an array of image links instead of array of images
            imageLinkCount++;
            productImgLinksParamsStr += `($1, $${imageLinkCount + 1})${imageLinkCount === images.length ? "" : `,
                `}`
        }
        const insertProductImgLinkQuery = `
            INSERT INTO products_image_links (product_id, image_link)
            VALUES
                ${productImgLinksParamsStr}
        `
        const insertProductImgLinkVals = [productId, ...images]
        const insertProductImgLinkResults = await client.query(
            insertProductImgLinkQuery,
            insertProductImgLinkVals
        )
        
		
		await client.query('COMMIT');

		res.status(201).json({ 
            message: "Product published successfully",
            product_id: productId,
            category_ids: categoryIds,
            image_links: images
        });

	} catch (err) {
		await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ errorMessage: `${err.message ? err.message : "An error occurred while publishing the product"}`});

	} finally {
		client.release();
	}
})

// DRY validate productId
productRouter.param("productId", async (req, res, next, id) => {
    const productInfoQuery = `
         SELECT 
            products.id,
            products.name AS product_name,
            products.stock,
            products.price,
            users.name AS seller_name,
            ARRAY_AGG(DISTINCT categories.name) AS categories,
            AVG(products_reviews.rating) AS average_rating
        FROM products
        JOIN users
            ON products.seller_id = users.id
        JOIN products_categories
            ON products.id = products_categories.product_id
	 	JOIN categories
            ON products_categories.category_id = categories.id
        LEFT JOIN products_reviews
            ON products.id = products_reviews.product_id
        WHERE products.id = $1
        GROUP BY products.id, users.name;
    `

    try {
        const results = await pool.query(productInfoQuery, [id]);

        if (results.rows.loength === 0) {
            return res.status(404).json({ errorMessage: "Product not found"})
        }

        const product = results.rows[0];

        if (product) {
            req.product = product;
            next()
        }

    } catch(err) {
        res.status(500).json({ errorMessage: `Error fetching product: ${err.message}` });
    }
})

productRouter.get("/:productId", isAuthenticated, async (req, res, next) => {
    res.status(200).send(req.product);
})

productRouter.post("/:productId", isAuthenticated, async (req, res, next) => {
    
    const {
        rating,
        review
    } = req.body

    const reviewer_id = req.user.id
    const product_id = req.product.id

    try {
        const products_reviewsInsertQuery = `
            INSERT INTO products_reviews(reviewer_id, rating, review, product_id)
            VALUES ($1, $2, $3, $4)
        `
        
        const products_reviewsInsertResult = await pool.query(
            products_reviewsInsertQuery,
            [
                reviewer_id,
                rating,
                review,
                product_id
            ]
        )

        res.status(201).json({ 
            message: "Review posted successfully"
        });

    } catch(err) {
        res.status(500).json({ errorMessage: `${err.message ? err.message : "An error occurred while posting review"}`});
    }

	// try {
	// 	client = await pool.connect();
    //     await client.query('BEGIN');

    //     const productReviewsColsVals = {
    //         rating,
    //         review,
    //         product_id
    //     }

    //     const { insertQuery: product_reviewsInsertQuery, valsArr: product_reviewsInsertVals } = createInsertQuery("product_reviews", productReviewsColsVals);

    //     const product_reviewsInsertResult = await client.query(
    //         product_reviewsInsertQuery,
    //         product_reviewsInsertVals
    //     )

    //     const review_id = product_reviewsInsertResult.rows[0].id;

    //     await client.query('COMMIT')

    //     res.status(201).json({ 
    //         message: "Review posted successfully",
    //         review_id
    //     });
        
    // } catch(err) {
    //     await client.query('ROLLBACK');
    //     console.error(err);
    //     res.status(500).json({ errorMessage: `${err.message ? err.message : "An error occurred while posting the review"}`});

    // } finally {
    //     client.release();
    // }
})

productRouter.put("/:productId", isAuthenticated, async (req, res, next) => {

})

module.exports = productRouter;