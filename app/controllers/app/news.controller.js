const app                       = require("../../config/app");
// const queue_crawl_data_doji       = app.queue_crawl_data_doji;
// const queue_crawl_data_btmh       = app.queue_crawl_data_btmh;
// const queue_crawl_data_sjc       = app.queue_crawl_data_sjc;
// const queue_crawl_data_pnj       = app.queue_crawl_data_pnj;
// const queue_crawl_data_btmc       = app.queue_crawl_data_btmc;
// const queue_crawl_data_phu_quy       = app.queue_crawl_data_phu_quy;
// const queue_crawl_data_mi_hong       = app.queue_crawl_data_mi_hong;
// const queue_crawl_data_ngoc_tham       = app.queue_crawl_data_ngoc_tham;
// const queue_syn_data_craw_into_gold_data       = app.queue_syn_data_craw_into_gold_data;
// const queue_syn_all_data_crawl              = app.queue_syn_all_data_crawl;

const news_helper      = require("../../helpers/news.helper");
const news_crawl_helper      = require("../../helpers/news_crawl.helper");
const common_response   = require("../../common/response");



exports.crawlNews = async function crawlNews(req, res, options = {}) {
    try {
        const items = await news_crawl_helper.crawlDataBaoMoiNewsHelper();
        if (items === 1) {
            console.log("Baomoi: không có tin mới");
            return;
        }
        // console.log()

        let response = await common_response.responseSuccess(items, "Thành công", req);
        await res.send(JSON.stringify(response));

        // console.log("Baomoi: có", items.length, "tin mới");
        // await news_crawl_helper.insertNews(items, "news"); // bạn tự viết insert giống log_crawl_xxx
        //
        // console.log("=== HOÀN THÀNH CRAWL & LƯU VÀO BẢNG news ===");
    } catch (err) {
        console.error("Lỗi tổng:", err);
    }
}
exports.getNewsHomePage = async function getNewsHomePage(req, res, options = {}) {
    try {
        // let id          = parseInt(req.params.id) ?? 0;
        let data_res = await news_helper.getNewsHomePage();
        let response = await common_response.responseSuccess(data_res, "Thành công", req);
        await res.send(JSON.stringify(response));
        return;
    } catch (e) {
        await res.send(JSON.stringify(await common_response.responseError(-1, "Gặp lỗi trong quá trình xử lý. Vui lòng thử lại sau", null, req)));
        return;
    }

}













