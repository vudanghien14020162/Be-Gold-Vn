// gold_price_helper.js
const app = require("../config/app");
const moment = require("moment");
const cached_key = require("../common/cached_key");

/**
 * Yêu cầu:
 * Trong ../config/app phải có app.mongoDb là MongoDB database instance.
 *
 * Ví dụ:
 * app.mongoDb = client.db("ten_database");
 */

const db = app.mongoDb;

// COLLECTION CHÍNH
const GOLD_PRICE_COLLECTION = "gold_prices";
const COMPANY_COLLECTION = "company";

// COMPANY IDs
const COMPANY_SJC = 1;
const COMPANY_DOJI = 2;
const COMPANY_PNJ = 3;
const COMPANY_BTMC = 4;
const COMPANY_BTMH = 5;
const COMPANY_PHU_QUY = 6;
const COMPANY_MI_HONG = 7;
const COMPANY_NGOC_THAM = 8;

// Map log collection → company_id
const BRAND_CONFIG = {
    SJC: {
        collection: "log_crawl_sjc",
        companyId: COMPANY_SJC
    },
    DOJI: {
        collection: "log_crawl_doji",
        companyId: COMPANY_DOJI
    },
    PNJ: {
        collection: "log_crawl_pnj",
        companyId: COMPANY_PNJ
    },
    BTMC: {
        collection: "log_crawl_btmc",
        companyId: COMPANY_BTMC
    },
    BTMH: {
        collection: "log_crawl_btmh",
        companyId: COMPANY_BTMH
    },
    PHU_QUY: {
        collection: "log_crawl_phu_quy",
        companyId: COMPANY_PHU_QUY
    },
    MI_HONG: {
        collection: "log_crawl_mi_hong",
        companyId: COMPANY_MI_HONG
    },
    NGOC_THAM: {
        collection: "log_crawl_ngoc_tham",
        companyId: COMPANY_NGOC_THAM
    }
};

const RANGE_CONFIG = {
    "7d": 7,
    "15d": 15,
    "1m": 30,
    "3m": 90
};

const COMPANY_MULTIPLIER = {
    1: 1000,
    2: 1000,
    3: 1000,
    4: 1000,
    5: 1,
    6: 1,
    7: 1,
    8: 1
};

function getDb() {
    if (!db) {
        throw new Error(
            "MongoDB chưa được khởi tạo. Cần cấu hình app.mongoDb trong ../config/app"
        );
    }

    return db;
}

function goldPriceCol() {
    return getDb().collection(GOLD_PRICE_COLLECTION);
}

function companyCol() {
    return getDb().collection(COMPANY_COLLECTION);
}

function logCol(name) {
    return getDb().collection(name);
}

function parseLastUpdate(value) {
    if (!value) return null;

    if (value instanceof Date) {
        return value;
    }

    const s = String(value).trim();

    const parsed = moment(
        s,
        [
            "HH:mm:ss DD/MM/YYYY",
            "HH:mm DD/MM/YYYY",
            "YYYY-MM-DD HH:mm:ss",
            "YYYY-MM-DDTHH:mm:ss.SSSZ"
        ],
        true
    );

    if (!parsed.isValid()) {
        return null;
    }

    return parsed.toDate();
}

function parseDateValue(row) {
    if (row.date instanceof Date) {
        return row.date;
    }

    if (row.date) {
        const d = new Date(row.date);

        if (!Number.isNaN(d.getTime())) {
            return d;
        }
    }

    const lastUpdateDt = parseLastUpdate(row.last_update);

    if (lastUpdateDt) {
        return lastUpdateDt;
    }

    return new Date();
}

function getDateDay(date) {
    return moment(date).format("YYYY-MM-DD");
}

function normalizeMoney(value) {
    if (value === null || value === undefined) return null;

    let s = String(value).trim();

    if (!s) return null;

    s = s.replace(/[^\d]/g, "");

    if (!s) return null;

    const num = parseInt(s, 10);

    if (Number.isNaN(num)) return null;

    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function toDongFromAny(value, companyId) {
    if (value === null || value === undefined) return 0;

    let digits = String(value).trim().replace(/[^\d\-]/g, "");

    if (!digits) return 0;

    const num = parseInt(digits, 10);

    if (Number.isNaN(num)) return 0;

    const factor = COMPANY_MULTIPLIER[companyId] || 1;

    return num * factor;
}

function formatVnd(num) {
    if (!num || Number.isNaN(num)) return "0";

    return Number(num)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function normalizePriceForApi(rawValue, companyId) {
    const dong = toDongFromAny(rawValue, companyId);
    return formatVnd(dong);
}

async function getCompanyMap() {
    const companies = await companyCol()
        .find(
            {},
            {
                projection: {
                    id: 1,
                    name: 1,
                    content: 1
                }
            }
        )
        .toArray();

    const map = {};

    for (const item of companies) {
        map[item.id] = item;
    }

    return map;
}

/**
 * Tạo index thay UNIQUE KEY MySQL.
 * Gọi 1 lần khi start app hoặc chạy migration.
 */
exports.ensureGoldPriceIndexes = async function ensureGoldPriceIndexes() {
    const col = goldPriceCol();

    await col.createIndex(
        {
            company_id: 1,
            name: 1,
            area: 1,
            date_day: 1
        },
        {
            unique: true,
            name: "uk_gold_price_company_name_area_day"
        }
    );

    await col.createIndex(
        {
            company_id: 1,
            name: 1,
            area: 1,
            date_sync: -1
        },
        {
            name: "idx_latest_price"
        }
    );

    await col.createIndex(
        {
            company_id: 1,
            name: 1,
            area: 1,
            date: -1
        },
        {
            name: "idx_history_price"
        }
    );

    await col.createIndex(
        {
            company_id: 1,
            last_update_dt: -1
        },
        {
            name: "idx_company_last_update"
        }
    );

    console.log("[gold_price_helper] MongoDB indexes created.");
};

async function syncBrandFromLog(brandKey) {
    const cfg = BRAND_CONFIG[brandKey];

    if (!cfg) {
        throw new Error(`Brand not found: ${brandKey}`);
    }

    const { collection, companyId } = cfg;

    const logCollection = logCol(collection);
    const goldCollection = goldPriceCol();

    const latest = await goldCollection.findOne(
        {
            company_id: companyId
        },
        {
            sort: {
                last_update_dt: -1
            },
            projection: {
                last_update_dt: 1
            }
        }
    );

    const latestDate =
        latest && latest.last_update_dt
            ? latest.last_update_dt
            : new Date("1970-01-01T00:00:00.000Z");

    const cursor = logCollection
        .find({
            $or: [
                {
                    last_update_dt: {
                        $gt: latestDate
                    }
                },
                {
                    last_update_dt: {
                        $exists: false
                    }
                }
            ]
        })
        .batchSize(1000);

    const ops = [];
    let total = 0;

    for await (const row of cursor) {
        const lastUpdateDt = row.last_update_dt
            ? new Date(row.last_update_dt)
            : parseLastUpdate(row.last_update);

        if (!lastUpdateDt) {
            continue;
        }

        if (lastUpdateDt <= latestDate) {
            continue;
        }

        const dateValue = parseDateValue(row);
        const dateDay = getDateDay(dateValue);

        ops.push({
            updateOne: {
                filter: {
                    company_id: companyId,
                    name: row.name,
                    area: row.area || "",
                    date_day: dateDay
                },

                update: {
                    $setOnInsert: {
                        company_id: companyId,
                        name: row.name,
                        area: row.area || "",
                        date_day: dateDay
                    },

                    $set: {
                        buy_raw: row.buy_raw || null,
                        sell_raw: row.sell_raw || null,

                        buy: row.buy || null,
                        sell: row.sell || null,

                        date: dateValue,

                        source: row.source || null,

                        last_update: row.last_update || null,
                        last_update_dt: lastUpdateDt,

                        diff_yesterday_buy: row.diff_yesterday_buy || null,
                        diff_yesterday_sell: row.diff_yesterday_sell || null,

                        date_sync: new Date()
                    }
                },

                upsert: true
            }
        });

        if (ops.length >= 1000) {
            const result = await goldCollection.bulkWrite(ops, {
                ordered: false
            });

            total += result.upsertedCount + result.modifiedCount;

            ops.length = 0;
        }
    }

    if (ops.length > 0) {
        const result = await goldCollection.bulkWrite(ops, {
            ordered: false
        });

        total += result.upsertedCount + result.modifiedCount;
    }

    console.log(`[gold_price_helper] DONE → ${brandKey}, synced: ${total}`);

    return total;
}

/**
 * Sync toàn bộ brand từ log collection sang gold_prices.
 */
exports.syncAllBrandsFromLogs = async function syncAllBrandsFromLogs() {
    for (const key of Object.keys(BRAND_CONFIG)) {
        try {
            console.log(`\n[gold_price_helper] Sync brand: ${key}`);
            await syncBrandFromLog(key);
        } catch (err) {
            console.error(`[gold_price_helper] ERROR: ${key} =>`, err.message);
        }
    }
};

/**
 * Lấy giá vàng mới nhất cho trang listing.
 */
exports.getDataPagePrice = async function getDataPagePrice() {
    const companyIds = Object.values(BRAND_CONFIG).map(item => item.companyId);

    const rows = await goldPriceCol()
        .aggregate(
            [
                {
                    $match: {
                        company_id: {
                            $in: companyIds
                        }
                    }
                },

                {
                    $sort: {
                        company_id: 1,
                        name: 1,
                        area: 1,
                        date_sync: -1
                    }
                },

                {
                    $group: {
                        _id: {
                            company_id: "$company_id",
                            name: "$name",
                            area: "$area"
                        },
                        doc: {
                            $first: "$$ROOT"
                        }
                    }
                },

                {
                    $replaceRoot: {
                        newRoot: "$doc"
                    }
                },

                {
                    $sort: {
                        company_id: 1,
                        _id: 1
                    }
                }
            ],
            {
                allowDiskUse: true
            }
        )
        .toArray();

    if (!rows || rows.length === 0) {
        return [];
    }

    const companyMap = await getCompanyMap();

    const map = {};

    for (const row of rows) {
        const compId = row.company_id;
        const company = companyMap[compId];

        if (!map[compId]) {
            map[compId] = {
                company_id: compId,
                company_name: company
                    ? `${company.name} | ${company.content || ""}`
                    : "",
                items: []
            };
        }

        const buyStr = normalizeMoney(row.buy !== undefined ? row.buy : row.buy_raw);
        const sellStr = normalizeMoney(row.sell !== undefined ? row.sell : row.sell_raw);

        map[compId].items.push({
            id: row._id,
            name: row.name,
            area: row.area,
            companyId: compId,
            buy: buyStr,
            sell: sellStr,
            diff_yesterday_buy: row.diff_yesterday_buy,
            diff_yesterday_sell: row.diff_yesterday_sell,
            last_update: row.last_update,
            date_sync: row.date_sync
                ? moment(row.date_sync).format("YYYY-MM-DD HH:mm:ss")
                : null
        });
    }

    return Object.values(map);
};

/**
 * Lấy thời gian sync mới nhất.
 */
exports.getDateSyncTime = async function getDateSyncTime() {
    try {
        const result = await goldPriceCol().findOne(
            {},
            {
                sort: {
                    date_sync: -1
                },
                projection: {
                    date_sync: 1
                }
            }
        );

        if (!result || !result.date_sync) {
            return null;
        }

        return moment(result.date_sync).format("DD-MM-YYYY HH:mm:ss");
    } catch (e) {
        console.log("Ex getDateSyncTime", e);
        return null;
    }
};

/**
 * Lấy toàn bộ loại vàng mới nhất theo company.
 */
exports.getAllTypeGoldByCompany = async function getAllTypeGoldByCompany(companyId) {
    try {
        companyId = Number(companyId);

        const brand = Object.values(BRAND_CONFIG).find(
            item => item.companyId === companyId
        );

        if (!brand) {
            console.log("❌ Không tìm thấy companyId:", companyId);
            return [];
        }

        const rows = await goldPriceCol()
            .aggregate(
                [
                    {
                        $match: {
                            company_id: companyId
                        }
                    },

                    {
                        $sort: {
                            company_id: 1,
                            name: 1,
                            area: 1,
                            date_sync: -1
                        }
                    },

                    {
                        $group: {
                            _id: {
                                company_id: "$company_id",
                                name: "$name",
                                area: "$area"
                            },
                            doc: {
                                $first: "$$ROOT"
                            }
                        }
                    },

                    {
                        $replaceRoot: {
                            newRoot: "$doc"
                        }
                    },

                    {
                        $sort: {
                            _id: 1
                        }
                    }
                ],
                {
                    allowDiskUse: true
                }
            )
            .toArray();

        const companyMap = await getCompanyMap();

        return rows.map(row => {
            const company = companyMap[row.company_id];

            return {
                id: row._id,
                name: row.name,
                area: row.area,
                buy: row.buy,
                sell: row.sell,
                buy_raw: row.buy_raw,
                sell_raw: row.sell_raw,
                date: row.date,
                source: row.source,
                last_update: row.last_update,
                company_id: row.company_id,
                company_name: company ? company.name : "",
                company_content: company ? company.content : "",
                diff_yesterday_buy: row.diff_yesterday_buy,
                diff_yesterday_sell: row.diff_yesterday_sell,
                date_sync: row.date_sync
            };
        });
    } catch (e) {
        console.log("Ex getAllTypeGoldByCompany", e);
        return [];
    }
};

/**
 * Lấy giá mới nhất của 1 loại vàng.
 */
exports.getPriceByType = async function getPriceByType(companyId, name, area) {
    try {
        companyId = Number(companyId);

        const brand = Object.values(BRAND_CONFIG).find(
            item => item.companyId === companyId
        );

        if (!brand) {
            console.log("❌ getPriceByType: companyId không hợp lệ:", companyId);
            return null;
        }

        const row = await goldPriceCol().findOne(
            {
                company_id: companyId,
                name: name,
                area: area || ""
            },
            {
                sort: {
                    date: -1,
                    date_sync: -1
                }
            }
        );

        if (!row) {
            return null;
        }

        return {
            id: row._id,
            company_id: row.company_id,
            name: row.name,
            area: row.area,
            buy: row.buy,
            sell: row.sell,
            buy_raw: row.buy_raw,
            sell_raw: row.sell_raw,
            date: row.date,
            source: row.source,
            last_update: row.last_update,
            diff_yesterday_buy: row.diff_yesterday_buy,
            diff_yesterday_sell: row.diff_yesterday_sell
        };
    } catch (e) {
        console.log("Ex getPriceByType", e);
        return null;
    }
};

/**
 * Lấy history theo ngày.
 */
exports.getHistoryByDate = async function getHistoryByDate(
    companyId,
    name,
    area,
    range = "7d"
) {
    try {
        companyId = Number(companyId);

        const brand = Object.values(BRAND_CONFIG).find(
            item => item.companyId === companyId
        );

        if (!brand) {
            console.log("❌ getHistoryByDate: companyId không hợp lệ:", companyId);
            return [];
        }

        const limit = RANGE_CONFIG[range];

        if (!limit) {
            console.log("❌ getHistoryByDate: range không hợp lệ:", range);
            return [];
        }

        const rows = await goldPriceCol()
            .aggregate(
                [
                    {
                        $match: {
                            company_id: companyId,
                            name: name,
                            area: area || ""
                        }
                    },

                    {
                        $sort: {
                            date_day: -1,
                            date: -1,
                            date_sync: -1
                        }
                    },

                    {
                        $group: {
                            _id: "$date_day",
                            doc: {
                                $first: "$$ROOT"
                            }
                        }
                    },

                    {
                        $replaceRoot: {
                            newRoot: "$doc"
                        }
                    },

                    {
                        $sort: {
                            date_day: -1
                        }
                    },

                    {
                        $limit: limit
                    },

                    {
                        $sort: {
                            date_day: 1
                        }
                    },

                    {
                        $project: {
                            _id: 0,
                            id: "$_id",
                            company_id: 1,
                            name: 1,
                            area: 1,
                            buy: 1,
                            sell: 1,
                            buy_raw: 1,
                            sell_raw: 1,
                            date: 1,
                            source: 1,
                            last_update: 1,
                            diff_yesterday_buy: 1,
                            diff_yesterday_sell: 1,
                            date_day: 1
                        }
                    }
                ],
                {
                    allowDiskUse: true
                }
            )
            .toArray();

        return rows;
    } catch (e) {
        console.log("Ex getHistoryByDate", e);
        return [];
    }
};