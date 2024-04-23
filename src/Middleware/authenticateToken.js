import jwt from 'jsonwebtoken'
import {config} from 'dotenv';

config()    


export default function authenticateToken( req , res , next){
    let authHeader = req.headers['authorization']
    if(authHeader === undefined || null){
        authHeader = req.body.Authorization
    }
    console.log(authHeader)
    const token = authHeader && authHeader.split(' ')[1]
    console.log(token)
    if(token === null || undefined){
        // we have invalid token
        return res.sendStatus(401)
    }
    jwt.verify(token, process.env.ACCESS_SEC_TOKEN , (e , user) =>{
        if(e) return res.sendStatus(403)
        req.user = user
        console.log(user)
        next()
    })
}





// app.post('/uploadData' , async(req,res)=>{
//     try {
//         const data =  ProductData.default
//         data.forEach(async(element) => {
//             await sql `INSERT INTO products (id, category, name, types, reviews, price, discount, company, image, description, detail)
//             VALUES (
//                 ${element.id},
//                 ${element.category},
//                 ${element.name},
//                 ${element.types}::JSON[],
//                 ${element.reviews}::JSON[],
//                 ${element.price},
//                 ${element.discount},
//                 ${element.company},
//                 ${element.image},
//                 ${element.description},
//                 ${element.detail}
//             );`.then(()=>console.log(element))
//             // console.log(element)
//         });
//     } catch (error) {
//         console.log(error)
//     }
// })