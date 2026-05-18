const crawlDataBTMHHelper                = require("./btmh_crawl.helper");
const crawlDataDOJIHelper                = require("./doji_crawl.helper");
const crawlDataSJCHelper                = require("./sjc_crawl.helper");
const crawlDataPNJHelper                = require("./pnj_crawl.helper");
const crawlDataBTMCHelper                = require("./btmc_crawl.helper");
const crawlDataPhuQuyHelper                = require("./phu_quy_crawl.helper");
const crawlDataMiHongHelper                = require("./mi_hong_crawl.helper");
const crawlDataNgocThamHelper                = require("./ngoc_tham_crawl.helper");

exports.crawlDataDojiPrices = async function crawlDataDojiPrices() {
    return await crawlDataDOJIHelper.fetchGiavangOrgDOJI();
}
exports.crawlDataBTMH = async function crawlBTMH() {
    return await crawlDataBTMHHelper.crawlDataBTMHHelper();
}

exports.crawlSjc = async function crawlSjc() {
   return await crawlDataSJCHelper.fetchGiaVangOrgSJC();
}

exports.crawlPnj = async function crawlPnj() {
    return await crawlDataPNJHelper.fetchGiavangOrgPNJ();
}

exports.crawlBTMC = async function crawlBTMC() {
    return await crawlDataBTMCHelper.fetchGiavangOrgBTMC();
}

// exports.crawlPhuQuy = async function crawlPhuQuy() {
//     return await crawlDataPhuQuyHelper.fetchPhuQuyGroup();
// }

exports.crawlPhuQuy = async function crawlPhuQuy() {
    return await crawlDataPhuQuyHelper.fetchGiavangOrgPhuQuy();
}
exports.crawlMiHong = async function crawlMiHong() {
    return await crawlDataMiHongHelper.fetchGiavangOrgMiHong();
}

exports.crawlNgocTham = async function crawlNgocTham() {
    return await crawlDataNgocThamHelper.fetchGiavangOrgNgocTham();
}





