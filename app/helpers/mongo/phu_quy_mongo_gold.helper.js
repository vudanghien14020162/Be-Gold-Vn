// phu_quy_mongo_gold.helper.js
// Helper Phú Quý dùng MongoDB

const moment = require("moment");
const { getDb } = require("../../config/mongo"); // chỉnh path cho đúng cấu trúc project

const COLLECTION = "log_crawl_phu_quy";
const COMPANY_PHU_QUY = 6;

/**
 * Lấy collection an toàn
 */
function col() {
    const db = getDb();
    return db.collection(COLLECTION);
}

/**
 * 1) Insert log THÔ (không tính diff)
 *    (tương đương insertLogsPhuQuy cũ nhưng lưu Mongo)
 */
exports.insertLogsPhuQuy = async function insertLogsPhuQuy(datas) {
    try {
        if (!datas || !datas.length) return 0;

        const collection = col();

        const docs = datas.map((r) => ({
            name: r.name,
            buy_raw: r.buy_raw ?? r.buy ?? "",
            sell_raw: r.sell_raw ?? r.sell ?? "",
            buy: Number(r.buy) || 0,
            sell: Number(r.sell) || 0,
            date: r.date || moment().utcOffset(7).format("YYYY-MM-DD HH:mm:ss"),
            source: r.source || null,
            last_update: r.last_update || null,
            area: r.area || "Toàn quốc",
            company_id: COMPANY_PHU_QUY,
        }));

        const result = await collection.insertMany(docs);
        console.log("[PHU_QUY][insertLogsPhuQuy] Inserted:", result.insertedCount);
        return result.insertedCount || 0;
    } catch (e) {
        console.log("EX insertLogsPhuQuy (Mongo)", e);
        return 0;
    }
};

/**
 * 2) Lấy last_update mới nhất
 */
exports.getLastUpdateTime = async () => {
    try {
        const collection = col();

        const doc = await collection
            .find({}, { projection: { last_update: 1 } })
            .sort({ _id: -1 })
            .limit(1)
            .next();

        const data = doc?.last_update || null;
        console.log("[PHU_QUY] last_update Mongo:", data);
        return data;
    } catch (e) {
        console.log("Ex getLastUpdateTimePhuQuy (Mongo)", e);
        return null;
    }
};

/**
 * 3) Lấy giá cuối ngày hôm qua theo map: key = `${name}__${area}`
 */
exports.getYesterdayLastPrices = async () => {
    try {
        const collection = col();

        const yesterdayStr = moment().subtract(1, "day").format("YYYY-MM-DD");

        // date đang lưu string "YYYY-MM-DD HH:mm:ss" → match bằng regex
        const rows = await collection
            .aggregate([
                {
                    $match: {
                        date: { $regex: `^${yesterdayStr}` },
                    },
                },
                { $sort: { date: -1 } }, // mới nhất trong ngày trước
                {
                    $group: {
                        _id: { name: "$name", area: "$area" },
                        doc: { $first: "$$ROOT" },
                    },
                },
            ])
            .toArray();

        if (!rows || rows.length === 0) {
            console.log("[PHU_QUY][getYesterdayLastPrices] Không có dữ liệu ngày hôm qua");
            return {};
        }

        const map = {};
        for (const r of rows) {
            const key = `${r._id.name}__${r._id.area || "Toàn quốc"}`;
            map[key] = r.doc;
        }

        return map;
    } catch (e) {
        console.log("Ex getYesterdayLastPrices PHU_QUY (Mongo):", e);
        return {};
    }
};

/**
 * 4) Insert dữ liệu crawl & tính diff so với hôm qua
 *    (giữ nguyên logic /100 như bản MySQL)
 */
exports.insertCrawledPricesWithDiffYesterday = async (items) => {
    if (!items || !Array.isArray(items) || items.length === 0) {
        console.log("[PHU_QUY][insertCrawledPricesWithDiffYesterday] Không có item nào");
        return 0;
    }

    try {
        const collection = col();

        // 1) Lấy map giá cuối ngày hôm qua theo name+area
        const yesterdayMap = await exports.getYesterdayLastPrices();

        const docs = [];

        for (const item of items) {
            const name = item.name;
            const area = item.area || "Toàn quốc";
            const company_id = COMPANY_PHU_QUY;

            const buy = Number(item.buy) || 0;
            const sell = Number(item.sell) || 0;

            const buy_raw = item.buy_raw ?? item.buy ?? "";
            const sell_raw = item.sell_raw ?? item.sell ?? "";

            const last_update = item.last_update || null;
            const source = item.source || null;

            const key = `${name}__${area}`;
            const yesterday = yesterdayMap[key];

            let diff_yesterday_buy = 0;
            let diff_yesterday_sell = 0;

            if (yesterday) {
                // GIỮ NGUYÊN LOGIC /100 NHƯ MYSQL
                diff_yesterday_buy =
                    (buy - Number(yesterday.buy || 0)) / 100;
                diff_yesterday_sell =
                    (sell - Number(yesterday.sell || 0)) / 100;
            }

            docs.push({
                name,
                buy_raw,
                sell_raw,
                buy,
                sell,
                date: new Date(moment().format("YYYY-MM-DDTHH:mm:ss")),
                source,
                last_update,
                area,
                company_id,
                diff_yesterday_buy,
                diff_yesterday_sell,
            });
        }

        if (!docs.length) return 0;

        const result = await collection.insertMany(docs);

        console.log(
            `[PHU_QUY][insertCrawledPricesWithDiffYesterday] Inserted: ${result.insertedCount}`
        );

        return result.insertedCount || 0;
    } catch (err) {
        console.log("Ex insertCrawledPricesWithDiffYesterday PHU_QUY (Mongo):", err);
        return 0;
    }
};
