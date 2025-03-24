const {Pool} = require("pg")

const pool = new Pool({
    user:"postgres",
    host:"localhost",
    database: "ECART" || process.env.DB_NAME,
    password: "1234" || process.env.DB_PASSWORD,
    port: 5433 ||  process.env.DB_PORT
})

module.exports = pool;