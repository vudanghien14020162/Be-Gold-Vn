const app                       = require("../../config/app");
const post_thread_helper      = require("../../helpers/thread/post_threads_video.helper");
const common_response   = require("../../common/response");

exports.postThreadAccount = async function postThreadAccount(req, res, options = {}) {
    try {
        let data_res = await post_thread_helper.postThreadAccount();
        let response = await common_response.responseSuccess(data_res, "Thành công", req);
        await res.send(JSON.stringify(response));
        return;
    } catch (e) {
        await res.send(JSON.stringify(await common_response.responseError(-1, "Gặp lỗi trong quá trình xử lý. Vui lòng thử lại sau", null, req)));
        return;
    }

}













