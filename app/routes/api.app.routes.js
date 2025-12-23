
const gold   = require("../controllers/app/gold.controller");
const gold_mongo   = require("../controllers/app/gold_mongo.controller");
const news_controller   = require("../controllers/app/news.controller");
const router            = require("express").Router();

module.exports = app => {
    // router.get('/api/getDataGold', gold.getData);
    // router.get('/api/gold', gold.fetchAllGold);
    // router.get('/api/allGold', gold.allGold);
    // router.get('/api/getGoldDoj', gold.getGoldDoj);
    // router.get('/api/getGoldCrawlDoji', gold.fetchDojiPrices);
    // router.get('/api/getGoldCrawlBTMH', gold.btmhCrawl);
    // router.get('/api/getGoldCrawlSJC', gold.crawlSjc);
    // router.get('/api/getGoldCrawlPNJ', gold.crawlPNJ);
    router.get('/api/getGoldCrawlBTMC', gold.crawlBTMC);
    // router.get('/api/getGoldCrawlPhuQuy', gold.crawlPhuQuy);
    // router.get('/api/getGoldCrawlMiHong', gold.crawlMiHong);
    // router.get('/api/getGoldCrawlNgocTham', gold.crawlNgocTham);
    // router.get('/api/fillDataIntoGold', gold.fillDataIntoGold);
    // router.get('/api/crawlNews', news_controller.crawlNews);
    // //api man bang gia
    router.get('/api/crawlDataAllCompany', gold.crawlDataAllCompany);
    router.get('/api/getDataPagePrice', gold.getDataPagePrice);
    //man trang chu
    router.get('/api/getAllCompany', gold.getAllCompany);
    router.get('/api/getAllTypeGoldByCompany/:id', gold.getAllTypeGoldByCompany);
    router.get('/api/getPriceByType/:id/:name/:area', gold.getPriceByType);
    router.get('/api/getHistoryByDate/:id/:name/:area/:history_date', gold.getHistoryByDate);
    router.get('/api/getNewsHome/', news_controller.getNewsHomePage);


    //mongodb

    // router.get('/api/getGoldCrawlBTMCMongo', gold_mongo.crawlBTMC);
    // router.get('/api/getGoldCrawlBTMHMongo', gold_mongo.btmhCrawl);
    // router.get('/api/getGoldCrawlDojiMongo', gold_mongo.fetchDojiPrices);
    // router.get('/api/getGoldCrawlMiHongMongo', gold_mongo.crawlMiHong);
    // router.get('/api/getGoldCrawlNgocThamMongo', gold_mongo.crawlNgocTham);
    // router.get('/api/getGoldCrawlPhuQuyMongo', gold_mongo.crawlPhuQuy);
    // router.get('/api/getGoldCrawlPNJMongo', gold_mongo.crawlPNJ);
    // router.get('/api/getGoldCrawlSJCMongo', gold_mongo.crawlSjc);
    //
    // //api man bang gia
    // router.get('/api/crawlDataAllCompanyMongo', gold_mongo.crawlDataAllCompany);
    // router.get('/api/getDataPagePriceMongo', gold_mongo.getDataPagePrice);
    //
    // //man trang chu
    // router.get('/api/getAllCompanyMongo', gold_mongo.getAllCompany);
    // router.get('/api/getAllTypeGoldByCompanyMongo/:id', gold_mongo.getAllTypeGoldByCompany);
    // router.get('/api/getPriceByTypeMongo/:id/:name/:area', gold_mongo.getPriceByType);
    // router.get('/api/getHistoryByDateMongo/:id/:name/:area/:history_date', gold_mongo.getHistoryByDate);



    // router.get('/api/getGoldCrawlBTMCMongo', gold_mongo.crawlBTMC);
    // router.get('/api/getGoldCrawlBTMHMongo', gold_mongo.btmhCrawl);
    // router.get('/api/getGoldCrawlDojiMongo', gold_mongo.fetchDojiPrices);
    // router.get('/api/getGoldCrawlMiHongMongo', gold_mongo.crawlMiHong);
    // router.get('/api/getGoldCrawlNgocThamMongo', gold_mongo.crawlNgocTham);
    // router.get('/api/getGoldCrawlPhuQuyMongo', gold_mongo.crawlPhuQuy);
    // router.get('/api/getGoldCrawlPNJMongo', gold_mongo.crawlPNJ);
    // router.get('/api/getGoldCrawlSJCMongo', gold_mongo.crawlSjc);

    //api man bang gia
    // router.get('/api/crawlDataAllCompany', gold_mongo.crawlDataAllCompany);
    // router.get('/api/getDataPagePrice', gold_mongo.getDataPagePrice);
    // //man trang chu
    // router.get('/api/getAllCompany', gold_mongo.getAllCompany);
    // router.get('/api/getAllTypeGoldByCompany/:id', gold_mongo.getAllTypeGoldByCompany);
    // router.get('/api/getPriceByType/:id/:name/:area', gold_mongo.getPriceByType);
    // router.get('/api/getHistoryByDate/:id/:name/:area/:history_date', gold_mongo.getHistoryByDate);
    // router.get('/api/getNewsHome/', news_controller.getNewsHomePage);


    app.use('/', router);
};
