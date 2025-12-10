// helpers/brandJob.helper.js

const crawl_helper = require("../helpers/crawl_gold.helper");
const crawl_mongo_helper = require("../helpers/mongo/crawl_gold_mongo.helper");

const sjc_gold_helper = require("../helpers/sjc_gold.helper");
const sjc_mongo_gold_helper = require("../helpers/mongo/sjc_mongo_gold.helper");

const doji_gold_helper = require("../helpers/doji_gold.helper"); // chỉnh tên cho đúng
const doji_mongo_gold_helper = require("../helpers/mongo/doji_mongo_gold.helper");

const pnj_gold_helper = require("../helpers/pnj_gold.helper");
const pnj_mongo_gold_helper = require("../helpers/mongo/pnj_mongo_gold.helper");

const btmc_gold_helper = require("../helpers/btmc_gold.helper");
const btmc_mongo_gold_helper = require("../helpers/mongo/btmc_mongo_gold.helper");

const btmh_gold_helper = require("../helpers/btmh_gold.helper");
const btmh_mongo_gold_helper = require("../helpers/mongo/btmh_mongo_gold.helper");

const phu_quy_gold_helper = require("../helpers/phu_quy_gold.helper");
const phu_quy_mongo_gold_helper = require("../helpers/mongo/phu_quy_mongo_gold.helper");

const mi_hong_gold_helper = require("../helpers/mi_hong_gold.helper");
const mi_hong_mongo_gold_helper = require("../helpers/mongo/mi_hong_mongo_gold.helper");

const ngoc_tham_gold_helper = require("../helpers/ngoc_tham_gold.helper");
const ngoc_tham_mongo_gold_helper = require("../helpers/mongo/ngoc_tham_mongo_gold.helper");

const IS_MONGO =
    process.env.DB_MONGODB_ENABLE &&
    parseInt(process.env.DB_MONGODB_ENABLE, 10) === 1;

/**
 * Chạy job crawl + insert cho từng brand
 */
async function runBrandJob(brand) {
    switch (brand) {
        case "SJC":
            if (IS_MONGO) {
                const data = await crawl_mongo_helper.crawlSjc();
                await sjc_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(data);
            } else {
                const data = await crawl_helper.crawlSjc();
                await sjc_gold_helper.insertCrawledPricesWithDiffYesterday(data);
            }
            break;

        case "DOJI":
            if (IS_MONGO) {
                const data = await crawl_mongo_helper.crawlDataDojiPrices();
                await doji_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(data);
            } else {
                const data = await crawl_helper.crawlDataDojiPrices();
                await doji_gold_helper.insertCrawledPricesWithDiffYesterday(data);
            }
            break;

        case "PNJ":
            if (IS_MONGO) {
                const data = await crawl_mongo_helper.crawlPnj();
                await pnj_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(data);
            } else {
                const data = await crawl_helper.crawlPnj();
                await pnj_gold_helper.insertCrawledPricesWithDiffYesterday(data);
            }
            break;

        case "BTMC":
            if (IS_MONGO) {
                const data = await crawl_helper.crawlBTMC();
                await btmc_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(data);
            } else {
                const data = await crawl_helper.crawlBTMC();
                await btmc_gold_helper.insertCrawledPricesWithDiffYesterday(data);
            }
            break;

        case "BTMH":
            if (IS_MONGO) {
                const data = await crawl_mongo_helper.crawlBTMH();
                await btmh_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(data);
            } else {
                const data = await crawl_helper.crawlDataBTMH();
                await btmh_gold_helper.insertCrawledPricesWithDiffYesterday(data);
            }
            break;

        case "PHU_QUY":
            if (IS_MONGO) {
                const data = await crawl_mongo_helper.crawlPhuQuy();
                await phu_quy_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(
                    data
                );
            } else {
                const data = await crawl_helper.crawlPhuQuy();
                await phu_quy_gold_helper.insertCrawledPricesWithDiffYesterday(data);
            }
            break;

        case "MI_HONG":
            if (IS_MONGO) {
                const data = await crawl_mongo_helper.crawlMiHong();
                await mi_hong_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(
                    data
                );
            } else {
                const data = await crawl_helper.crawlMiHong();
                await mi_hong_gold_helper.insertCrawledPricesWithDiffYesterday(data);
            }
            break;

        case "NGOC_THAM":
            if (IS_MONGO) {
                const data = await crawl_mongo_helper.crawlNgocTham();
                await ngoc_tham_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(
                    data
                );
            } else {
                const data = await crawl_helper.crawlNgocTham();
                await ngoc_tham_gold_helper.insertCrawledPricesWithDiffYesterday(data);
            }
            break;

        default:
            throw new Error(`Unknown brand: ${brand}`);
    }

    console.log(`[brandJob] DONE brand ${brand}`);
}

module.exports = {
    runBrandJob,
};
