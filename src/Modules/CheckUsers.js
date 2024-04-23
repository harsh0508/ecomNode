export default async function checkUsers(sql,name){
    const check = await sql `select * from users where name = ${name}`
    return check
}