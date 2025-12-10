// app/helpers/mi_hong_mongo_gold.helper.js
// Helper Mi Hồng dùng MongoDB

const moment = require("moment");
const { getDb } = require("../../config/mongo"); // chỉnh path nếu file ở thư mục khác

const DEFAULT_COLLECTION = "log_crawl_mi_hong";
const COMPANY_MI_HONG = 7;

/**
 * Lấy collection an toàn
 */
function col(name = DEFAULT_COLLECTION) {
    const db = getDb();
    return db.collection(name);
}

/**
 * 1) Insert log thô (không tính diff)
 *    Tương đương insertLogsMiHong cũ nhưng lưu vào Mongo
 */
exports.insertLogsMiHong = async function (datas, collectionName = DEFAULT_COLLECTION) {
    try {
        if (!datas || !datas.length) return 0;

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
            // có thể không cần company_id & diff ở log thô,
            // nhưng nếu muốn đồng bộ thì thêm cũng không sao:
            company_id: COMPANY_MI_HONG,
        }));

        const result = await collection.insertMany(docs);
        console.log("[MI_HONG][insertLogsMiHong] Inserted:", result.insertedCount);
        return result.insertedCount || 0;
    } catch (e) {
        console.log("EX insertLogsMiHong (Mongo)", e);
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
        console.log("[MI_HONG] last_update Mongo:", data);
        return data;
    } catch (e) {
        console.log("Ex getLastUpdateTimeMiHong (Mongo)", e);
        return null;
    }
};

/**
 * 3) Lấy giá cuối ngày hôm qua theo map: key = `${name}__${area}`
 */
exports.getYesterdayLastPrices = async (collectionName = DEFAULT_COLLECTION) => {
    try {
        const collection = col(collectionName);

        const yesterdayStr = moment().subtract(1, "day").format("YYYY-MM-DD");

        const rows = await collection.find({}).toArray();

        const rowsYesterday = rows.filter((r) => {
            if (!r.date) return false;
            const d = moment(r.date);
            return d.isValid() && d.format("YYYY-MM-DD") === yesterdayStr;
        });

        if (!rowsYesterday.length) {
            console.log("[MI_HONG][getYesterdayLastPrices] Không có dữ liệu ngày hôm qua");
            return {};
        }

        // sort theo thời gian để giữ bản cuối cùng
        rowsYesterday.sort((a, b) => new Date(a.date) - new Date(b.date));

        const map = {};
        for (const row of rowsYesterday) {
            const key = `${row.name}__${row.area || "Toàn quốc"}`;
            map[key] = row;
        }

        return map;
    } catch (e) {
        console.log("Ex getYesterdayLastPrices MiHong (Mongo):", e);
        return {};
    }
};

/**
 * 4) Insert dữ liệu crawl & tính diff hôm qua
 */
exports.insertCrawledPricesWithDiffYesterday = async (
    items,
    collectionName = DEFAULT_COLLECTION
) => {
    if (!items || !Array.isArray(items) || items.length === 0) {
        console.log("[MI_HONG][insertCrawledPricesWithDiffYesterday] Không có item nào");
        return 0;
    }

    try {
        const collection = col(collectionName);

        // 1) Lấy map giá cuối ngày hôm qua theo name+area
        const yesterdayMap = await exports.getYesterdayLastPrices(collectionName);

        const docs = [];

        for (const item of items) {
            const name = item.name;
            const area = item.area || "Toàn quốc";
            const company_id = COMPANY_MI_HONG;

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
                diff_yesterday_buy = buy - Number(yesterday.buy || 0);
                diff_yesterday_sell = sell - Number(yesterday.sell || 0);
            }

            docs.push({
                name,
                buy_raw,
                sell_raw,
                buy,
                sell,
                date: new Date(), // NOW()
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
            `[MI_HONG][insertCrawledPricesWithDiffYesterday] Inserted: ${result.insertedCount}`
        );

        return result.insertedCount || 0;
    } catch (err) {
        console.log("Ex insertCrawledPricesWithDiffYesterday MiHong (Mongo):", err);
        return 0;
    }
};
