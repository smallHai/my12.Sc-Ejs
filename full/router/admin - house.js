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



// index--house
router.get("/",(req,res)=>{
    res.redirect("/admin/house")
})

router.get("/house",(req,res)=>{
    // 分页
    let page = req.query.page
    let pageSize = 1
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
    req.db.query(`select id,title,ave_price,tel from house where ${likeStr} limit ${pageStart},${pageSize}`,(err,data)=>{
        if(err){
            res.sendStatus(500)
        }else{
            req.db.query(`select count(*) as total from house where ${likeStr}`,(totalErr,totalData)=>{
                if(totalErr){
                    res.sendStatus(500)
                }else{
                    let pageCount = Math.ceil(totalData[0].total/pageSize)
                    if(pageCount<=0){
                        pageCount = 1
                    }
                    res.render("index",{data,pageCount:pageCount,keyword:req.query.keyword})
                }
            })
        }
    })
})

router.post("/house",(req,res)=>{
    // console.log(req.body)   // post的数据
    // console.log(req.files) // 上传的数据

    req.body["sale_time"] = libs.toTimestamp(req.body["sale_time"])
    req.body["submit_time"] = libs.toTimestamp(req.body["submit_time"])

    if(req.body["is_edit"] =="true"){ // 编辑
        let fields = ["title","sub_title","position_main","position_second","ave_price","area_min","area_max","tel","sale_time","submit_time","building_type","property_types"]
        let arr = []
        fields.forEach(item=>{
            arr.push(`${item}='${req.body[item]}'`)
        })
        let sql = `update house set ${arr.join(',')} where id='${req.body['old_id']}'`
        req.db.query(sql,err=>{
            if(err){
                res.sendStatus(500)
            }else{
                res.redirect("/admin/house")
            }
        })
    }else{ // 新增

        let aImgPath = []
        let aImgRealPath = []
        for(let i=0; i<req.files.length; i++){
            switch(req.files[i].fieldname){
                case "main_img":
                    req.body["main_img_path"] = req.files[i].filename
                    req.body["main_img_real_path"] = req.files[i].path.replace(/\\/g,'\\\\\\\\')
                break
                case "imgs":
                    aImgPath.push(req.files[i].filename)
                    aImgRealPath.push(req.files[i].path.replace(/\\/g,'\\\\\\\\'))
                break
                case "property_img":
                    req.body["property_img_paths"] = req.files[i].filename
                    req.body["property_img_real_paths"] = req.files[i].path.replace(/\\/g,'\\\\\\\\')
                break
            }
        }
        req.body["img_paths"] = aImgPath.join(",")
        req.body["img_real_paths"] = aImgRealPath.join(",")
        req.body["id"] = libs.uuid()
        req.body["admin_id"] = req.admin_id

        let arrField = []
        let arrValue = []
        for(let name in req.body){
            if(name !="is_edit" && name!="old_id"){
                arrField.push(name)
                arrValue.push(req.body[name])
            }
        }

        let sql = `insert into house (${arrField.join(",")}) values('${arrValue.join("','")}')`
        req.db.query(sql,err=>{
            if(err){
                res.sendStatus(500)
            }else{
                res.redirect("/admin/house")
            }
        })
    }
})

router.get("/house/delete",(req,res)=>{
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
            req.db.query(`select * from house where id='${id}'`,(err,data)=>{
                if(err){
                    res.sendStatus(500)
                }else if(data.length ==0){
                    res.sendStatus(404,"Not Found")
                }else{
                    let imgArr = []

                    if(data[0]["main_img_real_path"]){
                        imgArr.push(data[0]["main_img_real_path"])
                    }
                    if(data[0]["img_real_paths"]){
                        data[0]["img_real_paths"].split(",").forEach(item=>{
                            imgArr.push(item)
                        })
                    }
                    if(data[0]["property_img_real_paths"]){
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
                                        req.db.query(`delete from house where id='${id}'`,delErr=>{
                                            if(delErr){
                                                res.sendStatus(500)
                                            }else{
                                                if(idArrayCount<idArray.length){
                                                    idArrayDelete()
                                                }else{
                                                    res.redirect("/admin/house")
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
                        req.db.query(`delete from house where id='${id}'`,delErr=>{
                            if(delErr){
                                res.sendStatus(500)
                            }else{
                                if(idArrayCount <idArray.length){
                                    idArrayDelete()
                                }else{
                                    res.redirect("/admin/house")
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

router.get("/house/detail",(req,res)=>{
    let id = req.query.id
    if(!id){
        res.sendStatus(404)
    }else if(!/^(\d|[a-f]){32}$/.test(id)){
        res.sendStatus(400)
    }else{
        req.db.query(`select * from house where id='${id}'`,(err,data)=>{
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