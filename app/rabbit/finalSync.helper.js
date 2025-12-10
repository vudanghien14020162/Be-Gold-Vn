// helpers/finalSync.helper.js

const gold_price_helper = require("../helpers/gold_price.helper");
const gold_price_mongo_helper = require("../helpers/mongo/gold_price_mongo.helper");
const crawl_news_helper = require("../helpers/news_crawl.helper");
const news_helper = require("../helpers/news.helper");

const IS_MONGO =
    process.env.DB_MONGODB_ENABLE &&
    parseInt(process.env.DB_MONGODB_ENABLE, 10) === 1;

async function runFinalSync(batchId) {
    console.log("[finalSync] Start final sync, batch:", batchId);

    // 1) syncAllBrandsFromLogs
    if (IS_MONGO) {
        await gold_price_mongo_helper.syncAllBrandsFromLogs();
    } else {
        await gold_price_helper.syncAllBrandsFromLogs();
    }

    console.log("[finalSync] syncAllBrandsFromLogs DONE");

    // 2) crawl news
    // const data_news = await crawl_news_helper.crawlDataBaoMoiNewsHelper();
    // await news_helper.insertNewsBaoMoi(data_news);

    console.log("[finalSync] News DONE");
}

module.exports = {
    runFinalSync,
};
