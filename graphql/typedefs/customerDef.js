const { gql } = require("apollo-server-express")

const customerDef = gql`
    type product{
        product_id : Int,
        product_name : String,
        description : String ,
        price : Int,
        merchant_id : Int,
        image : String
    }
    type CustomerDetails{
        name : String,
        email : String,
        address : String,
    }

    type Query{
        getRandomProducts:[product]
        getCustomerDetails(id:Int):[CustomerDetails]
    }

    type  Mutation{
       register(name: String!, email: String!, password: String!, register_type: String): String!
       login(email : String! , password : String! , login_type : String) : String

    }
`

module.exports = customerDef