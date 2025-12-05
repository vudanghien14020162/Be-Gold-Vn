exports.success                       = 0;
exports.error_common                  = 1;
exports.error_invalid                 = 2;
exports.error_plan_not_found          = 3;
exports.error_user_not_found          = 4;

exports.responseSuccess = async function(data = null, msg = "") {
    return {
        "code"      : 0,
        "message"   : msg && msg.length !== 0 ? msg:"Thành công",
        "data"      : data
    };
};

exports.responseError = async function(code = 1, msg = "",  data = null ) {
    return {
        "code"      : code,
        "message"   : msg && msg.length !== 0 ? msg:"Thành công",
        "data"      : data
    };
};
