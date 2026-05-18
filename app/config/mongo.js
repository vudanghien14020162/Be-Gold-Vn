// app/database/mongo.js
require("dotenv").config();

const { MongoClient } = require("mongodb");

let client = null;
let db = null;
let connectingPromise = null;

const uri = process.env.DB_MONGODB_URI;
const dbName = process.env.DB_MONGODB_NAME || "gold_price_db";

/**
 * Kết nối MongoDB.
 * Đảm bảo:
 * - Chỉ connect 1 lần
 * - Nếu nhiều nơi gọi cùng lúc thì dùng chung 1 promise
 * - Nếu lỗi thì reset để lần sau retry
 */
async function connectMongo() {
    if (db) {
        return db;
    }

    if (connectingPromise) {
        return connectingPromise;
    }

    if (!uri) {
        throw new Error("❌ Missing Mongo URI: DB_MONGODB_URI");
    }

    connectingPromise = (async () => {
        try {
            console.log("⏳ Đang kết nối MongoDB...");

            client = new MongoClient(uri, {
                maxPoolSize: 20,
                minPoolSize: 2,
                connectTimeoutMS: 20000,
                serverSelectionTimeoutMS: 20000,
                socketTimeoutMS: 45000
            });

            await client.connect();

            // kiểm tra kết nối thật
            await client.db("admin").command({
                ping: 1
            });

            db = client.db(dbName);

            console.log("✅ MongoDB connected:", dbName);

            return db;
        } catch (err) {
            client = null;
            db = null;

            console.error("❌ MongoDB connect error:", err.message);

            throw err;
        } finally {
            connectingPromise = null;
        }
    })();

    return connectingPromise;
}

/**
 * Dùng khi chắc chắn app đã gọi await connectMongo()
 */
function getDb() {
    if (!db) {
        throw new Error(
            "❌ MongoDB chưa sẵn sàng. Hãy gọi await connectMongo() trước khi dùng getDb()."
        );
    }

    return db;
}

/**
 * Dùng trong helper nếu muốn tự đảm bảo có DB.
 */
async function getDbAsync() {
    if (db) {
        return db;
    }

    return await connectMongo();
}

/**
 * Lấy collection an toàn.
 */
async function getCollection(collectionName) {
    const database = await getDbAsync();
    return database.collection(collectionName);
}

/**
 * Đóng kết nối khi app shutdown.
 */
async function closeMongo() {
    if (client) {
        await client.close();
        client = null;
        db = null;
        connectingPromise = null;
        console.log("🔌 MongoDB disconnected");
    }
}

module.exports = {
    connectMongo,
    getDb,
    getDbAsync,
    getCollection,
    closeMongo
};