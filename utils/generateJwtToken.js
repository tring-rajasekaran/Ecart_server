const jwt = require("jsonwebtoken")

const generateToken=(user)=>{
    const token = jwt.sign({id:user.id , role:user.role } , process.env.JWT_SECRET_KEY,{
        expiresIn:'3d'
    })

    return token
}

module.exports=generateToken