const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const cookieparser = require('cookie-parser')
const {ApolloServer} = require('apollo-server-express')
const {typeDefs,resolvers} =require('./graphql/index.js')


const app = express()
dotenv.config()

app.use(cors())

app.use(express.json())
app.use(cookieparser())

const serverStart = async()=>{
    try{        
        const server = new ApolloServer({
            typeDefs,
            resolvers,
        })

        await server.start()
        server.applyMiddleware({app,cors:false})
        app.listen(process.env.PORT,()=>{
            console.log("app running in port",process.env.PORT);
        })
    }
    catch(err){
        console.log("error from start server",err);
    }
}

serverStart()