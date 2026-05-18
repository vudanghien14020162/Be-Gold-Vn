const crawlDataBTMHHelper                = require("../mongo/btmh_mongo_crawl.helper");
const crawlDataBTMCHelper                = require("../mongo/btmc_mongo_crawl.helper");
const crawlDataDOJIHelper                = require("../mongo/doji_mongo_crawl.helper");
const crawlDataMiHongHelper                = require("../mongo/mi_hong_mongo_crawl.helper");
const crawlDataNgocThamHelper                = require("../mongo/ngoc_tham_mongo_crawl.helper");
const crawlDataPhuQuyHelper                = require("../mongo/phu_quy_mongo_crawl.helper");
const crawlDataPNJHelper                = require("../mongo/pnj_mongo_crawl.helper");
const crawlDataSJCHelper                = require("../mongo/sjc_mongo_crawl.helper");



exports.crawlBTMC = async function crawlBTMC() {
    return await crawlDataBTMCHelper.fetchGiavangOrgBTMC();
}

exports.crawlBTMH = async function crawlBTMH() {
    return await crawlDataBTMHHelper.fetchGiavangOrgBTMH();
}

exports.crawlDataDojiPrices = async function crawlBTMH() {
    return await crawlDataDOJIHelper.fetchGiavangOrgDOJI();
}

exports.crawlMiHong = async function crawlMiHong() {
    return await crawlDataMiHongHelper.fetchGiavangOrgMiHong();
}

exports.crawlNgocTham = async function crawlNgocTham() {
    return await crawlDataNgocThamHelper.fetchGiavangOrgNgocTham();
}

exports.crawlPhuQuy = async function crawlPhuQuy() {
    return await crawlDataPhuQuyHelper.fetchGiavangOrgPhuQuy();
}

exports.crawlPnj = async function crawlPnj() {
    return await crawlDataPNJHelper.fetchGiavangOrgPNJ();
}

exports.crawlSjc = async function crawlSjc() {
   return await crawlDataSJCHelper.fetchGiaVangOrgSJC();
}








