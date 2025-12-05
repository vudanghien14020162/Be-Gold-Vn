const common_helper            = require("../helpers/common.helper");
const common_response          = require("../common/response");
const common_token_validator   = require("../common/token_validator");
const location_helper          = require("../helpers/location_helper");
const app                      = require("../config/app");
const sequelize                = app.sequelize;

exports.partner = async(req, res, next) => {
    let partner_id = await req.header('partner-id')?req.header('partner-id'):0;
    let partner_name = await req.header('partner-name')?req.header('partner-name'):'';
    let partner_secret = await req.header('partner-secret')?req.header('partner-secret'):'';
    let checkPartner = await common_helper.checkPartner(partner_id, partner_name, partner_secret);
    if (checkPartner){
        return next();
    } else {
        await res.send(JSON.stringify({
            "code": 1,
            "message": "Xác thực đối tác không hợp lệ"
        }));
        return;
    }
};

exports.authenticated = async(req, res, next) => {
    let token               = typeof req.headers['authorization'] !== 'undefined' ? req.headers['authorization'] : '';
    let user_id             = await common_token_validator.getUserId(token);
    if(!user_id){
        let response_login  = await common_response.responseError(7, "Bạn cần đăng nhập để sử dụng chức năng này.", null);
        await res.send(JSON.stringify(response_login));
        return;
    }else {
        req.user_id_middleware = user_id;
        next();
    }
};

exports.checkCountry = async (req, res, next) => {
    let checkIPVN = await location_helper.checkCountryVietNam(req);
    if (!checkIPVN) {
        let msg                 = "Sorry, NETHub is not available in your region.";
        let response_ex         = await common_response.responseError(-1, msg, null);
        await res.send(JSON.stringify(response_ex));
        return;
    }else{
        next();
    }
};

exports.kickLogin = async (req, res, next) => {
    let token               = typeof req.headers['authorization'] !== 'undefined' ? req.headers['authorization'] : '';
    let user_id             = await common_token_validator.getUserId(token);
    if(!user_id){
        let response_login  = await common_response.responseError(7, "Bạn cần đăng nhập để sử dụng chức năng này.", null);
        await res.send(JSON.stringify(response_login));
        return;
    }else {
        if(user_id > 0){
            let device_id = req.headers['deviceid'] ?? "";
            if(device_id){
                // const [check_logout] = await sequelize.query(
                //     "SELECT id, user_id, deleted FROM history_login WHERE user_id = :user_id AND device_id = :device_id  LIMIT 1", {
                //         replacements: {
                //             user_id     : user_id,
                //             device_id   : device_id
                //         },
                //         type: sequelize.SELECT,
                //     }
                // );
                // if(check_logout.length <= 0 || (check_logout.length && check_logout[0].deleted === 1)){
                //     let response_login  = await common_response.responseError(7, common_response.message_token_expired, null);
                //     await res.send(JSON.stringify(response_login));
                //     return;
                // }else{
                //     req.user_id_middleware = user_id ?? 0;
                //     next();
                // }
                req.user_id_middleware = user_id;
                next();
            }else{
                req.user_id_middleware = user_id;
                next();
            }
        }
    }
};
