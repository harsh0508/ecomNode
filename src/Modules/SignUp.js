export default async function signUp(req){
    try {
        const salt =await bycrypt.genSalt()
        const hashPassword =await bycrypt.hash(req.body.password,salt)
        const user = {name:req.body.name,password:hashPassword}
        users.push(user)
        res.status(201).send()
    } catch (error) {
       res.status(500).send()
    }
}