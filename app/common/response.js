exports.error_login = 403;
exports.error_max_device = 405;
exports.error_subscription = 2;
exports.error_code_no_fail = 1;
exports.complete_response = 400;
exports.complete_response_true = 200;
exports.error_check_otp = 3;
exports.error_check_no_active = 4;
exports.error_response_code = -1;
exports.error_response_no_search_user = -11;
exports.error_response_code_plan_dependent = 5;
exports.error_response_code_plan_expired = 6;
exports.error_response_code_no_login = 7;
exports.error_response_create_user = 8;
exports.error_send_otp_number_max = 9;
exports.refresh_token_expired = 401;
exports.expire_time_count_down_otp = 2;
exports.expire_time_otp = 5;
exports.ccu_max_otp = 3;
exports.ccu_max_otp_phone_date = 10;
exports.ccu_max_otp_ip_date = 20;
exports.otp_minus_system = 10;
exports.error_group_max_device_user = 15;
exports.watched_percent = 95;
exports.message_sms_otp_nethub = " la ma OTP xac thuc tai khoan NETHubTV.VN cua Quy Khach";
exports.message_sms_password_nethub = " la mat khau dang nhap NETHub cua Quy khach, vui long doi mat khau de bao mat tai khoan";
exports.message_sms_password = " la mat khau dang nhap NETHubTV.VN cua Quy khach, vui long doi mat khau de bao mat tai khoan";
exports.message_sms_password_mbf = "Tai khoan va mat khau truy cap web/app NETHub cua Quy khach la: \nTai khoan: mobile_phone \nMat khau: password \nTran trong cam on!";
exports.message_login = "Bạn cần đăng nhập để sử dụng chức năng này.";
exports.message_token_expired = "Hết phiên đăng nhập hoặc thiết bị đã bị đăng xuất bởi chủ tài khoản. Vui lòng đăng nhập lại.";
exports.message_blocked_user = "Tài khoản này bị khóa do vi phạm chính sách bản quyền NETHub";
exports.message_maintenance = "Hiện tại hệ thống NETHub đang được bảo trì. Để được hỗ trợ trong thời gian bảo trì, quý khách vui lòng liên hệ 1900 1900 (1000đ/phút).";
exports.message_update_version = "Yêu cầu bản cập nhật bản mới nhất!";
exports.key_cache               = "api_cached:";
exports.flag_payment_maintenance = 1;
exports.error_response_code_payment_maintenance = 406;
exports.flag_server_maintenance = 0;
exports.error_response_code_server_maintenance = 407;
exports.flag_smartcard_promotion = 1;
exports.flag_switch_payment_system = 1; //0: Nethub, 1:Payment mới
exports.error_country_not_support = 408;
exports.error_content_not_found = 409;
exports.error_user_dont_have_permission = 410;
exports.error_not_country_vietnam = 411;
exports.error_login_ip_day = 50;
exports.error_login_user_day = 20;
exports.error_login_ip_time = 10;
exports.error_login_user_time = 5;
exports.error_re_login = 412;

exports.cache_login_time = 900;

// strtolower()
exports.arr_os = {
    'android' :'2.1.9',
    'ios' : '2.2.1',
    'tizen' : '2.0.0',
};
exports.smartcard_connect_guideline = "<p><span style='color: #FFFFFF'>Đối với khách hàng đang sử dụng dịch vụ DTT/DTH của AVG. Hãy nhập mã thẻ đầu thu để được hưởng chính sách khuyến mại trên ứng dụng NETHub.</span> <br/> <br/><span style='color: #BDBDBD'> Để nhập mã thẻ. Quý khách vui lòng truy cập NETHub trên trình duyệt web hoặc TV, “vào [Quản lý tài khoản] --> Mã Thẻ Đầu Thu” để nhập thông tin mã thẻ.</span></p>";
//auth login qr
exports.login_qr_error_login_code = 460;
exports.login_qr_max_device = 461;
exports.flag_event = 1; //0: Off, 1: ON
exports.max_random_countdown_event = 5;
exports.websocket_domain = 'https://apicomment.nethubtv.vn';
exports.secret_key = "vidya2.^&naray2anan1^))(((^@hlEH.nethubtv.vn:";

exports.responseRequestJson = async function(data) {
    // console.log("responseRequestJson");
    return 1;
};

exports.responseSuccess = async function(data = null, msg = '') {
    return {
        "status_code"       : 200,
        "error_code"        : 1,
        "timestamp"         : Math.floor(Date.now() / 1000),
        "error_description" : msg && msg.length !== 0 ? msg:"Thành công",
        "extra_data"        : msg && msg.length !== 0 ? msg:"Thành công",
        "response_object"   : data
    };
};

exports.responseError = async function(error_code = 400, msg = '', data = null) {
    return {
        'status_code'         : 400,
        'error_code'          : error_code,
        'timestamp'           : Math.floor(Date.now() / 1000),
        'error_description'   : msg,
        'extra_data'          : msg,
        'response_object'     : data
    };
};
