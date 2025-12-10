// ngoc_tham_mongo_gold.helper.js
// MongoDB version for Ngọc Thẩm

const moment = require("moment");
const { getDb } = require("../../config/mongo");

const COLLECTION = "log_crawl_ngoc_tham";
const COMPANY_NGOC_THAM = 8;

// ===========================
// 1. Lấy thời gian last_update mới nhất
// ===========================
exports.getLastUpdateTime = async function () {
    try {
        const db = await getDb();
        const row = await db
            .collection(COLLECTION)
            .find({})
            .sort({ _id: -1 })
            .limit(1)
            .toArray();

        if (!row || row.length === 0) return null;

        return row[0].last_update || null;
    } catch (e) {
        console.log("[NGOC_THAM][Mongo] getLastUpdateTime ERROR:", e);
        return null;
    }
};

// ===========================
// 2. Lấy giá cuối cùng của ngày hôm qua
// map key: `${name}__${area}`
// ===========================
exports.getYesterdayLastPrices = async function () {
    try {
        const db = await getDb();

        const yesterday = moment().subtract(1, "day").format("YYYY-MM-DD");

        const rows = await db
            .collection(COLLECTION)
            .aggregate([
                {
                    $match: {
                        date: { $regex: `^${yesterday}` }
                    }
                },
                {
                    $sort: { date: -1 }
                },
                {
                    $group: {
                        _id: { name: "$name", area: "$area" },
                        doc: { $first: "$$ROOT" }
                    }
                }
            ])
            .toArray();

        const map = {};
        rows.forEach(r => {
            const key = `${r._id.name}__${r._id.area}`;
            map[key] = r.doc;
        });

        return map;
    } catch (e) {
        console.log("[NGOC_THAM][Mongo] getYesterdayLastPrices ERROR:", e);
        return {};
    }
};

// ===========================
// 3. Insert + tính diff hôm qua
// ===========================
exports.insertCrawledPricesWithDiffYesterday = async function (items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
        console.log("[NGOC_THAM] Không có item để insert.");
        return 0;
    }

    try {
        const db = await getDb();

        const yesterdayMap = await exports.getYesterdayLastPrices();

        const docs = items.map((item) => {
            const name = item.name;
            const area = item.area || "Toàn quốc";

            const buy = Number(item.buy) || 0;
            const sell = Number(item.sell) || 0;

            const key = `${name}__${area}`;
            const yesterday = yesterdayMap[key];

            let diff_yesterday_buy = 0;
            let diff_yesterday_sell = 0;

            if (yesterday) {
                diff_yesterday_buy = buy - (Number(yesterday.buy) || 0);
                diff_yesterday_sell = sell - (Number(yesterday.sell) || 0);
            }

            return {
                name,
                area,
                company_id: COMPANY_NGOC_THAM,
                buy_raw: item.buy_raw,
                sell_raw: item.sell_raw,
                buy,
                sell,
                source: item.source,
                last_update: item.last_update,
                date: new Date(),
                diff_yesterday_buy,
                diff_yesterday_sell,
                created_at: moment().toISOString(),
            };
        });

        if (docs.length > 0) {
            await db.collection(COLLECTION).insertMany(docs);
        }

        console.log(`[NGOC_THAM][Mongo] Inserted ${docs.length} items`);
        return docs.length;

    } catch (err) {
        console.log("[NGOC_THAM][Mongo] insert ERROR:", err);
        return 0;
    }
};
