module.exports = {
    MYSQL_USER:                     process.env.DB_READ_MYSQL_USER,
    MYSQL_PASSWORD:                     process.env.DB_READ_MYSQL_PASSWORD,
    MYSQL_READ_HOST:                process.env.DB_READ_MYSQL_HOST,
    MYSQL_READ_USER:                process.env.DB_READ_MYSQL_USER,
    MYSQL_READ_PASSWORD:            process.env.DB_READ_MYSQL_PASSWORD,

    MYSQL_WRITE_HOST:               process.env.DB_WRITE_MYSQL_HOST,
    MYSQL_WRITE_USER:               process.env.DB_WRITE_MYSQL_USER,
    MYSQL_WRITE_PASSWORD:           process.env.DB_WRITE_MYSQL_PASSWORD,

    MYSQL_DB:                       process.env.DB_READ_MYSQL_DB,
    dialect:    "mysql",
    pool: {
        max:      5,
        min:      1,
        acquire:  10000,
        idle:     10000
    },

    HOST_REDIS: process.env.DB_REDIS_HOST,
    PORT_REDIS: process.env.DB_REDIS_PORT,
    PASSWORD_REDIS: process.env.DB_REDIS_PASSWORD,
    DB_REDIS: process.env.DB_REDIS_DB,
    DB_QUEUE_REDIS: process.env.DB_QUEUE_REDIS_DB,

    ENABLE_MONGODB: process.env.DB_MONGODB_ENABLE,
    DB_MONGODB_URI: process.env.DB_MONGODB_URI,
    DB_MONGODB_NAME: process.env.DB_MONGODB_NAME,
};
