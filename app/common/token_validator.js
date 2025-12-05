const app               = require("../config/app");
const moment            = app.moment;

const jwt_decode        = require('jwt-decode');
const common_response   = require("./response");
const utilities         = require("./utilities");

exports.getUserId = function(token) {
    if(token){
        let access_token = this.bearerToken(token);
        if(access_token) {
            try {
                let data = jwt_decode(access_token);
                let user_id = data ? data.user_id:0;
                return typeof user_id === "undefined" ? 0 : user_id;
            }catch (error){
                return 0;
            }
        }
    }
    return 0;
};

exports.bearerToken = function(token){
    let header = token;
    let position = strpos(header, 'Bearer ');
    if(position !== false){
        header = header.substr(position);
        return strpos(header,  ',') !== false ? strstr(header, ',', true) : header;
    }else {
        return token;
    }
};

function strstr(haystack, needle, bool) {
    let pos = 0;
    haystack += '';
    pos = haystack.toLowerCase().indexOf((needle + '').toLowerCase());
    if (pos == -1) {
        return false;
    } else {
        if (bool) {
            return haystack.substr(0, pos);
        } else {
            return haystack.slice(pos);
        }
    }
}

function strpos (haystack, needle, offset) {
    let i = (haystack+'').indexOf(needle, (offset || 0));
    return i === -1 ? false : i;
}

exports.checkAccessToken = async function (token, device_id, os) {
    if(token){
        let access_token = this.bearerToken(token);
        if(access_token){
            try{
                let data = jwt_decode(access_token, common_response.secret_key);
                let timestamp = Math.floor(new Date().getTime()/1000);
                let data_return = {
                    "user_id"                 : data.user_id ? data.user_id : 0,
                    "is_expired"              : data.expire_time && data.expire_time > timestamp ? false : true,
                    "expired_time"            : data.expire_time ? moment(data.expire_time*1000).format('YYYY-MM-DD HH:mm:ss') : moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
                    "expired_time_timestamp"  : data.expire_time ? data.expire_time : 0,
                    "access_token"            : utilities.removeSpecialChar(access_token)

                };
                return data_return;
            }catch (e) {
                return false;
            }
        }else{
            console.log("Logs mongo DB use device_id, os,...");
        }
        return false;
    }
};
