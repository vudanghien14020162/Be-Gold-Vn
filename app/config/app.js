// ================== COMMONJS ONLY ==================
require("dotenv").config();
const dbConfig = require("./db.config.js");
const Sequelize = require("sequelize");

// ================== MYSQL ==================
const sequelize = new Sequelize(dbConfig.MYSQL_DB, null, null, {
    dialect: dbConfig.dialect,
    port: 3306,
    username: dbConfig.MYSQL_USER,
    password: dbConfig.MYSQL_PASSWORD,
    replication: {
        read: [
            { host: dbConfig.MYSQL_READ_HOST },
        ],
        write: { host: dbConfig.MYSQL_WRITE_HOST }
    },
    pool: {
        max: dbConfig.pool.max,
        min: dbConfig.pool.min,
        acquire: dbConfig.pool.acquire,
        idle: dbConfig.pool.idle
    }
});

console.log('Connected to MySQL - Read: ' + dbConfig.MYSQL_READ_HOST);
console.log('Connected to MySQL - Write: ' + dbConfig.MYSQL_WRITE_HOST);


// ================== REDIS ==================
const redis = require("redis");
let redisClient = {};

let config_redis = {
    socket: {
        port: dbConfig.PORT_REDIS,
        host: dbConfig.HOST_REDIS,
    },
    database: dbConfig.DB_REDIS
};
if (dbConfig.PASSWORD_REDIS !== '') {
    config_redis.password = dbConfig.PASSWORD_REDIS;
}

redisClient = redis.createClient(config_redis);

redisClient.on('connect', () => {
    console.log('Connected to Redis - Host: ' + dbConfig.HOST_REDIS);
});
redisClient.on('error', (err) => console.log('Redis Client Error', err));

redisClient.connect();


// ================== MONGODB (Atlas) ==================

// //connect to mongodb
// const { connectMongo } = require("./mongo");
//
// (async () => {
//     await connectMongo();
//     console.log("Mongo OK, starting server...");
// })();


// ================== QUEUE ==================
const Queue = require("bee-queue");

let config_redis_queue = {
    prefix: 'job_crawl_gold',
    stallInterval: 5000,
    nearTermWindow: 1200000,
    delayedDebounce: 1000,
    redis: {
        host: dbConfig.HOST_REDIS,
        port: dbConfig.PORT_REDIS,
        db: dbConfig.DB_QUEUE_REDIS,
        options: {},
    },
    isWorker: true,
    getEvents: true,
    sendEvents: true,
    storeJobs: true,
    ensureScripts: true,
    activateDelayedJobs: false,
    removeOnSuccess: false,
    removeOnFailure: false,
    redisScanCount: 1,
};

if (dbConfig.PASSWORD_REDIS !== '') {
    config_redis_queue.redis.password = dbConfig.PASSWORD_REDIS;
}

const queue_crawl_data_doji = new Queue('queue_crawl_data_doji', config_redis_queue);
const queue_crawl_data_btmh = new Queue('queue_crawl_data_btmh', config_redis_queue);
const queue_crawl_data_btmc = new Queue('queue_crawl_data_btmc', config_redis_queue);
const queue_crawl_data_sjc = new Queue('queue_crawl_data_sjc', config_redis_queue);
const queue_crawl_data_pnj = new Queue('queue_crawl_data_pnj', config_redis_queue);
const queue_crawl_data_phu_quy = new Queue('queue_crawl_data_phu_quy', config_redis_queue);
const queue_crawl_data_mi_hong = new Queue('queue_crawl_data_mi_hong', config_redis_queue);
const queue_crawl_data_ngoc_tham = new Queue('queue_crawl_data_ngoc_tham', config_redis_queue);
// const queue_syn_data_craw_into_gold_data = new Queue('queue_syn_data_craw_into_gold_data', config_redis_queue);
const queue_syn_all_data_crawl = new Queue('queue_syn_all_data_crawl', config_redis_queue);
const queue_crawl_news = new Queue('queue_crawl_news', config_redis_queue);


// ================== EXPORT APP ==================
const moment = require("moment");
const jwt_encode = require("jwt-encode");

const app = {};

app.Sequelize = Sequelize;
app.QueryTypes = Sequelize.QueryTypes;
app.sequelize = sequelize;

app.redisClient = redisClient;

app.moment = moment;
app.jwt_encode = jwt_encode;

// QUEUES
app.queue_crawl_data_doji = queue_crawl_data_doji;
app.queue_crawl_data_btmh = queue_crawl_data_btmh;
app.queue_crawl_data_btmc = queue_crawl_data_btmc;
app.queue_crawl_data_sjc = queue_crawl_data_sjc;
app.queue_crawl_data_pnj = queue_crawl_data_pnj;
app.queue_crawl_data_phu_quy = queue_crawl_data_phu_quy;
app.queue_crawl_data_mi_hong = queue_crawl_data_mi_hong;
app.queue_crawl_data_ngoc_tham = queue_crawl_data_ngoc_tham;
// app.queue_syn_data_craw_into_gold_data = queue_syn_data_craw_into_gold_data;
app.queue_syn_all_data_crawl = queue_syn_all_data_crawl;
app.queue_crawl_news = queue_crawl_news;

// CACHE helpers
app.getCache = async function (key) {
    return await this.redisClient.get(key);
};

app.setCache = async function (key, data, time = 1200) {
    await this.redisClient.set(key, data);
    await this.redisClient.expire(key, time);
    return true;
};

app.removeCache = async function (key) {
    await this.redisClient.del(key);
    return true;
};

module.exports = app;
