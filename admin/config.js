module.exports = {
    // 端口
    port: 8080,

    // 数据库
    mysql_host: "localhost",
    mysql_port: 3306,
    mysql_user: "root",
    mysql_pass: "123456",
    mysql_db_name: "house",

    // 密钥
    cookie_key: [
        "asd123fgh456jkl789",
        "987lkj654hgf321dsa"
    ],
    session_key: [
        "asd123fgh456jkl789",
        "987lkj654hgf321dsa"
    ],

    // 超管
    root_user: "admin",
    root_pass: "e10adc3949ba59abbe56e057f20f883e", // 123456的md5

    // 后台字段
    admin_show_ad: "id:ID,title:标题,type:类型,link:地址,expires:有效期",
    admin_show_broker: "id:ID,title:姓名",
    admin_show_house: "id:ID,title:标题,ave_price:均价,tel:电话",
    admin_show_link: "id:ID,title:标题,type:类型,link:地址",

    admin_insert_ad: "id,admin_id,type,title,link,img_path,img_real_path,expires,n_order,n_show,n_click",
    admin_insert_broker: "id,admin_id,title,img_path,img_real_path",
    admin_insert_house: "id,admin_id,title,sub_title,position_main,position_second,ave_price,area_min,area_max,tel,sale_time,submit_time,building_type,main_img_path,main_img_real_path,img_paths,img_real_paths,property_types,property_img_paths,property_img_real_paths",
    admin_insert_link: "id,admin_id,type,title,link,expires,n_order",

    admin_dis_edit: "id,admin_id,create_time",
}