
import express from 'express';
import bycrypt from 'bcrypt'
import *  as GridData from './src/DummyData/DummyDataGrid.json' assert {type:"json"}
import getBanner from './src/Modules/GetBanner.js';
import getGrids from './src/Modules/GetGrids.js';
import jwt from 'jsonwebtoken'
import {config} from 'dotenv';
import authenticateToken from './src/Middleware/authenticateToken.js';
import postgres from 'postgres';
import checkUsers from './src/Modules/CheckUsers.js';
import curDate from './src/Modules/GetCurDate.js';
import Razorpay from 'razorpay'
import { createClient } from 'redis';
import CheckPing from './src/Modules/CheckPing.js';
const app = express(); 
const PORT = 3000; 

config()    

// postgres values

let { PGHOST, PGDATABASE, PGUSER, PGPASSWORD, ENDPOINT_ID , RZR_KEY , RZR_SEC , REDIS_PASS} = process.env;


const razorPay  = new Razorpay({
    key_id: RZR_KEY,
    key_secret: RZR_SEC
})


const sql = postgres({
    host: PGHOST,
    database: PGDATABASE,
    username: PGUSER,
    password: PGPASSWORD,
    port: 5432,
    ssl: 'require',
    connection: {
      options: `project=${ENDPOINT_ID}`,
    },
  });


  const redis = createClient({
    username:"default",
    password:REDIS_PASS,
    socket:{
        host: 'redis-host-name',
        port: 14690
    }
  })

  await redis.connect()

// can use json
app.use(express.json())

  
app.get('/', (req, res)=>{ 
    res.status(200); 
    res.send("Welcome to root URL of Server"); 
}); 


app.get('/getRowOne', (req,res)=>{
    res.status(200)
    res.send(GridData)
})

app.get('/getBanner', (req,res)=>{
    // send banner corrosponding to the date
    res.send(getBanner())
})

app.get('/getGridOne',(req,res)=>{
    res.send(getGrids())
})



app.get('/getUser',authenticateToken,async(req,res)=>{
    const user = req.user.name
    const data = (await sql `select * from users where name = ${user}`).at(0)
    res.send(data)
})


app.post('/signUp',async(req,res)=>{
    const request  = (await CheckPing(req,redis,2)).req
    if(request)
        return res.sendStatus(404)

    try {
        const hashPassword =await bycrypt.hash(req.body.password,10)
        const user = {name:req.body.name,password:hashPassword,email:req.body.email}
        // const check = users.find(u=>u.name === req.body.name) // check user from db
       const check = await checkUsers(sql,user.name)
        if(check.length !== 0){
            // user exist
            console.log("user exists")
           return res.status(500).send()
        }
        console.log("signing up user")
        // users.push(user)// send the data to dataBase
        await sql `insert into users (id, name, email, address, orders, cart, password,created,updated)
        values (
            ${user.name},
            ${user.name},
            ${user.email},
            '[]',
            '[]',
            '[]',
            ${user.password},
            ${new Date().getDate.toString()},
            ''
        );
        `
        res.status(201).send()
    } catch (error) {
        console.log(error)
       res.status(500).send()
    }
})

app.post('/login' ,async(req,res)=>{
    const request  = (await CheckPing(req,redis,2)).req
    if(request)
        return res.sendStatus(404)

    try {
        const userName = req.body.name
        console.log(userName)
        const pass = req.body.password
        console.log(pass)

        const user = {name:userName,password:pass}

        // check if user exists 
        const check = await checkUsers(sql,userName)
        if(check.length === 0){
            // user does not exist
            return res.status(400).send()
        }
        const u = check.at(0)
        if(!await bycrypt.compare(pass,u.password)) return res.status(500).send()
        const accessToken = jwt.sign(user , process.env.ACCESS_SEC_TOKEN)
        res.json({accessToken : accessToken})

    } catch (error) {
        console.log(error)
        return res.status(500).send()
    }
})


app.get('/products/:id/:page/:filter',async(req,res)=>{
    const request  = (await CheckPing(req,redis,15)).req
    if(request)
        return res.sendStatus(404)

    try {
        const productCategory  = req.params.id
        const page = req.params.page
        let filter =JSON.parse(req.params.filter)
        let review , brands , price , type
        let newFilter = new Object()
        console.log(filter)
        if(Object.keys(filter).length !== 0){
            review =(filter.review === '-1' || undefined)?null: filter.review , 
            brands =(filter.brands !== undefined || filter.brands.length !==0)? filter.brands : null , 
            price =(filter.price === ''|| undefined)?null: filter.price , 
            type =(filter.type === '' || undefined)? null :filter.type
            
            
            if( filter.review !== undefined) newFilter.review = review
            if(filter.brands !== undefined)if(filter.brands.length !== 0)newFilter.brands = brands
            if(filter.price !== null)newFilter.price = price
            if(filter.type !== null)newFilter.type = type
        }
        console.log("new filter is :")
        console.log(newFilter)
        

        console.log("page is :"+page)
        if(page<1){
           return res.send([])
        }

        let first = (page*10-10)+1
        if(first === 1)
            first = first -1
        if(first < 0 ){
            return res.send([])
        }
        const last = page*10
        const pageNumber = {first,last}
        console.log(pageNumber)
        let products = []
        if(productCategory.slice(0,3) === "Str"){
            let val = productCategory.slice(3,productCategory.length)
            val = val +':*'
            console.log(`val is : ${val}`)
            console.log(await sql `select * from products where to_tsvector(name) @@ to_tsquery(${val}) order by id offset ${pageNumber.first} limit ${pageNumber.last}`)
            products = await sql `select * from products where to_tsvector(name) @@ to_tsquery(${val}) order by id offset ${pageNumber.first} limit ${pageNumber.last}`
        }
        else{
            products = await sql `select * from products where category = ${productCategory} order by id offset ${pageNumber.first} limit ${pageNumber.last}`
        }
        if(Object.keys(newFilter).length === 0)
            return res.send(products)
        else{
            if(newFilter.price !== undefined && newFilter.price !== null 
                && newFilter.type !== undefined && newFilter.type !== null){
                products = products.filter((e)=>{
                    if(type === '1') return parseFloat(e.price) > parseFloat(newFilter.price)
                    else return parseFloat(e.price) < parseFloat(newFilter.price)
                })
            }
            if(newFilter.brands !== undefined && newFilter.brands !== null ){
                console.log(newFilter.brand)
                products = products.filter((e)=>{
                return newFilter.brands.includes(e.company)})
                
            }
            if(newFilter.review !== undefined && newFilter.review !== null){
                newFilter.review = parseFloat(newFilter.review)
                products.forEach(e=>{
                    e.reviews
                })
            }
            return res.send(products)
        }
        // console.log(products.slice(first,last))
    } catch (error) {
        console.log(error)
    }
})


app.post('/order',authenticateToken,async(req,res)=>{
    const request  = (await CheckPing(req,redis,4)).req
    if(request)
        return res.sendStatus(404)

    try {
        // get user id and chekc the cart the total value and then consider the payment 

        const cartvalue = JSON.parse(req.body.order)
        const user = req.user
        const value = cartvalue.value
        const option = {
            amount : value *100,
            currency : "INR",
            receipt : 'order_id:1' ,
            payment_capture : 1
        }

        console.log(option)

        const response = await razorPay.orders.create(option)
        res.json(response)

    } catch (error) {
        console.log(error)
        res.status(400).send('Not able to create order. Please try again!')
    }
})


app.post('/verifyOrder',authenticateToken,async(req,res)=>{
    const request  = (await CheckPing(req,redis,3)).req
    if(request)
        return res.sendStatus(404)

    try {
        const{
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body
        const sign = order_id+""+payment_id
        const expectedSign = hmac_
    } catch (error) {
        console.log(error)
        res.status(500).json({message:"Internal server Error"})
    }
})

app.post('/addToCart',authenticateToken,async(req,res)=>{
    // get cart data and then check what is in user cart
    // update cart according to the userData
    const request  = await CheckPing(req,redis,50)
    if(request)
        {   console.log("rejected")
            return res.sendStatus(404)}

    try {
        const cartvalue  = JSON.parse(req.body.cart)
        const uid = req.user.name
        const response = await sql `update users set cart =${cartvalue} where id = ${uid}`
        console.log(response)
        if(!response){
            console.log("error")
            res.status(404).send()
        }
        else{
            res.send({
                res:true
            })
        }
    } catch (error) {
        console.log(error)
        res.status(404).send()
    }
})

app.get('/product/:id',async(req,res)=>{
    const request  = await CheckPing(req,redis,50)
    if(request)
        return res.sendStatus(404)

   try {
        const productID = req.params.id
        // after getting product id send product detail along with review
        let product  = await sql `select * from products where id = ${productID}`
        product = product[0]
        res.send(product)
   } catch (error) {
        res.status(404).send()
   }
})

app.post('/product/review',authenticateToken,async(req,res)=>{
    const request  = (await CheckPing(req,redis,3)).req
    if(request)
        return res.sendStatus(404)

    try {
        const productID = req.body.id
        const userID = req.user.name
        const Usereview = req.body.review
        let product  = await sql `select * from products where id = ${productID}`
        product = product[0]
        const exist = product.reviews.find(e=>e.uid === userID)
        if(exist !== undefined) return res.status(404).send()
        // update to products dataBase 
        await sql `update products
        set reviews = reviews || ${
            {
                
            "rating":req.body.review.rating,
            "uid":userID,
            "review":Usereview.review,
            "date":curDate()
        }
            }
        ::JSON
        where id = ${productID};
        `
        res.send({
            res:true
        })
    } catch (error) {
        console.log(error)
        res.status(404).send()
    }
    
})


app.post('/addAddress' , authenticateToken , async(req,res)=>{
    const request  = (await CheckPing(req,redis,3)).req
    if(request)
        return res.sendStatus(404)

    try {
        let address = (await sql `select address from users where id=${req.body.id}`).at(0).address
        console.log(address)
        console.log(req.body.address)
        let reqAdd = JSON.parse(req.body.address)
        reqAdd.id = address.length
        address.push(reqAdd)
        console.log(address)
        // update address

        await sql `update users set address = ${address} where id=${req.body.id}`
    } catch (error) {
        console.log(error)
        res.status(404).send()
    }
})

app.post('/removeAddress' , authenticateToken , async(req,res)=>{
    const request  = (await CheckPing(req,redis,20)).req
    if(request)
        return res.sendStatus(404)

    try {
        let address = (await sql `select address from users where id=${req.body.id}`).at(0).address
        console.log(address)
        const reqAdd = JSON.parse(req.body.address)
        address.forEach((e,i)=>{
            if(e.id === reqAdd.id){
                address.splice(i,1)
            }
        })
        console.log(address)
        // update address

        await sql `update users set address = ${address} where id=${req.body.id}`
    } catch (error) {
        console.log(error)
        res.status(404).send()
    }
})

app.get('/search/:str',async(req,res)=>{
    const request  = await CheckPing(req,redis,50)
    if(request)
        return res.sendStatus(404)

    try {
        let string = req.params.str
        string = string + ':*'
        console.log(string)
        const products = await sql `select name,id from products where to_tsvector(name) @@ to_tsquery(${string}) order by id offset 0 limit 3`
        res.send(products)
    } catch (error) {
        console.log(error)
    }
})












app.listen(PORT, (error) =>{ 
    if(!error) 
        console.log("Server is Successfully Running, and App is listening on port "+ PORT) 
    else 
        console.log("Error occurred, server can't start", error); 
    } 
); 