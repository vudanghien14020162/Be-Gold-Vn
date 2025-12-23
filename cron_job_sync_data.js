require('dotenv').config();
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
process.env.TZ = "Asia/Ho_Chi_Minh";
const PORT = 8890;
app.listen(PORT, () => {
  console.log(`Start Cron Job - POST: ${PORT}`);
});
const axios = require("axios");
const cron                  = require('cron');
var xml2json = require('xml2js');
const moment = require("moment/moment");
const {createSyncBatchRabbit} = require("./app/rabbit/syncBatchPool.rabbit.helper");
var parser = new xml2json.Parser();
// const {sendMessage}         = require("app/common/telegram");
const job_price   = new cron.CronJob({
  cronTime: "0 0 */1 * * *",
  // cronTime:'*/10 * * * * *',// Set time out run cron job 10s
  // cronTime:'20 */8 * * *',// Set time out run cron job 30 minutes
  onTick: async function() {
    console.log('Cron job get price is running...');
    const { createSyncBatchRabbit } = require("./app/rabbit/syncBatchPool.rabbit.helper");
    await createSyncBatchRabbit();
  },
  start: true,
  timeZone: 'Asia/Ho_Chi_Minh' // Set time local
});

job_price.start();
