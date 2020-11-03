const express = require("express")
const fs = require("fs")

const config = require("../config.js")
const libs = require("../libs.js")

let router = express.Router()
module.exports = router


// router.get("/",(req, res)=>{
//     res.end("admin test ok")
// })


// 身份校验
router.use((req,res,next)=>{
    if(!req.cookies["token"] && req.path !="/login"){
        res.redirect(`/admin/login?ref=${req.url}`)
    }else{
        if(req.path =="/login"){
            next()
        }else{
            let token = req.cookies["token"]
            req.db.query(`select * from admin_token where id='${token}'`,(err,data)=>{
                if(err){
                    res.sendStatus(500)
                }else if(data.length ==0){
                    res.redirect(`/admin/login?ref=${req.url}`)
                }else{
                    req.admin_id = data[0].admin_id
                    next()
                }
            })
        }
    }
})

/*-- get方式为页面展现、post方式为数据请求 --*/

// login
router.get("/login",(req,res)=>{
    res.render("login",{error_msg:"",ref:req.query["ref"]||""}) // 模版渲染
})

router.post("/login",(req,res)=>{
    let {username,password} = req.body
    if(username ==config.root_user){ // 超管
        if(libs.md5(password) ==config.root_pass){
            setToken(1)
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
                    setToken(data[0].id)
                }else{
                    showError("用户名或密码错误")
                }
            }
        })
    }

    function showError(msg){
        res.render("login",{error_msg:msg,ref:req.query["ref"]||""})
    }
    function setToken(admin_id){
        let id = libs.uuid()
        let oDate = new Date()
        oDate.setMinutes(oDate.getMinutes()+20)
        let time = Math.floor(oDate.getTime()/1000)
        req.db.query(`insert into admin_token (id,admin_id,expires) values('${id}','${admin_id}','${time}')`,err=>{
            if(err){
                res.sendStatus(500)
            }else{
                res.cookie('token',id)
                let ref = req.query['ref']
                if(ref){
                    res.redirect(`/admin${ref}`)
                }else{
                    res.redirect("/admin/")
                }
            }
        })
    }
})



// index
router.get("/",(req,res)=>{
    res.redirect("/admin/house")
})

router.get("/:table",(req,res)=>{
    let {table} = req.params
    if(!config[`admin_show_${table}`]){
        res.sendStatus(404)

    }else{
        let queryArray = []
        let showJson = {}
        config[`admin_show_${table}`].split(",").forEach(item=>{
            let [queryItem, showItem] = item.split(":")
            queryArray.push(queryItem)
            showJson[queryItem] = showItem
        })

        // 分页
        let page = req.query.page
        let pageSize = 5
        if(!page){
            page = 1
        }
        if(!/^[1-9]\d*$/.test(page)){
            page = 1
        }
        let pageStart = (page-1)*pageSize

        // 搜索
        let likeStr = "1=1"
        if(req.query.keyword){
            let keys = req.query.keyword.split(/\s+/g)
            likeStr = keys.map(item=>`title like '%${item}%'`).join(" or ")
        }
        req.db.query(`select ${queryArray.join(',')} from ${table} where ${likeStr} order by create_time desc limit ${pageStart},${pageSize}`,(err,data)=>{
            if(err){
                res.sendStatus(500)
            }else{
                req.db.query(`select count(*) as total from ${table} where ${likeStr}`,(totalErr,totalData)=>{
                    if(totalErr){
                        res.sendStatus(500)
                    }else{
                        let pageCount = Math.ceil(totalData[0].total/pageSize)
                        if(pageCount<=0){
                            pageCount = 1
                        }
                        res.render("index",{
                            data,
                            pageCount,
                            showJson,
                            table,
                            keyword:req.query.keyword
                        })
                    }
                })
            }
        })

    }
})

router.post("/:table",(req,res)=>{
    // console.log(req.body)   // post的数据
    // console.log(req.files) // 上传的数据
    // req.body["sale_time"] = libs.toTimestamp(req.body["sale_time"])
    // req.body["submit_time"] = libs.toTimestamp(req.body["submit_time"])

    // let aImgPath = []
    // let aImgRealPath = []
    // for(let i=0; i<req.files.length; i++){
    //     switch(req.files[i].fieldname){
    //         case "main_img":
    //             req.body["main_img_path"] = req.files[i].filename
    //             req.body["main_img_real_path"] = req.files[i].path.replace(/\\/g,'\\\\\\\\')
    //         break
    //         case "imgs":
    //             aImgPath.push(req.files[i].filename)
    //             aImgRealPath.push(req.files[i].path.replace(/\\/g,'\\\\\\\\'))
    //         break
    //         case "property_img":
    //             req.body["property_img_paths"] = req.files[i].filename
    //             req.body["property_img_real_paths"] = req.files[i].path.replace(/\\/g,'\\\\\\\\')
    //         break
    //     }
    // }
    // req.body["img_paths"] = aImgPath.join(",")
    // req.body["img_real_paths"] = aImgRealPath.join(",")
    //
    // let file_infos = {
    //     "house": {
    //         "img": {
    //             path: "img_path",
    //             real_path: "img_real_path",
    //             type: "single"
    //         }
    //     },
    //     "ad": {
    //         "img": {
    //             path: "img_path",
    //             real_path: "img_real_path",
    //             type: "single"
    //         }
    //     }
    // }
    // let file_info = file_infos[`${table}`]

    let {table} = req.params
    if(!config[`admin_insert_${table}`]){
        res.sendStatus(404)

    }else{
        if(req.body["is_edit"] =="true"){ // 编辑
            let fields = config[`admin_insert_${table}`].split(",")
            config[`admin_dis_edit`].split(",").forEach(name=>{
                fields = fields.filter(item=>item!=name)
            })
            let arr = []
            fields.forEach(item=>{
                arr.push(`${item}='${req.body[item]}'`)
            })
            let sql = `update ${table} set ${arr.join(',')} where id='${req.body['old_id']}'`
            req.db.query(sql,err=>{
                if(err){
                    res.sendStatus(500)
                }else{
                    res.redirect(`/admin/${table}`)
                }
            })
        }else{ // 新增

            let file_info = {
                "img": {
                    path: "img_path",
                    real_path: "img_real_path",
                    type: "single"
                },
                "main_img": {
                    path: "main_img_path",
                    real_path: "main_img_real_path",
                    type: "single"
                },
                "imgs": {
                    path: "img_paths",
                    real_path: "img_real_paths",
                    type: "array"
                },
                "property_img": {
                    path: "property_img_paths",
                    real_path: "property_img_real_paths",
                    type: "array"
                }
            }

            let file_pahts = {};
            let file_real_pahts = {};
            for(let i=0; i<req.files.length; i++){
                let name = req.files[i].fieldname
                if(file_info[name]){
                    if(!file_pahts[name]){
                        file_pahts[name] = []
                        file_real_pahts[name] = []
                    }
                    file_pahts[name].push(req.files[i].filename)
                    file_real_pahts[name].push(req.files[i].path.replace(/\\/g,'\\\\\\\\'))
                }
            }
            for(let name in file_pahts){
                if(file_info[name].type =="single"){
                    req.body[file_info[name].path] = file_pahts[name][0]
                    req.body[file_info[name].real_path] = file_real_pahts[name][0]
                }else{
                    req.body[file_info[name].path] = file_pahts[name].join(",")
                    req.body[file_info[name].real_path] = file_real_pahts[name].join(",")
                }
            }

            req.body["id"] = libs.uuid()
            req.body["admin_id"] = req.admin_id

            let arrField = []
            let arrValue = []
            config[`admin_insert_${table}`].split(",").forEach(name=>{
                arrField.push(name)
                arrValue.push(req.body[name])
            })
            arrField.push("create_time")
            arrValue.push(libs.toTimestamp())
            let sql = `insert into ${table} (${arrField.join(",")}) values('${arrValue.join("','")}')`
            req.db.query(sql,err=>{
                if(err){
                    res.sendStatus(500)
                }else{
                    res.redirect(`/admin/${table}`)
                }
            })
        }

    }
})

router.get("/:table/delete",(req,res)=>{
    let {table} = req.params
    let idString = req.query["id"]
    let idArray = idString.split(",")
    let idArrayErr = false
    idArray.forEach(item=>{
        if(!/^(\d|[a-f]){32}$/.test(item)){
            idArrayErr = true
        }
    })

    if(idArrayErr){
        res.sendStatus(400,"数据错误")
    }else{
        let idArrayCount = 0
        idArrayDelete()

        function idArrayDelete(){
            let id = idArray[idArrayCount]
            req.db.query(`select * from ${table} where id='${id}'`,(err,data)=>{
                if(err){
                    res.sendStatus(500)
                }else if(data.length ==0){
                    res.sendStatus(404,"Not Found")
                }else{
                    let imgArr = []

                    if(data[0]["main_img_real_path"] && data[0]["main_img_real_path"]!="undefined"){
                        imgArr.push(data[0]["main_img_real_path"])
                    }
                    if(data[0]["img_real_paths"] && data[0]["img_real_paths"]!="undefined"){
                        data[0]["img_real_paths"].split(",").forEach(item=>{
                            imgArr.push(item)
                        })
                    }
                    if(data[0]["img_real_path"] && data[0]["img_real_path"]!="undefined"){
                        data[0]["img_real_path"].split(",").forEach(item=>{
                            imgArr.push(item)
                        })
                    }
                    if(data[0]["property_img_real_paths"] && data[0]["property_img_real_paths"]!="undefined"){
                        data[0]["property_img_real_paths"].split(",").forEach(item=>{
                            imgArr.push(item)
                        })
                    }

                    if(imgArr.length >0){
                        // 删除
                        let i = 0
                        deleteNext() // 删除文件
                        function deleteNext(){
                            fs.unlink(imgArr[i],fsErr=>{
                                if(fsErr){
                                    res.sendStatus(500)
                                }else{
                                    i++
                                    if(i >=imgArr.length){
                                        req.db.query(`delete from ${table} where id='${id}'`,delErr=>{
                                            if(delErr){
                                                res.sendStatus(500)
                                            }else{
                                                if(idArrayCount<idArray.length){
                                                    idArrayDelete()
                                                }else{
                                                    res.redirect(`/admin/${table}`)
                                                }
                                            }
                                        })
                                        idArrayCount++
                                    }else{
                                        deleteNext()
                                    }
                                }
                            })
                        }
                    }else{
                        req.db.query(`delete from ${table} where id='${id}'`,delErr=>{
                            if(delErr){
                                res.sendStatus(500)
                            }else{
                                if(idArrayCount <idArray.length){
                                    idArrayDelete()
                                }else{
                                    res.redirect(`/admin/${table}`)
                                }
                            }
                        })
                        idArrayCount++
                    }
                }
            })
        }
    }
})

router.get("/:table/detail",(req,res)=>{
    let {table} = req.params
    let id = req.query.id
    if(!id){
        res.sendStatus(404)
    }else if(!/^(\d|[a-f]){32}$/.test(id)){
        res.sendStatus(400)
    }else{
        req.db.query(`select * from ${table} where id='${id}'`,(err,data)=>{
            if(err){
                res.sendStatus(500)
            }else if(data.length ==0){
                res.sendStatus(404)
            }else{
                res.send(data[0])
            }
        })
    }
})