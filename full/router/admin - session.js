const express = require("express")

const config = require("../config.js")
const libs = require("../libs.js")

let router = express.Router()
module.exports = router


// router.get("/",(req, res)=>{
//     res.end("admin test ok")
// })


// 身份校验
router.use((req,res,next)=>{
    if(req.session["admin_id"] || req.url=="/login"){
        next()
    }else{
        res.redirect("/admin/login")
    }
})

// get方式为页面展现、post方式为数据请求
// login
router.get("/login",(req,res)=>{
    res.render("login",{error_msg:""}) // 模版渲染
})
router.post("/login",(req,res)=>{
    let {username,password} = req.body
    if(username ==config.root_user){ // 超管
        if(libs.md5(password) ==config.root_pass){
            req.session["admin_id"] = "1"
            res.redirect("/admin/")
        }else{
            showError("用户名或密码错误")
        }
    }else{ // 普管
        req.db.query(`select * from admin where username='${username}'`,(err,data)=>{
            if(err){
                showError("数据库错误")
            }else if(data.length ==0){
                showError("用户名或密码错误")
            }else{
                if(data[0].password ==libs.md5(password)){
                    req.session["admin_id"] = data[0].id
                    res.redirect("/admin/")
                }else{
                    showError("用户名或密码错误")
                }
            }
        })
    }

    function showError(msg){
        res.render("login",{error_msg:msg})
    }
})
