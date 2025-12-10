const app                       = require("../../config/app");
const queue_crawl_data_doji       = app.queue_crawl_data_doji;
const queue_crawl_data_btmh       = app.queue_crawl_data_btmh;
const queue_crawl_data_sjc       = app.queue_crawl_data_sjc;
const queue_crawl_data_pnj       = app.queue_crawl_data_pnj;
const queue_crawl_data_btmc       = app.queue_crawl_data_btmc;
const queue_crawl_data_phu_quy       = app.queue_crawl_data_phu_quy;
const queue_crawl_data_mi_hong       = app.queue_crawl_data_mi_hong;
const queue_crawl_data_ngoc_tham       = app.queue_crawl_data_ngoc_tham;
const queue_syn_all_data_crawl              = app.queue_syn_all_data_crawl;

const crawl_gold        = require("../../helpers/mongo/crawl_gold_mongo.helper");
const common_response   = require("../../common/response");
const {sendMessage}     = require("../../common/telegram");

const company_helper = require("../../helpers/mongo/company_mongo.helper");
const gold_price_helper      = require("../../helpers/mongo/gold_price_mongo.helper");

exports.crawlBTMC = async function crawlBTMC(req, res, options = {}) {
    try {
        const data = await crawl_gold.crawlBTMC();
        console.log("data", data);
        res.json({
            success: true,
            data,
        });
        await queue_crawl_data_btmc.createJob({}).save();
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Không lấy được dữ liệu giá vàng DOJI',
        });
    }

}

exports.btmhCrawl = async function btmhCrawl(req, res, options = {}) {
    try {
        const data = await crawl_gold.crawlBTMH();
        res.json({
            success: true,
            data,
        });

        await queue_crawl_data_btmh.createJob({}).save();

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Không lấy được dữ liệu giá vàng DOJI',
        });
    }

}
exports.fetchDojiPrices = async function fetchDojiPrices(req, res, options = {}) {
    try {
        const data = await crawl_gold.crawlDataDojiPrices();
        console.log("data", data);
        res.json({
            success: true,
            data,
        });
        //queue
        await queue_crawl_data_doji.createJob({}).save();
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Không lấy được dữ liệu giá vàng DOJI',
        });
    }

}

exports.crawlMiHong = async function crawlMiHong(req, res, options = {}) {
    try {
        const data = await crawl_gold.crawlMiHong();
        console.log("data", data);
        res.json({
            success: true,
            data,
        });
        await queue_crawl_data_mi_hong.createJob({}).save();

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Không lấy được dữ liệu giá vàng DOJI',
        });
    }

}

exports.crawlNgocTham = async function crawlNgocTham(req, res, options = {}) {
    try {
        const data = await crawl_gold.crawlNgocTham();
        console.log("data", data);
        res.json({
            success: true,
            data,
        });
        await queue_crawl_data_ngoc_tham.createJob({}).save();

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Không lấy được dữ liệu giá vàng DOJI',
        });
    }

}

exports.crawlPhuQuy = async function crawlPhuQuy(req, res, options = {}) {
    try {
        const data = await crawl_gold.crawlPhuQuy();
        console.log("data", data);
        res.json({
            success: true,
            data,
        });
        await queue_crawl_data_phu_quy.createJob({}).save();

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Không lấy được dữ liệu giá vàng DOJI',
        });
    }

}

exports.crawlPNJ = async function crawlPNJ(req, res, options = {}) {
    try {
        const data = await crawl_gold.crawlPnj();
        console.log("data", data);
        res.json({
            success: true,
            data,
        });
        await queue_crawl_data_pnj.createJob({}).save();

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Không lấy được dữ liệu giá vàng DOJI',
        });
    }

}

exports.crawlSjc = async function crawlSjc(req, res, options = {}) {
    try {
        const data = await crawl_gold.crawlSjc();
        console.log("data", data);
        res.json({
            success: true,
            data,
        });
        await queue_crawl_data_sjc.createJob({}).save();

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Không lấy được dữ liệu giá vàng DOJI',
        });
    }

}

exports.crawlDataAllCompany = async function crawlDataAllCompany(req, res, options = {}) {
    try {
        const data_res = await gold_price_helper.getDateSyncTime();
        let response = await common_response.responseSuccess(data_res, "Thành công", req);
        await res.send(JSON.stringify(response));
        await queue_syn_all_data_crawl.createJob({}).save();
        return;
    } catch (err) {
        await res.send(JSON.stringify(await common_response.responseError(-1, "Gặp lỗi trong quá trình xử lý. Vui lòng thử lại sau", null, req)));
        return;
    }

}


exports.getAllCompany = async function getAllCompany(req, res, options = {}) {
    try {
        let data_res = await company_helper.getAllCompany();
        let response = await common_response.responseSuccess(data_res, "Thành công", req);
        await res.send(JSON.stringify(response));
        return;
    } catch (e) {
        await res.send(JSON.stringify(await common_response.responseError(-1, "Gặp lỗi trong quá trình xử lý. Vui lòng thử lại sau", null, req)));
        return;
    }

}


exports.getDataPagePrice = async function getDataPagePrice(req, res, options = {}) {
    try {
        let data_res = await gold_price_helper.getDataPagePrice();
        let response = await common_response.responseSuccess(data_res, "Thành công", req);
        await res.send(JSON.stringify(response));
        return;
    } catch (e) {
        await sendMessage(e, 'Ex wishList', req);
        await res.send(JSON.stringify(await common_response.responseError(-1, "Gặp lỗi trong quá trình xử lý. Vui lòng thử lại sau", null, req)));
        return;
    }

}

exports.getAllTypeGoldByCompany = async function getAllTypeGoldByCompany(req, res, options = {}) {
    try {
        let id          = parseInt(req.params.id) ?? 0;
        let data_res = await gold_price_helper.getAllTypeGoldByCompany(id);
        let response = await common_response.responseSuccess(data_res, "Thành công", req);
        await res.send(JSON.stringify(response));
        return;
    } catch (e) {
        await res.send(JSON.stringify(await common_response.responseError(-1, "Gặp lỗi trong quá trình xử lý. Vui lòng thử lại sau", null, req)));
        return;
    }

}

exports.getPriceByType = async function getPriceByType(req, res, options = {}) {
    try {
        let id          = parseInt(req.params.id) ?? 0;
        let name  =  req.params.name ?? '';
        let area  =  req.params.area ?? '';
        let data_res = await gold_price_helper.getPriceByType(id, name, area);
        let response = await common_response.responseSuccess(data_res, "Thành công", req);
        await res.send(JSON.stringify(response));
        return;
    } catch (e) {
        await res.send(JSON.stringify(await common_response.responseError(-1, "Gặp lỗi trong quá trình xử lý. Vui lòng thử lại sau", null, req)));
        return;
    }

}

exports.getHistoryByDate = async function getHistoryByDate(req, res, options = {}) {
    try {
        let id          = parseInt(req.params.id) ?? 0;
        let name  =  req.params.name ?? '';
        let area  =  req.params.area ?? '';
        let history_date  =  req.params.history_date ?? '';

        let data_res = await gold_price_helper.getHistoryByDate(id, name, area, history_date);
        let response = await common_response.responseSuccess(data_res, "Thành công", req);
        await res.send(JSON.stringify(response));
        return;
    } catch (e) {
        await res.send(JSON.stringify(await common_response.responseError(-1, "Gặp lỗi trong quá trình xử lý. Vui lòng thử lại sau", null, req)));
        return;
    }

}












