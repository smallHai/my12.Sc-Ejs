const express = require("express")
const url = require("url")

let router = express.Router()
module.exports = router


router.get("/",(req, res)=>{
    let {page} = req.query
    page = parseInt(page)
    if(isNaN(page) || page<1){
        page = 1
    }
    let page_size = 5
    let page_start = (page-1)*page_size
    req.db.query(`select * from house limit ${page_start},${page_size}`,(err,data)=>{
        if(err){
            res.sendStatus(500)
        }else{
            req.db.query(`select count(*) as total from house`,(totalErr,totalData)=>{
                if(err){
                    res.sendStatus(500)
                }else{
                    res.render("list",{
                        list_data: data,
                        cur_page: page,
                        page_count: Math.ceil(totalData[0].total/page_size)
                    })
                }
            })
        }
    })
})

// 图片防盗链：req.headers['referer']和自己服务器的地址是不是一样
// 本项目中，在管理后台上传图片时，就要把不是real_path的那个字段加上static_img
router.get("/static_img/:img_path",(req,res)=>{
    let {img_path} = req.params
    let obj = url.parse(req.headers['referer'])
    if(obj.hostname !="localhost"){
        res.show404()
    }else{
        res.sendFile(`${req.cwd}\\upload\\${img_path}`)
    }
})


router.get("/detail/:id/",(req, res)=>{
    let {id} = req.params
    if(/^(\d|[a-f]){32}$/.test(id)){
        req.db.query(`select * from house where id='${id}'`,(err,data)=>{
            if(err){
                res.sendStatus(500)
            }else{
                res.render("detail",{data:data[0]})
            }
        })
    }else{
        res.show404()
    }
})