const pool = require('../../db/dbconfig');


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
        login: async (_, { email, password, login_type }) => {
            try {
                console.log(">>>>>", email, password, login_type);

                const tableName = login_type === "Merchant" ? "merchant" : "customer";
                const res = await pool.query(
                    `SELECT * FROM ${tableName} WHERE email = $1`,
                    [email]
                );

                if (res.rowCount === 0) {
                    throw new Error("User not found");
                }

                const user = res.rows[0];

                if (user.password !== password) {
                    throw new Error("Invalid credentials");
                }

                console.log("User logged in successfully:", user.name);

                return "Login successful";
            } catch (error) {
                console.error("Error logging in:", error.message);
                throw new Error(error.message);
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
        getCustomerDetails: async (_, {id }) => {
            console.log(id, "  id");
            
            try {
                const res = await pool.query(
                    `select name , email , address from customer where id = $1`,[id]
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
    }
}

module.exports = customerResolver