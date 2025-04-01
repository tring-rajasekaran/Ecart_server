const bcrypt = require("bcryptjs");
const CryptoJS = require("crypto-js");
const pool = require('../../db/dbconfig');
const authMiddleware = require('../../middleware/authMiddleware.js');
const generateToken = require('../../utils/generateJwtToken');
const setCookie = require('../../utils/setCookie.js');
const jwt = require('jsonwebtoken');
const secretKey = "Rajasekaran3300";



const customerResolver = {
    Mutation: {
        register: async (_, { name, email, password, register_type }) => {

            try {
                console.log(">>>>>>", name, email, register_type);
                const decryptedPassword = CryptoJS.AES.decrypt(password, secretKey).toString(CryptoJS.enc.Utf8);
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(decryptedPassword, salt);
                // console.log(hashedPassword +"hashedPassword ");

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
                    [name, email, hashedPassword]
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


                const decryptedPassword = CryptoJS.AES.decrypt(password, secretKey).toString(CryptoJS.enc.Utf8);

                if (responce.rowCount === 0) {
                    throw new Error("User not found");
                }

                const user = responce.rows[0];
                console.log(user.password +" passowrd ", decryptedPassword ," <<<<<<<<");
                
                const isMatch = await bcrypt.compare(decryptedPassword, user.password);
                if (isMatch) {
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
        setCustomerDetails: async (_, { name, address }, { req }) => {
            const decoded = authMiddleware(req)
            try {
                const response = await pool.query(
                    `UPDATE customer SET name = $1, address = $2 WHERE id = $3`,
                    [name, address, decoded.id]
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
            // console.log(">>>>>>>>>>>>", decoded.id, product_id);

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
        deleteCartProduct: async (_, { product_id }, { req }) => {
            const decoded = authMiddleware(req);
            // console.log(product_id +" >>>>>>>>>>>>"+decoded);

            try {
                const removeCart = await pool.query(
                    `delete from cart where product_id = $1 and customer_id = $2`, [product_id, decoded.id]
                )

                if (removeCart.rowCount > 0) {
                    return "cart deleted successfully"
                }
                else {
                    return "failed to remove"
                }
            }
            catch (err) {
                return "error while removing"
            }
        },

        setOrders: async (_, { orders }, { req }) => {
            const decoded = authMiddleware(req);

            try {
                const res = orders.map(({ product_id, quantity }) => {
                    return pool.query(
                        `insert into orders (customer_id , product_id , quantity) values ($1 , $2 , $3)`, [decoded.id, product_id, quantity]
                    )
                });

                await Promise.all(res);

                return "ordered successfully"
            }
            catch (err) {
                console.log(err, " error occured");
                return "failed to order"
            }
        },

        updateMerchantProduct: async (_, { input }) => {
            console.log("Received Input:", input);
            if (!input.product_id) {
                throw new Error("Product ID is missing!");
            }
            try {
                const res = await pool.query(
                    `UPDATE product SET product_name = $1, description = $2, price = $3, price = $4 WHERE product_id = $5 `,
                    [input.product_name, input.description, input.price, input.image, input.product_id]
                );
                return "updated successfully";
            } catch (err) {
                console.error("DB Error:", err);
                throw new Error("Database update failed");
            }
        },
        addMerchantProduct: async (_, { input }, { req }) => {

            const decoded = authMiddleware(req);
            console.log("added product ", input);
            try {
                const res = await pool.query(
                    `insert into product(product_name , description ,price , image , merchant_id)
                    values($1,$2,$3,$4,$5)`, [input.product_name, input.description, input.price, input.image, decoded.id]
                )
                return "Product Added successfully"
            }
            catch (err) {
                console.log("failed to add", err);
                throw new Error("Databse add failed");
            }

        },

        deleteMerchantProduct: async (_, { id }, { req }) => {

            const decoded = authMiddleware(req);
            try {
                const res = await pool.query(
                    `delete from product where product_id = $1 and merchant_id = $2`, [id, decoded.id]
                );
                if (res.rowCount > 0) {
                    return "product deleted successfully"
                }
                return "failed to delete product"

            }
            catch (err) {
                throw new Error("Failed")
            }
        },

        changeOrderStatus: async (_, { statusofOrder, product_id }, { req }) => {
            console.log(statusofOrder , " <<<<<<<<<<< ", product_id );
            
            const decoded = authMiddleware(req); 
        
            try {
                const res = await pool.query(
                    `UPDATE orders 
                     SET order_status = $1 
                     WHERE product_id = $2 
                     RETURNING *;`,
                    [statusofOrder, product_id]
                );
        
                if (res.rowCount > 0) {
                    return `Order status updated to '${statusofOrder}' successfully.`;
                } else {
                    return "Failed to update order status. Order not found.";
                }
            } catch (err) {
                console.error("Error updating order status:", err);
                return "Internal server error.";
            }
        },

        logout : async(_ , {},{res})=>{
            try{
                await res.clearCookie("jwt", { path: "/", httpOnly: true, sameSite: "Lax" });
                return " Logout Successfull";
            }
            catch(err){
                throw new Error("Failed to log out",err);
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
        getCustomerDetails: async (_, { }, { req }) => {
            const decoded = authMiddleware(req)
            // console.log("Decoded ID:", decoded.id);

            try {
                const res = await pool.query(
                    `select name , email , address from customer where id = $1`, [decoded.id]
                );

                if (res.rowCount === 0) {
                    throw new Error("No user Details Found");
                }
                console.log(res.rows + " result");

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
                    WHERE (product_name) ILIKE ($1) 
                    OR (description) ILIKE ($1)
                `;
                // console.log(decoded.id + " <<<<<<<<", search);

                const values = [`%${search}%`];
                const result = await pool.query(query, values);

                // **Only save the search if results exist**
                if (result.rows.length > 0) {
                    await pool.query(
                        `INSERT INTO recent_searches (customer_id, searched_product_name) 
                         VALUES ($1, $2)
                         ON CONFLICT (customer_id, searched_product_name) DO NOTHING`,
                        [decoded.id, search]
                    );
                }

                return result.rows;
            } catch (error) {
                throw new Error("Error fetching products: " + error.message);
            }
        },

        getCartProducts: async (_, { }, { req }) => {
            const decoded = authMiddleware(req);
            // console.log(decoded.id, "id>>>>");

            try {
                const gettingCart = await pool.query(
                    `select * from cart join product p on p.product_id = cart.product_id
                    where customer_id = $1`, [decoded.id]
                );
                if (gettingCart.rows.length > 0) {
                    // console.log(gettingCart.rows);
                    return gettingCart.rows
                }
            }
            catch (err) {
                return [0];
            }

        },
        getCartQuantity: async (_, { }, { req }) => {
            const decoded = authMiddleware(req);
            try {
                const CartQuantity = await pool.query(
                    `select count(*) as total_product from cart where customer_id =$1`, [decoded.id]
                )
                console.log(CartQuantity.rows[0]);
                return parseInt(CartQuantity.rows[0].total_product)
            }
            catch (err) {
                return err;
            }

        },
        getRecentSearch: async (_, { }, { req }) => {
            const decoded = authMiddleware(req);

            try {
                const res = await pool.query(
                    `select searched_product_name from recent_searches where customer_id = $1  AND LENGTH(searched_product_name) > 2 limit 5`, [decoded.id]
                )
                if (res.rows.length === 0) {
                    console.log("error in fetching the recent search product ");

                    return [];
                }
                console.log(res.rows, " result");
                return res.rows
            }
            catch (err) {
                console.log("error while fetching");

                return [];
            }
        },

        getOrdersProduct: async (_, { }, { req }) => {
            const decoded = authMiddleware(req)

            try {
                const res = await pool.query(
                    `SELECT 
                        o.product_id, 
                        o.quantity,  
                        p.product_name, 
                        p.description, 
                        p.price, 
                        p.merchant_id,
                        p.image,
                        c.name as customer_name,
                        o.order_status as order_status
                    FROM orders o
                    JOIN product p ON p.product_id = o.product_id  
                    JOIN customer c ON c.id = o.customer_id
                    WHERE o.customer_id = $1;`,
                    [decoded.id]
                );

                if (res.rows.length > 0) {
                    return res.rows;
                } else {
                    console.log("No products found for this customer.");
                    return [];
                }
            } catch (err) {
                console.error(err, " error occurred");
                return [];
            }
        },

        //merchant functionality 

        getMerchantProduct: async (_, { }, { req }) => {
            const decoded = authMiddleware(req);

            try {
                const res = await pool.query(
                    `select * from product where merchant_id = $1`, [decoded.id]
                )
                if (res.rows.length === 0) {
                    return res.rows;
                }
                console.log("merchant product fetched successfully");
                return res.rows;
            }
            catch (err) {
                console.log(err.message);
                return []
            }
        },

        getMerchantOrders: async (_, { }, { req }) => {
            const decoded = authMiddleware(req);

            try {
                const res = await pool.query(
                    `select o.*,p.*,customer.* from product p
                    join orders o on o.product_id = p.product_id 
                    join customer on o.customer_id = customer.id
                    where merchant_id = $1`,[decoded.id]
                )
                if(res.rows.length>0){
                    return res.rows;
                }
            }
            catch(err){
                console.log(err ,"error occured ");
                
            }
        }





    }
}

module.exports = customerResolver