// gold_price_helper.js - MongoDB version (chuyển từ MySQL sang Mongo)

const moment = require("moment");
const { getDb } = require("../../config/mongo");

// ================== CONSTANTS ==================

// COMPANY IDs
const COMPANY_SJC       = 1;
const COMPANY_DOJI      = 2;
const COMPANY_PNJ       = 3;
const COMPANY_BTMC      = 4;
const COMPANY_BTMH      = 5;
const COMPANY_PHU_QUY   = 6;
const COMPANY_MI_HONG   = 7;
const COMPANY_NGOC_THAM = 8;

// Map brand → collection Mongo + company_id
// Mỗi collection log_crawl_* tương ứng 1 company (giống bảng log_crawl_* MySQL)
const BRAND_CONFIG = {
    SJC:       { collection: "log_crawl_sjc",       companyId: COMPANY_SJC },
    DOJI:      { collection: "log_crawl_doji",      companyId: COMPANY_DOJI },
    PNJ:       { collection: "log_crawl_pnj",       companyId: COMPANY_PNJ },
    BTMC:      { collection: "log_crawl_btmc",      companyId: COMPANY_BTMC },
    BTMH:      { collection: "log_crawl_btmh",      companyId: COMPANY_BTMH },
    PHU_QUY:   { collection: "log_crawl_phu_quy",   companyId: COMPANY_PHU_QUY },
    MI_HONG:   { collection: "log_crawl_mi_hong",   companyId: COMPANY_MI_HONG },
    NGOC_THAM: { collection: "log_crawl_ngoc_tham", companyId: COMPANY_NGOC_THAM },
};

// range cho history (dùng moment)
const RANGE_CONFIG = {
    "7d": { amount: 7,  unit: "days"   },
    "1m": { amount: 1,  unit: "months" },
    "3m": { amount: 3,  unit: "months" },
};

// Hệ số chuyển đổi theo company (nếu cần nhân thêm)
const COMPANY_MULTIPLIER = {
    1: 1000, // SJC
    2: 1000, // DOJI
    3: 1000, // PNJ
    4: 1000, // BTMC
    5: 1,    // BTMH
    6: 1,    // Phú Quý
    7: 1,    // Mi Hồng
    8: 1,    // Ngọc Thẩm
};

// ================== HELPERS ==================

function getBrandByCompanyId(companyId) {
    return (
        Object.values(BRAND_CONFIG).find((b) => b.companyId === companyId) ||
        null
    );
}

function normalizeMoney(value) {
    if (value === null || value === undefined) return null;

    let s = String(value).trim();
    if (!s) return null;

    // bỏ hết ký tự không phải số (., khoảng trắng, ký tự lạ…)
    s = s.replace(/[^\d]/g, "");
    if (!s) return null;

    const num = parseInt(s, 10);
    if (isNaN(num)) return null;

    // 68300000 -> "68.300.000"
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function toDongFromAny(value, companyId) {
    if (value === null || value === undefined) return 0;

    // Ép thành chuỗi, bỏ hết ký tự không phải số
    let digits = String(value).trim().replace(/[^\d\-]/g, "");
    if (!digits) return 0;

    let num = parseInt(digits, 10);
    if (isNaN(num)) return 0;

    const factor = COMPANY_MULTIPLIER[companyId] || 1;
    return num * factor;
}

function formatVnd(num) {
    if (!num || isNaN(num)) return "0";
    return Number(num)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function normalizePriceForApi(rawValue, companyId) {
    const dong = toDongFromAny(rawValue, companyId);
    return formatVnd(dong);
}

// Parse last_update string giống STR_TO_DATE MySQL
// Hỗ trợ 2 format:
//  - "HH:mm:ss DD/MM/YYYY"
//  - "HH:mm DD/MM/YYYY"
function parseLastUpdateToDate(str) {
    if (!str) return null;

    let m = moment(str, "HH:mm:ss DD/MM/YYYY", true);
    if (!m.isValid()) {
        m = moment(str, "HH:mm DD/MM/YYYY", true);
    }
    if (!m.isValid()) return null;
    return m.toDate();
}

// ================== SYNC TỪ LOG VÀO GOLD_PRICE (KHÔNG DÙNG NỮA) ==================
// Bản Mongo dùng trực tiếp log_crawl_* → giữ stub cho đỡ lỗi chỗ khác.

async function syncBrandFromLog(/* brandKey */) {
    console.log(
        "[gold_price_helper][Mongo] syncBrandFromLog: no-op (Mongo version, dùng trực tiếp log_crawl_*)"
    );
}

exports.syncAllBrandsFromLogs = async function syncAllBrandsFromLogs() {
    console.log(
        "[gold_price_helper][Mongo] syncAllBrandsFromLogs: no-op (Mongo version)"
    );
};

// ================== API CHÍNH DÙNG MONGODB ==================

/**
 * getDataPagePrice:
 *  MySQL gốc:
 *    - Lấy gold_price mỗi hãng tại last_update mới nhất (MAX(last_update) theo company)
 *  Bản Mongo:
 *    - Mỗi brand (collection log_crawl_*):
 *        + Tìm last_update mới nhất (dùng parseLastUpdateToDate)
 *        + Lấy tất cả dòng có cùng last_update đó
 *        + Join với collection "company" để lấy tên + content
 */
exports.getDataPagePrice = async function getDataPagePrice() {
    const db = await getDb();
    const companyCol = db.collection("company");

    const result = [];

    for (const brand of Object.values(BRAND_CONFIG)) {
        const { collection, companyId } = brand;
        const col = db.collection(collection);

        // Lấy toàn bộ last_update (chỉ field cần thiết)
        const cursor = col.find(
            {},
            { projection: { last_update: 1 } }
        );

        let maxDate = null;
        let maxLastUpdateStr = null;

        // Tìm last_update mới nhất bằng cách parse giống MySQL
        // (chi phí ok vì mỗi bảng log không quá to)
        /* eslint-disable no-await-in-loop */
        while (await cursor.hasNext()) {
            const doc = await cursor.next();
            const d = parseLastUpdateToDate(doc.last_update);
            if (!d) continue;
            if (!maxDate || d > maxDate) {
                maxDate = d;
                maxLastUpdateStr = doc.last_update;
            }
        }
        /* eslint-enable no-await-in-loop */

        if (!maxLastUpdateStr) {
            // không có dữ liệu cho brand này
            continue;
        }

        // Lấy toàn bộ rows có cùng last_update đó
        const docs = await col
            .find({ last_update: maxLastUpdateStr })
            .sort({ _id: 1 })
            .toArray();

        if (!docs || !docs.length) continue;

        // Lấy thông tin company
        const company = await companyCol.findOne({ id: companyId });

        const companyName =
            company && company.name
                ? company.name +
                (company.content ? " | " + company.content : "")
                : `Company #${companyId}`;

        const items = docs.map((row) => {
            const buyStr = normalizeMoney(row.buy ?? row.buy_raw);
            const sellStr = normalizeMoney(row.sell ?? row.sell_raw);

            return {
                // app đang dùng field "id" → map từ _id Mongo
                id: row.id ?? row._id,
                name: row.name,
                area: row.area || "Toàn quốc",
                companyId: companyId,
                buy: buyStr,
                sell: sellStr,
                diff_yesterday_buy: row.diff_yesterday_buy ?? 0,
                diff_yesterday_sell: row.diff_yesterday_sell ?? 0,
                last_update: row.last_update,
                // dùng date làm date_sync tương đương
                date_sync: row.date
                    ? moment(row.date)
                        .utc()
                        .format("YYYY-MM-DD HH:mm:ss")
                    : moment().utc().format("YYYY-MM-DD HH:mm:ss"),
            };
        });

        result.push({
            company_id: companyId,
            company_name: companyName,
            items,
        });
    }

    // sort theo company_id giống ORDER BY c.id, gp.id
    result.sort((a, b) => a.company_id - b.company_id);

    return result;
};

/**
 * getDateSyncTime:
 *  MySQL: SELECT date_sync FROM gold_price ORDER BY id DESC LIMIT 1
 *  Mongo: Lấy max(date) trong toàn bộ log_crawl_* rồi format "YYYY-MM-DD HH:mm:ss"
 */
exports.getDateSyncTime = async () => {
    try {
        const db = await getDb();
        let maxDate = null;

        for (const brand of Object.values(BRAND_CONFIG)) {
            const { collection } = brand;
            const col = db.collection(collection);

            const doc = await col
                .find({})
                .sort({ date: -1, _id: -1 })
                .limit(1)
                .next();

            if (doc && doc.date instanceof Date) {
                if (!maxDate || doc.date > maxDate) {
                    maxDate = doc.date;
                }
            }
        }

        if (!maxDate) return null;

        const data = moment(maxDate).format("YYYY-MM-DD HH:mm:ss");
        console.log("[gold_price_helper][Mongo] getDateSyncTime:", data);
        return data;
    } catch (e) {
        console.log("Ex getDateSyncTime (Mongo)", e);
        return null;
    }
};

/**
 * getAllTypeGoldByCompany:
 *  MySQL:
 *    - ROW_NUMBER() OVER (PARTITION BY name, area ORDER BY date DESC) = 1
 *  Mongo:
 *    - sort DESC theo date, _id
 *    - group by name + area, lấy $first (bản mới nhất)
 */
exports.getAllTypeGoldByCompany = async (companyId) => {
    try {
        const db = await getDb();
        const brand = getBrandByCompanyId(companyId);

        if (!brand) {
            console.log("❌ Không tìm thấy companyId:", companyId);
            return [];
        }

        const col = db.collection(brand.collection);

        const rows = await col
            .aggregate([
                { $sort: { date: -1, _id: -1 } },
                {
                    $group: {
                        _id: { name: "$name", area: "$area" },
                        doc: { $first: "$$ROOT" }, // bản mới nhất cho (name, area)
                    },
                },
                { $replaceRoot: { newRoot: "$doc" } },
                { $sort: { name: 1, area: 1 } },
            ])
            .toArray();

        return rows;
    } catch (e) {
        console.log("Ex getAllTypeGoldByCompany (Mongo)", e);
        return [];
    }
};

/**
 * getPriceByType:
 *  MySQL:
 *    SELECT * FROM (
 *      SELECT ..., ROW_NUMBER() OVER (PARTITION BY DATE(date) ORDER BY date DESC) AS rn
 *      FROM table
 *      WHERE company_id = :companyId AND name = :name AND area = :area
 *    ) t
 *    WHERE t.rn = 1
 *    ORDER BY id DESC LIMIT 1;
 *
 *  Mongo:
 *    - match theo name + area
 *    - sort DESC date
 *    - group theo YYYY-MM-DD (ngày), lấy bản đầu tiên → 1 bản / ngày
 *    - sort DESC date, limit 1 → bản mới nhất trong khoảng
 */
exports.getPriceByType = async (companyId, name, area) => {
    try {
        const db = await getDb();
        const brand = getBrandByCompanyId(companyId);

        if (!brand) {
            console.log(
                "❌ getPriceByType: companyId không hợp lệ:",
                companyId
            );
            return null;
        }

        const col = db.collection(brand.collection);

        const rows = await col
            .aggregate([
                {
                    $match: {
                        name: name,
                        area: area,
                    },
                },
                { $sort: { date: -1, _id: -1 } },
                {
                    $group: {
                        _id: {
                            day: {
                                $dateToString: {
                                    format: "%Y-%m-%d",
                                    date: "$date",
                                },
                            },
                        },
                        doc: { $first: "$$ROOT" }, // bản mới nhất trong ngày đó
                    },
                },
                { $replaceRoot: { newRoot: "$doc" } },
                { $sort: { date: -1 } },
                { $limit: 1 },
            ])
            .toArray();

        if (!rows.length) return null;
        return rows[0];
    } catch (e) {
        console.log("Ex getPriceByType (Mongo)", e);
        return null;
    }
};

/**
 * getHistoryByDate:
 *  MySQL:
 *    - PARTITION BY DATE(date) ORDER BY date DESC → lấy bản mới nhất mỗi ngày
 *    - WHERE date >= RANGE
 *    - ORDER BY date ASC
 *
 *  Mongo:
 *    - match theo name + area + date >= fromDate
 *    - sort DESC date
 *    - group theo YYYY-MM-DD → lấy $first
 *    - sort ASC date
 */
exports.getHistoryByDate = async (
    companyId,
    name,
    area,
    range = "7d"
) => {
    try {
        const db = await getDb();
        const brand = getBrandByCompanyId(companyId);

        if (!brand) {
            console.log(
                "❌ getHistoryByCompanyNameArea: companyId không hợp lệ:",
                companyId
            );
            return [];
        }

        const rangeCfg = RANGE_CONFIG[range];
        if (!rangeCfg) {
            console.log(
                "❌ getHistoryByCompanyNameArea: range không hợp lệ:",
                range
            );
            return [];
        }

        const fromDate = moment()
            .subtract(rangeCfg.amount, rangeCfg.unit)
            .startOf("day")
            .toDate();

        const col = db.collection(brand.collection);

        const rows = await col
            .aggregate([
                {
                    $match: {
                        name: name,
                        area: area,
                        date: { $gte: fromDate },
                    },
                },
                { $sort: { date: -1, _id: -1 } },
                {
                    $group: {
                        _id: {
                            day: {
                                $dateToString: {
                                    format: "%Y-%m-%d",
                                    date: "$date",
                                },
                            },
                        },
                        doc: { $first: "$$ROOT" }, // bản mới nhất trong ngày đó
                    },
                },
                { $replaceRoot: { newRoot: "$doc" } },
                { $sort: { date: 1 } }, // lịch sử tăng dần
            ])
            .toArray();

        return rows;
    } catch (e) {
        console.log("Ex getHistoryByCompanyNameArea (Mongo)", e);
        return [];
    }
};
