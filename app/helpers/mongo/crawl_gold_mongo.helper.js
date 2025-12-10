const crawlDataBTMHHelper                = require("./btmh_mongo_crawl.helper");
const crawlDataBTMCHelper                = require("./btmc_mongo_crawl.helper");
const crawlDataDOJIHelper                = require("./doji_mongo_crawl.helper");
const crawlDataMiHongHelper                = require("./mi_hong_mongo_crawl.helper");
const crawlDataNgocThamHelper                = require("./ngoc_tham_mongo_crawl.helper");
const crawlDataPhuQuyHelper                = require("./phu_quy_mongo_crawl.helper");
const crawlDataPNJHelper                = require("./pnj_mongo_crawl.helper");
const crawlDataSJCHelper                = require("./sjc_mongo_crawl.helper");



exports.crawlBTMC = async function crawlBTMC() {
    return await crawlDataBTMCHelper.fetchGiavangOrgBTMC();
}

exports.crawlBTMH = async function crawlBTMH() {
    return await crawlDataBTMHHelper.crawlDataBTMHHelper();
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








