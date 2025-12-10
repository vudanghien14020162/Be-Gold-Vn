require('dotenv').config();
const app                           = require("./app/config/app");

if (process.env.DB_MONGODB_ENABLE && parseInt(process.env.DB_MONGODB_ENABLE) === 1) {
    const { connectMongo } = require("./app/config/mongo");
    (async () => {
        await connectMongo();
        console.log("🚀 Atlas MongoDB READY → Starting API + Queues...");
    })();
}

const moment                        = app.moment;
const sequelize                     = app.sequelize;
const QueryTypes                    = app.QueryTypes;
const queue_crawl_data_doji          = app.queue_crawl_data_doji;
const queue_crawl_data_btmh          = app.queue_crawl_data_btmh;
const queue_crawl_data_btmc          = app.queue_crawl_data_btmc;
const queue_crawl_data_sjc          = app.queue_crawl_data_sjc;
const queue_crawl_data_pnj          = app.queue_crawl_data_pnj;
const queue_crawl_data_phu_quy          = app.queue_crawl_data_phu_quy;
const queue_crawl_data_mi_hong          = app.queue_crawl_data_mi_hong;
const queue_crawl_data_ngoc_tham          = app.queue_crawl_data_ngoc_tham;
const queue_syn_all_data_crawl          = app.queue_syn_all_data_crawl;
//news
const queue_crawl_news          = app.queue_crawl_news;

const sjc_gold_helper                = require("./app/helpers/sjc_gold.helper");
const doJI_gold_helper                = require("./app/helpers/doji_gold.helper");
const pnj_gold_helper                = require("./app/helpers/pnj_gold.helper");
const btmc_gold_helper                = require("./app/helpers/btmc_gold.helper");
const btmh_gold_helper                = require("./app/helpers/btmh_gold.helper");
const phu_quy_gold_helper                = require("./app/helpers/phu_quy_gold.helper");
const mi_hong_gold_helper                = require("./app/helpers/mi_hong_gold.helper");
const ngoc_tham_gold_helper                = require("./app/helpers/ngoc_tham_gold.helper");
const crawl_helper                  = require("./app/helpers/crawl_gold.helper");
//gold_price
const gold_price_helper                = require("./app/helpers/gold_price.helper");
//news
const news_helper                = require("./app/helpers/news.helper");
const crawl_news_helper          = require("./app/helpers/news_crawl.helper");

//mongo
const crawl_mongo_helper                  = require("./app/helpers/mongo/crawl_gold_mongo.helper");
const btmc_mongo_gold_helper                = require("./app/helpers/mongo/btmc_mongo_gold.helper");
const btmh_mongo_gold_helper                = require("./app/helpers/mongo/btmh_mongo_gold.helper");
const doji_mongo_gold_helper                = require("./app/helpers/mongo/doji_mongo_gold.helper");
const mi_hong_mongo_gold_helper                = require("./app/helpers/mongo/mi_hong_mongo_gold.helper");
const ngoc_tham_mongo_gold_helper                = require("./app/helpers/mongo/ngoc_tham_mongo_gold.helper");
const phu_quy_mongo_gold_helper                = require("./app/helpers/mongo/phu_quy_mongo_gold.helper");
const pnj_mongo_gold_helper                = require("./app/helpers/mongo/pnj_mongo_gold.helper");
const sjc_mongo_gold_helper                = require("./app/helpers/mongo/sjc_mongo_gold.helper");
//gold_price
const gold_price_mongo_helper                = require("./app/helpers/mongo/gold_price_mongo.helper");
const {connectMongo} = require("./app/config/mongo");

queue_crawl_data_btmc.on('ready', function () {
    queue_crawl_data_btmc.process(async function (job, done) {
        console.log('queue_crawl_data_btmc processing job data: ', job.data);
        try{
            if (process.env.DB_MONGODB_ENABLE && parseInt(process.env.DB_MONGODB_ENABLE) === 1){
                let data_crawl_btmc = await crawl_mongo_helper.crawlBTMC();
                await btmc_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl_btmc);
            }else {
                let data_crawl_btmc = await crawl_helper.crawlBTMC();
                await btmc_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl_btmc);
            }
            let data_crawl_btmc = await crawl_helper.crawlBTMC();
            await btmc_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl_btmc);
        }catch (e) {
            console.log("Ex queue_crawl_data_btmc", e);
        }
    });
    console.log('queue_crawl_data_btmc processing jobs...');
});

queue_crawl_data_btmh.on('ready', function () {
    queue_crawl_data_btmh.process(async function (job, done) {
        console.log('queue_crawl_data_btmh processing job data: ', job.data);
        try{
            if (process.env.DB_MONGODB_ENABLE && parseInt(process.env.DB_MONGODB_ENABLE) === 1){
                let data_crawl = await crawl_mongo_helper.crawlBTMH();
                await btmh_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }else {
                let data_crawl = await crawl_helper.crawlDataBTMH();
                await btmh_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }
            let data_crawl = await crawl_helper.crawlDataBTMH();
            await btmh_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
        }catch (e) {
            console.log("Ex queue_crawl_data_btmh", e);
        }
    });
    console.log('queue_crawl_data_btmh processing jobs...');
});


queue_crawl_data_doji.on('ready', function () {
    queue_crawl_data_doji.process(async function (job, done) {
        console.log('queue_crawl_data_doji processing job data: ', job.datas);
        try{
            if (process.env.DB_MONGODB_ENABLE && parseInt(process.env.DB_MONGODB_ENABLE) === 1){
                let data_crawl = await crawl_mongo_helper.crawlDataDojiPrices();
                await doji_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }else {
                let data_crawl = await crawl_helper.crawlDataDojiPrices();
                await doJI_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }
            let data_crawl = await crawl_helper.crawlDataDojiPrices();
            await doJI_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
        }catch (e) {
            console.log("Ex queue_crawl_data_doji", e);
        }
    });
    console.log('queue_crawl_data_doji processing jobs...');
});

queue_crawl_data_mi_hong.on('ready', function () {
    queue_crawl_data_mi_hong.process(async function (job, done) {
        console.log('queue_crawl_data_mi_hong processing job data: ', job.data);
        try{
            if (process.env.DB_MONGODB_ENABLE && parseInt(process.env.DB_MONGODB_ENABLE) === 1){
                let data_crawl = await crawl_mongo_helper.crawlMiHong();
                await mi_hong_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }else {
                let data_crawl = await crawl_helper.crawlMiHong();
                await mi_hong_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }
            let data_crawl = await crawl_helper.crawlMiHong();
            await mi_hong_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
        }catch (e) {
            console.log("Ex queue_crawl_data_mi_hong", e);
        }
    });
    console.log('queue_crawl_data_mi_hong processing jobs...');
});


queue_crawl_data_ngoc_tham.on('ready', function () {
    queue_crawl_data_ngoc_tham.process(async function (job, done) {
        console.log('queue_crawl_data_ngoc_tham processing job data: ', job.data);
        try{
            if (process.env.DB_MONGODB_ENABLE && parseInt(process.env.DB_MONGODB_ENABLE) === 1){
                let data_crawl = await crawl_mongo_helper.crawlNgocTham();
                await ngoc_tham_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }else {
                let data_crawl = await crawl_helper.crawlNgocTham();
                await ngoc_tham_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }
            let data_crawl = await crawl_helper.crawlNgocTham();
            await ngoc_tham_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
        }catch (e) {
            console.log("Ex queue_crawl_data_ngoc_tham", e);
        }
    });
    console.log('queue_crawl_data_ngoc_tham processing jobs...');
});

queue_crawl_data_phu_quy.on('ready', function () {
    queue_crawl_data_phu_quy.process(async function (job, done) {
        console.log('queue_crawl_data_phu_quy processing job data: ', job.data);
        try{
            if (process.env.DB_MONGODB_ENABLE && parseInt(process.env.DB_MONGODB_ENABLE) === 1){
                let data_crawl = await crawl_mongo_helper.crawlPhuQuy();
                await phu_quy_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }else {
                let data_crawl = await crawl_helper.crawlPhuQuy();
                await phu_quy_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }
            let data_crawl = await crawl_helper.crawlPhuQuy();
            await phu_quy_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
        }catch (e) {
            console.log("Ex queue_crawl_data_phu_quy", e);
        }
    });
    console.log('queue_crawl_data_phu_quy processing jobs...');
});

queue_crawl_data_pnj.on('ready', function () {
    queue_crawl_data_pnj.process(async function (job, done) {
        console.log('queue_crawl_data_pnj processing job data: ', job.data);
        try{
            if (process.env.DB_MONGODB_ENABLE && parseInt(process.env.DB_MONGODB_ENABLE) === 1){
                let data_crawl = await crawl_mongo_helper.crawlPnj();
                await pnj_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }else {
                let data_crawl = await crawl_helper.crawlPnj();
                await pnj_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }
            let data_crawl = await crawl_helper.crawlPnj();
            await pnj_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
        }catch (e) {
            console.log("Ex queue_crawl_data_pnj", e);
        }
    });
    console.log('queue_crawl_data_pnj processing jobs...');
});


queue_crawl_data_sjc.on('ready', function () {
    queue_crawl_data_sjc.process(async function (job, done) {
        console.log('queue_crawl_data_sjc processing job data: ', job.data);
        try{
            if (process.env.DB_MONGODB_ENABLE && parseInt(process.env.DB_MONGODB_ENABLE) === 1){
                let data_crawl = await crawl_mongo_helper.crawlSjc();
                await sjc_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }else {
                let data_crawl = await crawl_helper.crawlSjc();
                await sjc_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }
            let data_crawl = await crawl_helper.crawlSjc();
            await sjc_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
        }catch (e) {
            console.log("Ex queue_crawl_data_sjc", e);
        }
    });
    console.log('queue_crawl_data_sjc processing jobs...');
});

queue_crawl_news.on('ready', function () {
    queue_crawl_news.process(async function (job, done) {
        console.log('queue_crawl_news processing job data: ', job.data);
        try{
            let data_crawl = await crawl_news_helper.crawlDataBaoMoiNewsHelper();
            await news_helper.insertNewsBaoMoi(data_crawl);
        }catch (e) {
            console.log("Ex queue_crawl_news", e);
        }
    });
    console.log('queue_crawl_news processing jobs...');
});


queue_syn_all_data_crawl.on('ready', function () {
    queue_syn_all_data_crawl.process(async function (job, done) {
        console.log('queue_syn_all_data_crawl processing job data: ', job.data);
        try{
            if (process.env.DB_MONGODB_ENABLE && parseInt(process.env.DB_MONGODB_ENABLE) === 1){
                let data_crawl = await crawl_mongo_helper.crawlSjc();
                await sjc_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }else {
                let data_crawl = await crawl_helper.crawlSjc();
                await sjc_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }

            // let data_crawl = await crawl_helper.crawlSjc();
            // await sjc_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);

            if (process.env.DB_MONGODB_ENABLE && parseInt(process.env.DB_MONGODB_ENABLE) === 1){
                let data_crawl = await crawl_mongo_helper.crawlDataDojiPrices();
                await doji_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }else {
                let data_crawl = await crawl_helper.crawlDataDojiPrices();
                await doJI_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }

            // let data_crawl_doji = await crawl_helper.crawlDataDojiPrices();
            // await doJI_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl_doji);


            if (process.env.DB_MONGODB_ENABLE && parseInt(process.env.DB_MONGODB_ENABLE) === 1){
                let data_crawl = await crawl_mongo_helper.crawlPnj();
                await pnj_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }else {
                let data_crawl = await crawl_helper.crawlPnj();
                await pnj_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }

            // let data_crawl_pnj = await crawl_helper.crawlPnj();
            // await pnj_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl_pnj);

            if (process.env.DB_MONGODB_ENABLE && parseInt(process.env.DB_MONGODB_ENABLE) === 1){
                let data_crawl_btmc = await crawl_helper.crawlBTMC();
                await btmc_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl_btmc);
            }else {
                let data_crawl_btmc = await crawl_helper.crawlBTMC();
                await btmc_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl_btmc);
            }
            // let data_crawl_btmc = await crawl_helper.crawlBTMC();
            // await btmc_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl_btmc);

            if (process.env.DB_MONGODB_ENABLE && parseInt(process.env.DB_MONGODB_ENABLE) === 1){
                let data_crawl = await crawl_mongo_helper.crawlBTMH();
                await btmh_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }else {
                let data_crawl = await crawl_helper.crawlDataBTMH();
                await btmh_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }
            // let data_crawl_btmh = await crawl_helper.crawlDataBTMH();
            // await btmh_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl_btmh);

            if (process.env.DB_MONGODB_ENABLE && parseInt(process.env.DB_MONGODB_ENABLE) === 1){
                let data_crawl = await crawl_mongo_helper.crawlPhuQuy();
                await phu_quy_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }else {
                let data_crawl = await crawl_helper.crawlPhuQuy();
                await phu_quy_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }
            // let data_crawl_phu_quy = await crawl_helper.crawlPhuQuy();
            // await phu_quy_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl_phu_quy);

            if (process.env.DB_MONGODB_ENABLE && parseInt(process.env.DB_MONGODB_ENABLE) === 1){
                let data_crawl = await crawl_mongo_helper.crawlMiHong();
                await mi_hong_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }else {
                let data_crawl = await crawl_helper.crawlMiHong();
                await mi_hong_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }

            // let data_crawl_mi_hong = await crawl_helper.crawlMiHong();
            // await mi_hong_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl_mi_hong);

            if (process.env.DB_MONGODB_ENABLE && parseInt(process.env.DB_MONGODB_ENABLE) === 1){
                let data_crawl = await crawl_mongo_helper.crawlNgocTham();
                await ngoc_tham_mongo_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }else {
                let data_crawl = await crawl_helper.crawlNgocTham();
                await ngoc_tham_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl);
            }
            // let data_crawl_ngoc_tham = await crawl_helper.crawlNgocTham();
            // await ngoc_tham_gold_helper.insertCrawledPricesWithDiffYesterday(data_crawl_ngoc_tham);

            if (process.env.DB_MONGODB_ENABLE && parseInt(process.env.DB_MONGODB_ENABLE) === 1){
                await gold_price_mongo_helper.syncAllBrandsFromLogs();
            }else {
                await gold_price_helper.syncAllBrandsFromLogs();
            }
            // await gold_price_helper.syncAllBrandsFromLogs();
            //news
            let data_news = await crawl_news_helper.crawlDataBaoMoiNewsHelper();
            await news_helper.insertNewsBaoMoi(data_news);
        }catch (e) {
            console.log("Ex queue_syn_all_data_crawl", e);
        }
    });
    console.log('queue_syn_all_data_crawl processing jobs...');
});





