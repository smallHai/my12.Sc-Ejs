const crypto = require("crypto")
const { v4: uuidv4 } = require('uuid') //将v4属性重命名为uuidv4


module.exports = {
    md5(str){
        let obj = crypto.createHash("md5")
        obj.update(str)
        return obj.digest("hex")
    },
    uuid(){
        return uuidv4().replace(/\-/g,"")
    },
    toTimestamp(timeStr){
        if(timeStr){
            return Math.floor(new Date(timeStr).getTime() / 1000)// /1000表示时间戳到秒，不到毫秒
        }else{
            return Math.floor(new Date().getTime() / 1000)
        }
    }
}