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
    type CartProduct{
        customer_id : Int,
        product_id : Int,
        quantity : Int,
        product_name : String,
        description : String ,
        price : Int,
        merchant_id : Int,
        image : String,
    } 
    type CustomerDetails{
        name : String,
        email : String,
        address : String,
    }
    type SearchedProduct{
        searched_product_name : String
    }
    type OrderedProduct{
        product_id : Int,
        product_name : String,
        description : String ,
        price : Int,
        merchant_id : Int,
        image : String,
        quantity : Int,
        customer_name : String
    }

    type Query{
        getRandomProducts:[product]
        getCustomerDetails(id:Int):[CustomerDetails]
        searchProducts(search: String!): [product]
        getCartProducts(customer_id : Int) : [CartProduct]
        getCartQuantity : Int
        getRecentSearch: [SearchedProduct]
        getOrdersProduct : [OrderedProduct]
    }
    input OrderInput {
        product_id: Int!
        quantity: Int!
    }


    type  Mutation{
       register(name: String!, email: String!, password: String!, register_type: String): String!
       login(email : String! , password : String! , login_type : String) : String
       setCustomerDetails(id : Int! ,name : String!,  address : String!) : String
       addNewProduct(product_name : String! , description : String! , price : Int , merchant_id : Int , image : String) : String
       addToCart(product_id : Int!) : String,
       deleteCartProduct(product_id : Int!) : String,
       setOrders(orders: [OrderInput!]!): String,
    }
`

module.exports = customerDef