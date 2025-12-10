// app/helpers/mongo/btmc_mongo_gold.helper.js

const { getDb } = require("../../config/mongo");  // sử dụng DB chuẩn mới
const moment = require("moment");

const DEFAULT_COLLECTION = "log_crawl_btmc";
const COMPANY_BTMC = 4;

/* ============================================================
   1) Lấy collection một cách an toàn
============================================================ */
function getCollection(name = DEFAULT_COLLECTION) {
    const db = getDb(); // đảm bảo đã connectMongo() trước
    return db.collection(name);
}

/* ============================================================
   2) INSERT LOGS THÔ (Không tính diff)
============================================================ */
exports.insertLogsBTMC = async function insertLogsBTMC(datas) {
    try {
        if (!Array.isArray(datas) || datas.length === 0) return 0;

        const col = getCollection();

        const docs = datas.map((r) => ({
            name: r.name,
            buy_raw: r.buy_raw ?? r.buy ?? "",
            sell_raw: r.sell_raw ?? r.sell ?? "",
            buy: Number(r.buy) || 0,
            sell: Number(r.sell) || 0,
            // nếu crawler có truyền date thì dùng, không thì lấy now
            date: r.date ? new Date(r.date) : new Date(),
            source: r.source || null,
            last_update: r.last_update || null,
            area: r.area || "Toàn quốc",
            company_id: COMPANY_BTMC,
            // log thô thường không cần diff
            diff_yesterday_buy: 0,
            diff_yesterday_sell: 0,
        }));

        const result = await col.insertMany(docs);
        return result.insertedCount || 0;

    } catch (e) {
        console.log("❌ EX insertLogsBTMC (Mongo):", e);
        return 0;
    }
};

/* ============================================================
   3) Lấy last_update mới nhất
============================================================ */
exports.getLastUpdateTime = async () => {
    try {
        const col = getCollection();

        const doc = await col
            .find({}, { projection: { last_update: 1, _id: 0 } })
            .sort({ _id: -1 })
            .limit(1)
            .next();

        return doc?.last_update || null;

    } catch (e) {
        console.log("❌ EX getLastUpdateTime (Mongo):", e);
        return null;
    }
};

/* ============================================================
   4) Lấy giá cuối ngày hôm qua theo name + area (chuẩn MySQL)
   - Lấy khoảng: [yesterday 00:00, today 00:00)
   - Group theo (name, area) và lấy bản ghi cuối cùng
============================================================ */
exports.getYesterdayLastPrices = async (collectionName = DEFAULT_COLLECTION) => {
    try {
        const col = getCollection(collectionName);

        const startOfToday = moment().startOf("day").toDate();              // hôm nay 00:00
        const startOfYesterday = moment().subtract(1, "day").startOf("day").toDate(); // hôm qua 00:00

        // Dùng aggregation để lấy bản ghi cuối cùng của HÔM QUA cho từng (name, area)
        const cursor = col.aggregate([
            {
                $match: {
                    date: {
                        $gte: startOfYesterday,
                        $lt: startOfToday,
                    },
                },
            },
            // sắp xếp theo date, nếu trùng thì theo _id cho ổn định
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
        for await (const doc of cursor) {
            const name = doc._id.name;
            const area = doc._id.area || "Toàn quốc";
            const key = `${name}__${area}`;
            map[key] = doc.lastDoc;
        }

        return map;

    } catch (e) {
        console.log("❌ EX getYesterdayLastPrices (Mongo):", e);
        return {};
    }
};

/* ============================================================
   5) INSERT dữ liệu crawl + diff hôm qua
   - items là dữ liệu mới crawl trong NGÀY HÔM NAY
   - diff = hôm nay - giá cuối ngày hôm qua (cùng name + area)
============================================================ */
exports.insertCrawledPricesWithDiffYesterday = async (
    items,
    collectionName = DEFAULT_COLLECTION
) => {
    try {
        if (!Array.isArray(items) || items.length === 0) return 0;

        const col = getCollection(collectionName);

        // Lấy map giá cuối ngày hôm qua
        const yesterdayMap = await exports.getYesterdayLastPrices(collectionName);

        const docs = items.map((item) => {
            const name = item.name;
            const area = item.area || "Toàn quốc";

            const buy = Number(item.buy) || 0;
            const sell = Number(item.sell) || 0;

            const key = `${name}__${area}`;
            const y = yesterdayMap[key];

            const yesterdayBuy = y ? Number(y.buy) || 0 : 0;
            const yesterdaySell = y ? Number(y.sell) || 0 : 0;

            return {
                name,
                buy,
                sell,
                buy_raw: item.buy_raw ?? item.buy ?? "",
                sell_raw: item.sell_raw ?? item.sell ?? "",
                // nếu crawler truyền date thì ưu tiên, không thì lấy now
                date: item.date ? new Date(item.date) : new Date(),
                last_update: item.last_update || null,
                source: item.source || null,
                area,
                company_id: COMPANY_BTMC,
                diff_yesterday_buy: buy - yesterdayBuy,
                diff_yesterday_sell: sell - yesterdaySell,
            };
        });

        const result = await col.insertMany(docs);

        console.log(
            `[Mongo] Insert BTMC + diff: ${result.insertedCount}`
        );

        return result.insertedCount || 0;

    } catch (e) {
        console.log("❌ EX insertCrawledPricesWithDiffYesterday (Mongo):", e);
        return 0;
    }
};
