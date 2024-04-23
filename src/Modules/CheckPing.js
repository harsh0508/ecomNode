

export default async function CheckPing(req,redis,rate){
    const ip = (req.headers['x-forward-for'] || req.connection.remoteAddress)
    console.log(ip)
    let ttl
    const request = await redis.incr(ip)
    if(request === 1)
        {await redis.expire(ip,120)
        ttl = 120}
    else
        ttl = await redis.ttl(ip)

    console.log(`request rate is :${request} , ttl rate is : ${ttl}`)    

    if(request > rate)
            return true
    else
            return false

}