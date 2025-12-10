// app/database/mongo.js
require("dotenv").config();
const { MongoClient } = require("mongodb");

let client = null;
let db = null;
let _connecting = null;

/**
 * Kết nối MongoDB (chỉ chạy đúng 1 lần)
 */
async function connectMongo() {
    // Nếu đã có db → trả về luôn
    if (db) return db;

    // Nếu đang kết nối → chờ kết nối xong và trả về
    if (_connecting) return _connecting;

    const uri = process.env.DB_MONGODB_URI;
    if (!uri) throw new Error("❌ Missing Mongo URI (DB_MONGODB_URI)");

    console.log("⏳ Đang kết nối MongoDB...");

    // Đánh dấu đang kết nối
    _connecting = new Promise(async (resolve, reject) => {
        try {
            client = new MongoClient(uri, {
                maxPoolSize: 20,
                connectTimeoutMS: 20000,
            });

            await client.connect();

            db = client.db(process.env.DB_MONGODB_NAME || "gold_price_db");

            console.log("✅ MongoDB connected:", process.env.DB_MONGODB_NAME);

            resolve(db);
        } catch (err) {
            console.error("❌ MongoDB connect error:", err);
            reject(err);
        } finally {
            _connecting = null; // reset để retry lần sau nếu lỗi
        }
    });

    return _connecting;
}

/**
 * Trả về DB đã connect (hoặc báo lỗi nếu chưa connect)
 */
function getDb() {
    if (!db) {
        throw new Error(
            "❌ MongoDB chưa sẵn sàng! Hãy gọi connectMongo() trước khi dùng getDb()."
        );
    }
    return db;
}

module.exports = {
    connectMongo,
    getDb,
};
