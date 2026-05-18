// gold_price_helper.js
const app               = require("../config/app");
const sequelize         = app.sequelize;
const { QueryTypes } = require('sequelize');
const cached_key =  require('../common/cached_key');

exports.getAllCompany = async function(lang = "") {
    //get to redis cached
    let key_redis = cached_key.list_all_company;
    let data_cached = await app.getCache(key_redis);
    if(data_cached){
        let data = JSON.parse(data_cached);
        if(!data || Object.keys(data).length === 0){
            return null;
        }
        return data;
    }else {
        const result = await sequelize.query(
            "SELECT id, name, content, icon FROM `company`", {
                type: QueryTypes.SELECT,
            }
        );
        //set to redis cached
        let data = [];
        if (result.length > 0) {
            data = result;
        } else {
            data = null;
        }
        await app.setCache(key_redis, JSON.stringify(data));
        return data;
    }
};

