const dbConfig = require("./db.config.js");
const Sequelize = require("sequelize");

const sequelize = new Sequelize(dbConfig.MYSQL_DB, null, null, {
    dialect: dbConfig.dialect,
    port: 3306,
    username: dbConfig.MYSQL_USER,
    password: dbConfig.MYSQL_PASSWORD,
    replication: {
        read: [
            { host: dbConfig.MYSQL_READ_HOST},
        ],
        write: { host: dbConfig.MYSQL_WRITE_HOST}
    },
    pool: {
        max: dbConfig.pool.max,
        min: dbConfig.pool.min,
        acquire: dbConfig.pool.acquire,
        idle: dbConfig.pool.idle
    }
});

//Create Redis client on Redis port
// console.log("process.env.NODE_ENV: ", process.env.NODE_ENV);
console.log('Connected to MySQL - Host READ: ' + dbConfig.MYSQL_READ_HOST + ' - Port: 3306');
console.log('Connected to MySQL - Host WRITE: ' + dbConfig.MYSQL_WRITE_HOST + ' - Port: 3306');
let redisClient = {};
const redis = require("redis");
let config_redis = {
    socket: {
        port: dbConfig.PORT_REDIS,
        host: dbConfig.HOST_REDIS,
    },
    database: dbConfig.DB_REDIS
};
if(dbConfig.PASSWORD_REDIS !== ''){
    config_redis.password = dbConfig.PASSWORD_REDIS;
}
redisClient  = redis.createClient(config_redis);
redisClient.on('connect', () => {
        console.log('Connected to Redis - Host: ' + dbConfig.HOST_REDIS + ' - Port: ' +  dbConfig.PORT_REDIS);
    }
);
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();

//connect to mongodb
// let mongodbClient = null;
// if(process.env.DB_MONGODB_ENABLE && parseInt(process.env.DB_MONGODB_ENABLE) === 1){
//     const { MongoClient } = require('mongodb');
//     let url_mongodb = 'mongodb://'+dbConfig.HOST_MONGODB+':' + dbConfig.PORT_MONGODB;
//     if(process.env.AUTHEN_MONGODB && parseInt(dbConfig.AUTHEN_MONGODB) === 1){
//         url_mongodb = 'mongodb://'+dbConfig.USERNAME_MONGODB+':'+dbConfig.PASSWORD_MONGODB+'@'+dbConfig.HOST_MONGODB+':'+dbConfig.PORT_MONGODB;
//     }
//     const mogo_client = new MongoClient(url_mongodb);
//     mogo_client.connect();
//     mongodbClient = mogo_client.db(dbConfig.NAME_MONGODB);
// }

const moment        = require('moment');
const jwt_encode    = require('jwt-encode');

const Queue = require('bee-queue');
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
if(dbConfig.PASSWORD_REDIS !== ''){
    config_redis_queue.redis.password = dbConfig.PASSWORD_REDIS;
}
const queue_crawl_data_doji          = new Queue('queue_crawl_data_doji', config_redis_queue);
const queue_crawl_data_btmh          = new Queue('queue_crawl_data_btmh', config_redis_queue);
const queue_crawl_data_btmc          = new Queue('queue_crawl_data_btmc', config_redis_queue);
const queue_crawl_data_sjc          = new Queue('queue_crawl_data_sjc', config_redis_queue);
const queue_crawl_data_pnj          = new Queue('queue_crawl_data_pnj', config_redis_queue);
const queue_crawl_data_phu_quy      = new Queue('queue_crawl_data_phu_quy', config_redis_queue);
const queue_crawl_data_mi_hong      = new Queue('queue_crawl_data_mi_hong', config_redis_queue);
const queue_crawl_data_ngoc_tham      = new Queue('queue_crawl_data_ngoc_tham', config_redis_queue);
const queue_syn_data_craw_into_gold_data      = new Queue('queue_syn_data_craw_into_gold_data', config_redis_queue);
const queue_syn_all_data_crawl      = new Queue('queue_syn_all_data_crawl', config_redis_queue);
//news
const queue_crawl_news      = new Queue('queue_crawl_news', config_redis_queue);

const app                           = {};
app.Sequelize                       = Sequelize;
app.QueryTypes                      = Sequelize.QueryTypes;
app.sequelize                       = sequelize;
app.redisClient                     = redisClient;
app.moment                          = moment;
app.jwt_encode                      = jwt_encode;
app.queue_crawl_data_doji                       = queue_crawl_data_doji;
app.queue_crawl_data_btmh                       = queue_crawl_data_btmh;
app.queue_crawl_data_btmc                       = queue_crawl_data_btmc;
app.queue_crawl_data_sjc                        = queue_crawl_data_sjc;
app.queue_crawl_data_pnj                        = queue_crawl_data_pnj;
app.queue_crawl_data_phu_quy                    = queue_crawl_data_phu_quy;
app.queue_crawl_data_mi_hong                    = queue_crawl_data_mi_hong;
app.queue_crawl_data_ngoc_tham                  = queue_crawl_data_ngoc_tham;
app.queue_syn_data_craw_into_gold_data          = queue_syn_data_craw_into_gold_data;
app.queue_syn_all_data_crawl                    = queue_syn_all_data_crawl;

//news
app.queue_crawl_news                            = queue_crawl_news;

app.getCache = async function(key) {
    //get to redis cached
    return await this.redisClient.get(key, function(err, reply) {
        // console.log(reply);
    });
};
app.setCache = async function(key, data, time = 1200) {
    //set to redis cached
    await this.redisClient.set(key, data, function (err, reply) {
        console.log(reply); // OK
    });
    await this.redisClient.expire(key, time);
    return true;
};

app.removeCache = async function(key){
    await this.redisClient.del(key, function (err, reply) {
        console.log(reply); // OK
    });
    return true;
};
module.exports      = app;
