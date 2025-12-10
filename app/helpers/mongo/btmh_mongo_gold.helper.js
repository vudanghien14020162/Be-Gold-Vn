// app/helpers/mongo/btmh_mongo_gold.helper.js

// Helper MongoDB cho BTMH – dùng chung connectMongo/getDb
const moment = require("moment");
const { getDb } = require("../../config/mongo"); // chỉnh path đúng với project

const DEFAULT_COLLECTION = "log_crawl_btmh";
const COMPANY_BTMH = 5;

/* ============================================================
   Lấy collection an toàn
============================================================ */
function col(name = DEFAULT_COLLECTION) {
    const db = getDb(); // PHẢI gọi getDb() (hàm), không phải getDb trực tiếp
    return db.collection(name);
}

/* ============================================================
   1) Insert log THÔ (giống insertLogsBTMH của MySQL)
============================================================ */
exports.insertLogsBTMH = async function (datas, collectionName = DEFAULT_COLLECTION) {
    try {
        if (!datas || datas.length === 0) return 0;

        const collection = col(collectionName);

        const docs = datas.map((r) => ({
            name: r.name,
            buy_raw: r.buy_raw ?? r.buy ?? "",
            sell_raw: r.sell_raw ?? r.sell ?? "",
            buy: Number(r.buy) || 0,
            sell: Number(r.sell) || 0,
            date: r.date ? new Date(r.date) : new Date(),
            source: r.source || null,
            last_update: r.last_update || null,
            area: r.area || "Toàn quốc",
            company_id: COMPANY_BTMH,
            // log thô thường không cần diff
            diff_yesterday_buy: 0,
            diff_yesterday_sell: 0,
        }));

        const result = await collection.insertMany(docs);
        console.log(`[BTMH][insertLogsBTMH] Inserted ${result.insertedCount}`);
        return result.insertedCount || 0;
    } catch (err) {
        console.log("EX insertLogsBTMH (Mongo)", err);
        return 0;
    }
};

/* ============================================================
   2) Lấy dòng last_update mới nhất
============================================================ */
exports.getLastUpdateTime = async function () {
    try {
        const collection = col();

        // Sort theo _id (tăng dần theo thời gian insert) để lấy bản ghi mới nhất
        const doc = await collection
            .find({}, { projection: { last_update: 1, _id: 1 } })
            .sort({ _id: -1 })
            .limit(1)
            .next();

        const data = doc?.last_update || null;
        console.log("[BTMH] last_update từ Mongo:", data);
        return data;
    } catch (err) {
        console.log("EX getLastUpdateTime BTMH", err);
        return null;
    }
};

/* ============================================================
   3) Lấy giá cuối cùng của ngày hôm qua theo map: key = name__area

   Chuẩn logic MySQL:
   - Lấy khoảng [hôm qua 00:00, hôm nay 00:00)
   - Group theo (name, area) và lấy bản ghi CUỐI CÙNG trong ngày
============================================================ */
exports.getYesterdayLastPrices = async function (collectionName = DEFAULT_COLLECTION) {
    try {
        const collection = col(collectionName);

        const startOfToday = moment().startOf("day").toDate(); // hôm nay 00:00
        const startOfYesterday = moment()
            .subtract(1, "day")
            .startOf("day")
            .toDate(); // hôm qua 00:00

        const cursor = collection.aggregate([
            {
                $match: {
                    date: {
                        $gte: startOfYesterday,
                        $lt: startOfToday,
                    },
                },
            },
            // sắp xếp theo date (và _id để ổn định) tăng dần
            { $sort: { date: 1, _id: 1 } },
            {
                $group: {
                    _id: {
                        name: "$name",
                        area: { $ifNull: ["$area", "Toàn quốc"] },
                    },
                    lastDoc: { $last: "$$ROOT" }, // bản ghi cuối cùng trong ngày
                },
            },
        ]);

        const map = {};

        let count = 0;
        for await (const doc of cursor) {
            const name = doc._id.name;
            const area = doc._id.area || "Toàn quốc";
            const key = `${name}__${area}`;
            map[key] = doc.lastDoc;
            count++;
        }

        if (count === 0) {
            console.log("[BTMH] Không có dữ liệu ngày hôm qua");
        } else {
            console.log("[BTMH] getYesterdayLastPrices - số cặp name__area:", count);
        }

        return map;
    } catch (err) {
        console.log("EX getYesterdayLastPrices BTMH", err);
        return {};
    }
};

/* ============================================================
   4) Insert dữ liệu & tính diff hôm qua
   - items: dữ liệu mới crawl (thường là NGÀY HÔM NAY)
   - diff = hôm nay - giá cuối ngày hôm qua (cùng name + area)
============================================================ */
exports.insertCrawledPricesWithDiffYesterday = async function (
    items,
    collectionName = DEFAULT_COLLECTION
) {
    try {
        if (!Array.isArray(items) || items.length === 0) {
            console.log("[BTMH][insertCrawledPricesWithDiffYesterday] Không có item nào");
            return 0;
        }

        const collection = col(collectionName);

        // Map: key = name__area -> document cuối của ngày hôm qua
        const yesterdayMap = await exports.getYesterdayLastPrices(collectionName);

        const docs = items.map((item) => {
            const name = item.name;
            const area = item.area || "Toàn quốc";

            const buy = Number(item.buy) || 0;
            const sell = Number(item.sell) || 0;

            const key = `${name}__${area}`;
            const yesterday = yesterdayMap[key];

            const yesterdayBuy = yesterday ? Number(yesterday.buy) || 0 : 0;
            const yesterdaySell = yesterday ? Number(yesterday.sell) || 0 : 0;

            return {
                name,
                buy_raw: item.buy_raw ?? item.buy ?? "",
                sell_raw: item.sell_raw ?? item.sell ?? "",
                buy,
                sell,
                date: item.date ? new Date(item.date) : new Date(),
                source: item.source || null,
                last_update: item.last_update || null,
                area,
                company_id: COMPANY_BTMH,
                diff_yesterday_buy: buy - yesterdayBuy,
                diff_yesterday_sell: sell - yesterdaySell,
            };
        });

        if (docs.length === 0) return 0;

        const result = await collection.insertMany(docs);

        console.log(`[BTMH] Insert diff-yesterday: ${result.insertedCount}`);
        return result.insertedCount || 0;
    } catch (err) {
        console.log("EX insertCrawledPricesWithDiffYesterday BTMH", err);
        return 0;
    }
};
