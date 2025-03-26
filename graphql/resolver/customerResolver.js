const pool = require('../../db/dbconfig');
const authMiddleware = require('../../middleware/authMiddleware.js');
const generateToken = require('../../utils/generateJwtToken');
const setCookie = require('../../utils/setCookie.js');
const jwt = require('jsonwebtoken');

const customerResolver = {
    Mutation: {
        register: async (_, { name, email, password, register_type }) => {
            try {
                console.log(">>>>>>", name, email, register_type);


                const tableName = register_type === "Merchant" ? "merchant" : "customer";

                const existingUser = await pool.query(
                    `SELECT email FROM ${tableName} WHERE email = $1`,
                    [email]
                );

                if (existingUser.rowCount !== 0) {
                    throw new Error("User already found");
                }

                const res = await pool.query(
                    `INSERT INTO ${tableName}(name, email, password) VALUES($1, $2, $3) RETURNING name`,
                    [name, email, password]
                );

                console.log(res.rows[0]);

                return "Registered successfully";
            } catch (err) {
                console.error("Registration error:", err.message);
                throw new Error(err.message);
            }
        },
        login: async (_, { email, password, login_type }, { res }) => {
            try {
                console.log(">>>>>", email, password, login_type);

                const tableName = login_type === "Merchant" ? "merchant" : "customer";
                const responce = await pool.query(
                    `SELECT * FROM ${tableName} WHERE email = $1`,
                    [email]
                );

                if (responce.rowCount === 0) {
                    throw new Error("User not found");
                }

                const user = responce.rows[0];

                if (user.password !== password) {
                    throw new Error("Invalid credentials");
                }

                console.log("User logged in successfully:", user.name);

                const data = {
                    id: user.id,
                    role: "customer"
                }
                const token = generateToken(data)
                setCookie(token, res)

                return "Login successful";
            } catch (error) {
                console.error("Error logging in:", error.message);
                throw new Error(error.message);
            }
        },
        setCustomerDetails: async (_, { id, name, address }, { req }) => {
            authMiddleware(req)
            try {
                const response = await pool.query(
                    `UPDATE customer SET name = $1, address = $2 WHERE id = $3`,
                    [name, address, id]
                );

                if (response.rowCount === 0) {
                    throw new Error("Update failed");
                }

                return "Update successful";
            } catch (err) {
                throw new Error("Error while updating: " + err.message);
            }
        },

        addNewProduct: async (_, { product_name, description, price, merchant_id, image }) => {
            try {
                const result = await pool.query(
                    `INSERT INTO product (product_name, description, price, merchant_id, image) 
                     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                    [product_name, description, price ?? 0, merchant_id, image]
                );

                if (!result.rows.length) {
                    throw new Error("Failed to add product.");
                }
                return "Product added successfully!";
            }
            catch (err) {
                console.error("Error adding product:", error);
                throw new Error("Error adding product.");
            }

        },

        addToCart: async (_, { product_id }, { req }) => {
            const decoded = authMiddleware(req);
            console.log(">>>>>>>>>>>>", decoded.id, product_id);

            try {
                const existingCart = await pool.query(
                    `SELECT 1 FROM cart WHERE customer_id = $1 AND product_id = $2`,
                    [decoded.id, product_id]
                );

                if (existingCart.rows.length > 0) {
                    return "product is already in the cart";
                }
                await pool.query(
                    `INSERT INTO cart (customer_id, product_id, quantity) VALUES ($1, $2, 1)`,
                    [decoded.id, product_id]
                );

                return "product added successfully";
            } catch (err) {
                console.error("Error adding to cart:", err);
                return "Failed to add product to cart";
            }
        },
        deleteCartProduct : async (_,{product_id} ,{req}) => {
            const decoded = authMiddleware(req);
            // console.log(product_id +" >>>>>>>>>>>>"+decoded);
            
            try{
                const removeCart = await pool.query(
                    `delete from cart where product_id = $1 and customer_id = $2`,[product_id,decoded.id]
                )

                if(removeCart.rowCount>0){
                    return "cart deleted successfully"
                }
                else{
                    return "failed to remove"
                }
            }
            catch(err){
                return "error while removing"
            }
        },

        saveRecentSearch: async (_, { SearchedProduct }, { req }) => {
            // const decoded = authMiddleware(req); 
            try {
                const setSearchedProduct = await pool.query(
                    `INSERT INTO recent_searches (customer_id, searched_product_name) VALUES ($1, $2)`,
                    [2, SearchedProduct]
                );
                return "Search saved successfully";
            } catch (err) {
                console.error("Error saving search:", err);
                return "Error while saving search";
            }
        }
        

    },

    Query: {
        getRandomProducts: async (_, { }) => {
            try {
                const res = await pool.query(
                    `SELECT * FROM product ORDER BY RANDOM() LIMIT 4`
                );

                if (res.rowCount === 0) {
                    throw new Error("No products found");
                }
                // console.log(res.rows);

                return res.rows;
            } catch (err) {
                console.error(err);
                throw new Error("Failed to fetch random products");
            }
        },
        getCustomerDetails: async (_, { id }, { req }) => {
            console.log(id, "  id");
            const authentication = authMiddleware(req)
            // if(!authentication){

            // }
            try {
                const res = await pool.query(
                    `select name , email , address from customer where id = $1`, [id]
                );

                if (res.rowCount === 0) {
                    throw new Error("No user Details Found");
                }

                return res.rows;
            }
            catch (err) {
                console.log(err);
                throw new Error("Failed to fetch the user Details");
            }

        },
        searchProducts: async (_, { search }, { req }) => {
            const decoded = authMiddleware(req);
        
            try {
                const query = `
                    SELECT * FROM product
                    WHERE LOWER(product_name) LIKE LOWER($1) 
                    OR LOWER(description) LIKE LOWER($1)
                `;
                console.log(decoded.id + " <<<<<<<<");
        
                const values = [`%${search}%`];
                const result = await pool.query(query, values);
        
                // **Only save the search if results exist**
                if (result.rows.length > 0) {
                    await pool.query(
                        `INSERT INTO recent_searches (customer_id, searched_product_name) 
                         VALUES ($1, $2)`,
                        [decoded.id, search]
                    );
                }
        
                return result.rows;
            } catch (error) {
                throw new Error("Error fetching products: " + error.message);
            }
        },
        
        getCartProducts: async (_, {},{ req }) => {
            const decoded = authMiddleware(req);
            console.log(decoded.id,"id>>>>");
            
            try {
                const gettingCart = await pool.query(
                    `select * from cart join product p on p.product_id = cart.product_id
                    where customer_id = $1`,[decoded.id]
                );
                if(gettingCart.rows.length>0){
                    console.log(gettingCart.rows);
                    return gettingCart.rows   
                }
            }
            catch(err){
                return [0];
            }
            
        },
        getCartQuantity : async(_,{},{req})=>{
            const decoded = authMiddleware(req);
            try{
                const CartQuantity = await pool.query(
                    `select count(*) as total_product from cart where customer_id =$1`,[decoded.id]
                )
                console.log(CartQuantity.rows[0]);
                return parseInt( CartQuantity.rows[0].total_product)
            }
            catch(err){
                return err;
            }

        }

    }
}

module.exports = customerResolver