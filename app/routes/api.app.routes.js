
const gold   = require("../controllers/app/gold.controller");
const news_controller   = require("../controllers/app/news.controller");
const router            = require("express").Router();

module.exports = app => {
    // router.get('/api/getDataGold', gold.getData);
    // router.get('/api/gold', gold.fetchAllGold);
    // router.get('/api/allGold', gold.allGold);
    // router.get('/api/getGoldDoj', gold.getGoldDoj);
    router.get('/api/getGoldCrawlDoji', gold.fetchDojiPrices);
    router.get('/api/getGoldCrawlBTMH', gold.btmhCrawl);
    router.get('/api/getGoldCrawlSJC', gold.crawlSjc);
    router.get('/api/getGoldCrawlPNJ', gold.crawlPNJ);
    router.get('/api/getGoldCrawlBTMC', gold.crawlBTMC);
    router.get('/api/getGoldCrawlPhuQuy', gold.crawlPhuQuy);
    router.get('/api/getGoldCrawlMiHong', gold.crawlMiHong);
    router.get('/api/getGoldCrawlNgocTham', gold.crawlNgocTham);
    router.get('/api/fillDataIntoGold', gold.fillDataIntoGold);
    router.get('/api/crawlNews', news_controller.crawlNews);
    //api man bang gia
    router.get('/api/crawlDataAllCompany', gold.crawlDataAllCompany);
    router.get('/api/getDataPagePrice', gold.getDataPagePrice);
    //man trang chu
    router.get('/api/getAllCompany', gold.getAllCompany);
    router.get('/api/getAllTypeGoldByCompany/:id', gold.getAllTypeGoldByCompany);
    router.get('/api/getPriceByType/:id/:name/:area', gold.getPriceByType);
    router.get('/api/getHistoryByDate/:id/:name/:area/:history_date', gold.getHistoryByDate);
    router.get('/api/getNewsHome/', news_controller.getNewsHomePage);
    app.use('/', router);
};
