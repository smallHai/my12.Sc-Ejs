const express = require("express")
const mysql = require("mysql")

const cookieParser = require("cookie-parser")
const cookieSession = require("cookie-session")
const consolidate = require("consolidate") // 模版解析引擎
const bodyParser = require("body-parser") // 解析post数据
const multer = require("multer") // 文件上传

const config = require("./config.js")

const admin_router = require("./router/admin.js")
const user_router = require("./router/user.js")


// 开启服务
const server = express()
server.listen(config.port)

// 连接数据库
const db = mysql.createPool({
    host: config.mysql_host,
    port: config.mysql_port,
    user: config.mysql_user,
    password: config.mysql_pass,
    database: config.mysql_db_name
})


// 使用中间件
server.use((req,res,next)=>{
    req.db = db
    next()
})

server.use(bodyParser.urlencoded({extended:false})) //req.body

const multerObj = multer({dest:"./upload"}) //req.files
server.use(multerObj.any())

server.use(cookieParser(config.cookie_key)) // req.cookies res.cookie

server.use(cookieSession({ // req.session
    keys: config.session_key
}))

server.set("html", consolidate.ejs) // 引擎
server.set("views", "./templete") // 位置
server.set("view engine", "ejs") // 扩展名

// 接口路由
server.use("/admin/",admin_router)
server.use("/",user_router)

// 静态文件路由
server.use(express.static("./www/"))