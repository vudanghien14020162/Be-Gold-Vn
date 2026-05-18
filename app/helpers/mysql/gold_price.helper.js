// gold_price_helper.js
const app               = require("../config/app");
const sequelize         = app.sequelize;
const { QueryTypes } = require('sequelize');
const moment = require("moment");
const cached_key = require("../common/cached_key");

// COMPANY IDs
const COMPANY_SJC       = 1;
const COMPANY_DOJI      = 2;
const COMPANY_PNJ       = 3;
const COMPANY_BTMC      = 4;
const COMPANY_BTMH      = 5;
const COMPANY_PHU_QUY   = 6;
const COMPANY_MI_HONG   = 7;
const COMPANY_NGOC_THAM = 8;

// Map bảng log → company_id
const BRAND_CONFIG = {
    SJC:       { table: 'log_crawl_sjc',        companyId: COMPANY_SJC },
    DOJI:      { table: 'log_crawl_doji',       companyId: COMPANY_DOJI },
    PNJ:       { table: 'log_crawl_pnj',        companyId: COMPANY_PNJ },
    BTMC:      { table: 'log_crawl_btmc',       companyId: COMPANY_BTMC },
    BTMH:      { table: 'log_crawl_btmh',       companyId: COMPANY_BTMH },
    PHU_QUY:   { table: 'log_crawl_phu_quy',    companyId: COMPANY_PHU_QUY },
    MI_HONG:   { table: 'log_crawl_mi_hong',    companyId: COMPANY_MI_HONG },
    NGOC_THAM: { table: 'log_crawl_ngoc_tham',  companyId: COMPANY_NGOC_THAM },
};

//
// const RANGE_CONFIG = {
//     "7d":  "DATE_SUB(CURDATE(), INTERVAL 7 DAY)",
//     "1m":  "DATE_SUB(CURDATE(), INTERVAL 1 MONTH)",
//     "3m":  "DATE_SUB(CURDATE(), INTERVAL 3 MONTH)",
// };
const RANGE_CONFIG = {
    "7d":  7,
    "15d": 15,
    "1m":  30,
    "3m":  3 * 30,
};
const COMPANY_MULTIPLIER = {
    1: 1000, // SJC: dữ liệu gốc đơn vị nghìn/chỉ -> nhân 1000 để ra đồng
    2: 1000, // DOJI: nếu cũng là nghìn
    3: 1000, // PNJ: nếu cũng là nghìn
    4: 1000, // BTMC: nếu đang ở “nghìn” (tuỳ dữ liệu thực tế)
    5: 1,    // BTMH: nếu đang là "15.220.000" (đã là đồng) thì để 1
    6: 1,    // Phú Quý
    7: 1,    // Mi Hồng
    8: 1,    // Ngọc Thẩm
};

// Tạo UNIQUE KEY
async function ensureGoldPriceUniqueKey() {
    const sql = `
        ALTER TABLE gold_price
        ADD UNIQUE KEY uk_gold_price_company_name_area_date (
            company_id, name, area, date
        );
    `;
    try {
        await sequelize.query(sql);
        console.log('[gold_price_helper] UNIQUE KEY created.');
    } catch (err) {
        console.log('[gold_price_helper] UNIQUE KEY existed:', err.message);
    }
}

async function syncBrandFromLog(brandKey) {
    const cfg = BRAND_CONFIG[brandKey];
    if (!cfg) throw new Error(`Brand not found: ${brandKey}`);

    const { table, companyId } = cfg;

    const sql = `
        INSERT IGNORE INTO gold_price (
            name,
            buy_raw,
            sell_raw,
            buy,
            sell,
            date,
            source,
            last_update,
            area,
            company_id,
            diff_yesterday_buy,
            diff_yesterday_sell,
            date_sync
        )
        SELECT
            l.name,
            l.buy_raw,
            l.sell_raw,
            l.buy,
            l.sell,
            l.date,
            l.source,
            l.last_update,
            l.area,
            :companyId AS company_id,
            l.diff_yesterday_buy,
            l.diff_yesterday_sell,
            UTC_TIMESTAMP() + INTERVAL 7 HOUR AS date_sync
        FROM ${table} AS l
        WHERE 
            (
                CASE
                    WHEN l.last_update LIKE '%:%:% %'
                        THEN STR_TO_DATE(l.last_update, '%H:%i:%s %d/%m/%Y')
                    ELSE STR_TO_DATE(l.last_update, '%H:%i %d/%m/%Y')
                END
            ) >
            (
                SELECT 
                    IFNULL(
                        MAX(
                            CASE
                                WHEN gp.last_update LIKE '%:%:% %'
                                    THEN STR_TO_DATE(gp.last_update, '%H:%i:%s %d/%m/%Y')
                                ELSE STR_TO_DATE(gp.last_update, '%H:%i %d/%m/%Y')
                            END
                        ),
                        '1970-01-01 00:00:00'
                    )
                FROM gold_price gp
                WHERE gp.company_id = :companyId
            );
    `;

    await sequelize.query(sql, {
        replacements: { companyId },
        type: QueryTypes.INSERT,
    });

    console.log(`[gold_price_helper] DONE → ${brandKey}`);
}

// Sync toàn bộ brand
exports.syncAllBrandsFromLogs = async function syncAllBrandsFromLogs() {
    for (const key of Object.keys(BRAND_CONFIG)) {
        try {
            console.log(`\n[gold_price_helper] Sync brand: ${key}`);
            await syncBrandFromLog(key);
        } catch (err) {
            console.error(`[gold_price_helper] ERROR: ${key} =>`, err.message);
        }
    }
}

function normalizeMoney(value) {
    if (value === null || value === undefined) return null;

    // ép thành chuỗi
    let s = String(value).trim();

    if (!s) return null;

    // bỏ hết ký tự không phải số (., khoảng trắng, ký tự lạ…)
    s = s.replace(/[^\d]/g, '');
    if (!s) return null;

    // parse thành số (hoặc BigInt nếu bạn sợ quá lớn)
    const num = parseInt(s, 10);
    if (isNaN(num)) return null;

    // format 3 số 1 dấu chấm: 68300000 -> "68.300.000"
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}


function toDongFromAny(value, companyId) {
    if (value === null || value === undefined) return 0;

    // Ép thành chuỗi, bỏ hết ký tự không phải số
    let digits = String(value).trim().replace(/[^\d\-]/g, '');
    if (!digits) return 0;

    let num = parseInt(digits, 10);
    if (isNaN(num)) return 0;

    const factor = COMPANY_MULTIPLIER[companyId] || 1;
    return num * factor;
}
function formatVnd(num) {
    if (!num || isNaN(num)) return '0';
    return Number(num)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function normalizePriceForApi(rawValue, companyId) {
    const dong = toDongFromAny(rawValue, companyId);
    return formatVnd(dong);
    // return dong / 1000;
}
exports.getDataPagePrice = async function getDataPagePrice() {
    const sql = `
        SELECT
            t.*,
            c.name   AS company_name,
            c.content AS company_content
        FROM (
            SELECT
                gp.*,
                ROW_NUMBER() OVER (
                    PARTITION BY gp.company_id, gp.name, gp.area
                    ORDER BY gp.date_sync DESC
                ) AS rn
            FROM gold_price gp
            WHERE gp.company_id IN (1,2,3,4,5,6,7,8)
        ) AS t
        JOIN company c
            ON t.company_id = c.id
        WHERE t.rn = 1
        ORDER BY c.id, t.id;
    `;

    // const sql = `
    //     SELECT
    //         t.*,
    //         c.name   AS company_name,
    //         c.content AS company_content
    //     FROM (
    //              SELECT
    //                  gp.*,
    //                  ROW_NUMBER() OVER (
    //         PARTITION BY gp.company_id, gp.name, gp.area
    //         ORDER BY
    //             CASE
    //                 WHEN gp.last_update LIKE '%:%:% %'
    //                     THEN STR_TO_DATE(gp.last_update, '%H:%i:%s %d/%m/%Y')
    //                 ELSE STR_TO_DATE(gp.last_update, '%H:%i %d/%m/%Y')
    //             END DESC
    //     ) AS rn
    //              FROM gold_price gp
    //              WHERE company_id IN (1, 2, 3, 4, 5,6, 7, 8)
    //          ) AS t
    //              JOIN company c
    //                   ON t.company_id = c.id
    //     WHERE t.rn = 1
    //     order by c.id, t.id
    // `;

    // return await sequelize.query(sql, { type: QueryTypes.SELECT });

    const [result] = await sequelize.query(
            sql,
            {type: sequelize.SELECT}
    );
    if(result.length > 0){
        // === GROUP THEO COMPANY ===
        const map = {};
        for (const row of result) {
            const compId = row.company_id;

            if (!map[compId]) {
                map[compId] = {
                    company_id: compId,
                    company_name: row.company_name + " | " + row.company_content,
                    items: []
                };
            }

            // Chuẩn hoá buy/sell → đồng → "xx.xxx.xxx"
            // Chuẩn hoá buy/sell → đồng → "xx.xxx.xxx"
            const buyStr  = normalizeMoney(row.buy ?? row.buy_raw, compId);
            const sellStr = normalizeMoney(row.sell ?? row.sell_raw, compId);

            // const diffBuyStr  = formatVnd(toDongFromAny(row.diff_yesterday_buy, compId));
            // const diffSellStr = formatVnd(toDongFromAny(row.diff_yesterday_sell, compId));
            const diff_yesterday_buy  = row.diff_yesterday_buy;
            const diff_yesterday_sell = row.diff_yesterday_sell;

            map[compId].items.push({
                id: row.id,
                name: row.name,
                area: row.area,
                companyId: compId,
                buy: buyStr,
                sell: sellStr,
                // buy_raw: diffBuyStr,
                // sell_raw: diffSellStr,
                diff_yesterday_buy: diff_yesterday_buy,
                diff_yesterday_sell: diff_yesterday_sell,
                last_update: row.last_update,
                date_sync: moment(row.date_sync).format('YYYY-MM-DD HH:mm:ss')
            });
        }
        return Object.values(map);
    }
    return [];

}

// exports.getDataPagePrice = async function getDataPagePrice() {
//     const sql = `
//         SELECT
//             gp.*,
//             c.name company_name,
//             c.content company_content
//         FROM gold_price AS gp
//         JOIN company AS c
//             ON gp.company_id = c.id
//         JOIN (
//             SELECT
//                 company_id,
//                 MAX(
//                     CASE
//                         WHEN last_update LIKE '%:%:% %'
//                             THEN STR_TO_DATE(last_update, '%H:%i:%s %d/%m/%Y')
//                         ELSE STR_TO_DATE(last_update, '%H:%i %d/%m/%Y')
//                     END
//                 ) AS max_last_update
//             FROM gold_price
//             GROUP BY company_id
//         ) AS t
//             ON gp.company_id = t.company_id
//            AND (
//                 CASE
//                     WHEN gp.last_update LIKE '%:%:% %'
//                         THEN STR_TO_DATE(gp.last_update, '%H:%i:%s %d/%m/%Y')
//                     ELSE STR_TO_DATE(gp.last_update, '%H:%i %d/%m/%Y')
//                 END
//            ) = t.max_last_update
//         ORDER BY c.id, gp.id;
//     `;
//
//     // return await sequelize.query(sql, { type: QueryTypes.SELECT });
//
//     const [result] = await sequelize.query(
//             sql,
//             {type: sequelize.SELECT}
//     );
//     if(result.length > 0){
//         // === GROUP THEO COMPANY ===
//         const map = {};
//         for (const row of result) {
//             const compId = row.company_id;
//
//             if (!map[compId]) {
//                 map[compId] = {
//                     company_id: compId,
//                     company_name: row.company_name + " | " + row.company_content,
//                     items: []
//                 };
//             }
//
//             // Chuẩn hoá buy/sell → đồng → "xx.xxx.xxx"
//             // Chuẩn hoá buy/sell → đồng → "xx.xxx.xxx"
//             const buyStr  = normalizeMoney(row.buy ?? row.buy_raw, compId);
//             const sellStr = normalizeMoney(row.sell ?? row.sell_raw, compId);
//
//             // const diffBuyStr  = formatVnd(toDongFromAny(row.diff_yesterday_buy, compId));
//             // const diffSellStr = formatVnd(toDongFromAny(row.diff_yesterday_sell, compId));
//             const diff_yesterday_buy  = row.diff_yesterday_buy;
//             const diff_yesterday_sell = row.diff_yesterday_sell;
//
//             map[compId].items.push({
//                 id: row.id,
//                 name: row.name,
//                 area: row.area,
//                 companyId: compId,
//                 buy: buyStr,
//                 sell: sellStr,
//                 // buy_raw: diffBuyStr,
//                 // sell_raw: diffSellStr,
//                 diff_yesterday_buy: diff_yesterday_buy,
//                 diff_yesterday_sell: diff_yesterday_sell,
//                 last_update: row.last_update,
//                 date_sync: moment.tz(row.date_sync, 'Asia/Ho_Chi_Minh').utc().format('YYYY-MM-DD HH:mm:ss')
//             });
//         }
//         return Object.values(map);
//     }
//     return [];
//
// }

exports.getDateSyncTime = async () => {
    try {
        const result = await sequelize.query(
            "SELECT date_sync FROM `gold_price` order by id DESC limit 1", {
                type: QueryTypes.SELECT,
            }
        );

        let data = null;
        if(result && result.length > 0){
            data = moment(result[0].date_sync).format("DD-MM-YYYY HH:mm:ss");
        }else{
            return null;
        }
        console.log("data", data);
        return result.length > 0 ? data : null;
    } catch (e) {
        console.log("Ex getDateSyncTime",e);
        return;
    }
};


// function buildLatestTypeSql(tableName) {
//     return `
//         SELECT *
//         FROM (
//             SELECT
//                 id,
//                 name,
//                 area,
//                 buy,
//                 sell,
//                 buy_raw,
//                 sell_raw,
//                 date,
//                 source,
//                 last_update,
//                 company_id,
//                 diff_yesterday_buy,
//                 diff_yesterday_sell,
//                 ROW_NUMBER() OVER (
//                     PARTITION BY name, area
//                     ORDER BY date DESC
//                 ) AS rn
//             FROM ${tableName}
//         ) x
//         WHERE x.rn = 1
//         ORDER BY x.id ASC;
//     `;
// }


function buildLatestTypeSql() {
    // return `
    //     SELECT
    //         gp.*
    //     FROM gold_price AS gp
    //     JOIN (
    //         SELECT
    //             company_id,
    //             MAX(
    //                 CASE
    //                     WHEN last_update LIKE '%:%:% %'
    //                         THEN STR_TO_DATE(last_update, '%H:%i:%s %d/%m/%Y')
    //                     ELSE STR_TO_DATE(last_update, '%H:%i %d/%m/%Y')
    //                 END
    //             ) AS max_last_update
    //         FROM gold_price
    //         WHERE company_id = :companyId      -- 🔍 chỉ tìm trong đúng companyId
    //         GROUP BY company_id
    //     ) AS t
    //         ON gp.company_id = t.company_id
    //        AND (
    //             CASE
    //                 WHEN gp.last_update LIKE '%:%:% %'
    //                     THEN STR_TO_DATE(gp.last_update, '%H:%i:%s %d/%m/%Y')
    //                 ELSE STR_TO_DATE(gp.last_update, '%H:%i %d/%m/%Y')
    //             END
    //        ) = t.max_last_update
    //     WHERE gp.company_id = :companyId       -- lọc đúng công ty
    //     ORDER BY gp.id ASC;
    // `;

    return `
        SELECT
            t.*,
            c.name   AS company_name,
            c.content AS company_content
        FROM (
            SELECT
                gp.*,
                ROW_NUMBER() OVER (
                    PARTITION BY gp.company_id, gp.name, gp.area
                    ORDER BY gp.date_sync DESC
                ) AS rn
            FROM gold_price gp
            WHERE gp.company_id = :companyId
        ) AS t
        JOIN company c
            ON t.company_id = c.id
        WHERE t.rn = 1
        ORDER BY c.id, t.id;
    `;
}


// exports.getAllTypeGoldByCompany = async (companyId) => {
//     try {
//         //get to redis cached
//         let key_redis = cached_key.list_type_gold_by_company + "_id:" + companyId;
//         let data_cached = await app.getCache(key_redis);
//         if(data_cached){
//             let data = JSON.parse(data_cached);
//             if(!data || Object.keys(data).length === 0){
//                 return null;
//             }
//             return data;
//         }else {
//             // tìm brand trong config
//             const brand = Object.values(BRAND_CONFIG).find(
//                 (b) => b.companyId === companyId
//             );
//             if (!brand) {
//                 console.log("❌ Không tìm thấy companyId:", companyId);
//                 return [];
//             }
//             const sql = buildLatestTypeSql(brand.table);
//             const rows = await sequelize.query(sql, {
//                 type: sequelize.QueryTypes.SELECT,
//             });
//             let data = [];
//             if (rows.length > 0) {
//                 data = rows;
//             }else {
//                 data = null;
//             }
//             await app.setCache(key_redis, JSON.stringify(data));
//             return rows;
//             // const result = await sequelize.query(
//             //     "SELECT id, name, content, icon FROM `company`", {
//             //         type: QueryTypes.SELECT,
//             //     }
//             // );
//             // //set to redis cached
//             // let data = [];
//             // if (result.length > 0) {
//             //     data = result;
//             // } else {
//             //     data = null;
//             // }
//             // await app.setCache(key_redis, JSON.stringify(data));
//             // return data;
//         }
//
//
//     } catch (e) {
//         console.log("Ex getAllTypeGoldByCompany", e);
//         return [];
//     }
// };

exports.getAllTypeGoldByCompany = async (companyId) => {
    try {
        // tìm brand trong config
        const brand = Object.values(BRAND_CONFIG).find(
            (b) => b.companyId === companyId
        );
        if (!brand) {
            console.log("❌ Không tìm thấy companyId:", companyId);
            return [];
        }
        // const sql = buildLatestTypeSql(brand.table);
        const sql = buildLatestTypeSql();
        const rows = await sequelize.query(sql, {
            type: sequelize.QueryTypes.SELECT,
            replacements: { companyId },
        });
        return rows;
    } catch (e) {
        console.log("Ex getAllTypeGoldByCompany", e);
        return [];
    }
};



function buildGetPriceByTypeSql(tableName) {
    return `
        SELECT *
        FROM (
            SELECT
                id,
                company_id,
                name,
                area,
                buy,
                sell,
                buy_raw,
                sell_raw,
                \`date\`,
                source,
                last_update,
                diff_yesterday_buy,
                diff_yesterday_sell,
                ROW_NUMBER() OVER (
                    PARTITION BY DATE(\`date\`)
                    ORDER BY \`date\` DESC
                ) AS rn
            FROM ${tableName}
            WHERE company_id = :companyId
              AND name = :name
              AND area = :area
        ) t
        WHERE t.rn = 1
        ORDER BY id DESC LIMIT 1;
    `;
}

exports.getPriceByType = async (companyId, name, area) => {
    try {
        // 1) Tìm brand theo companyId
        const brand = Object.values(BRAND_CONFIG).find(
            (b) => b.companyId === companyId
        );

        if (!brand) {
            console.log("❌ getPriceByType: companyId không hợp lệ:", companyId);
            return [];
        }

        // 3) Build SQL
        const sql = buildGetPriceByTypeSql(brand.table);

        // 4) Query
        const result = await sequelize.query(sql, {
            type: sequelize.QueryTypes.SELECT,
            replacements: {
                companyId,
                name,
                area,
            },
        });
        let data = null;
        if(result && result.length > 0){
            data = result[0];
        }else{
            return null;
        }
        return data;
    } catch (e) {
        console.log("Ex buildGetPriceByTypeSql", e);
        return [];
    }
};

// function buildHistorySql(tableName, rangeExpr) {
//     return `
//         SELECT *
//         FROM (
//             SELECT
//                 id,
//                 company_id,
//                 name,
//                 area,
//                 buy,
//                 sell,
//                 buy_raw,
//                 sell_raw,
//                 \`date\`,
//                 source,
//                 last_update,
//                 diff_yesterday_buy,
//                 diff_yesterday_sell,
//                 ROW_NUMBER() OVER (
//                     PARTITION BY DATE(\`date\`)
//                     ORDER BY \`date\` DESC
//                 ) AS rn
//             FROM ${tableName}
//             WHERE company_id = :companyId
//               AND name = :name
//               AND area = :area
//               AND \`date\` >= ${rangeExpr}
//         ) t
//         WHERE t.rn = 1
//         ORDER BY t.\`date\` ASC;
//     `;
// }

function buildHistorySql(tableName, rangeExpr) {
    // rangeExpr bây giờ là SỐ NGÀY cần lấy (7, 30, 90...)
    return `
        SELECT
            id,
            company_id,
            name,
            area,
            buy,
            sell,
            buy_raw,
            sell_raw,
            \`date\`,
            source,
            last_update,
            diff_yesterday_buy,
            diff_yesterday_sell
        FROM (
            SELECT
                id,
                company_id,
                name,
                area,
                buy,
                sell,
                buy_raw,
                sell_raw,
                \`date\`,
                source,
                last_update,
                diff_yesterday_buy,
                diff_yesterday_sell,
                -- bản ghi mới nhất trong từng ngày
                ROW_NUMBER() OVER (
                    PARTITION BY DATE(\`date\`)
                    ORDER BY \`date\` DESC
                ) AS rn,

                -- rank theo NGÀY (ngày mới nhất = 1, kế = 2, ...)
                DENSE_RANK() OVER (
                    ORDER BY DATE(\`date\`) DESC
                ) AS d_rank
            FROM ${tableName}
            WHERE company_id = :companyId
              AND name       = :name
              AND area       = :area
        ) t
        WHERE t.rn = 1              -- mỗi ngày 1 dòng mới nhất
          AND t.d_rank <= ${rangeExpr}  -- đúng số ngày truyền lên, không kể ngày bắt đầu
        ORDER BY t.\`date\` ASC;    -- cho chart: thời gian từ cũ → mới
    `;
}

exports.getHistoryByDate = async (companyId, name, area, range = '7d') => {
    try {
        // 1) Tìm brand theo companyId
        const brand = Object.values(BRAND_CONFIG).find(
            (b) => b.companyId === companyId
        );

        if (!brand) {
            console.log("❌ getHistoryByCompanyNameArea: companyId không hợp lệ:", companyId);
            return [];
        }

        // 2) Tìm biểu thức thời gian theo range
        const rangeExpr = RANGE_CONFIG[range];
        if (!rangeExpr) {
            console.log("❌ getHistoryByCompanyNameArea: range không hợp lệ:", range);
            return [];
        }

        // 3) Build SQL
        const sql = buildHistorySql(brand.table, rangeExpr);

        // 4) Query
        const rows = await sequelize.query(sql, {
            type: sequelize.QueryTypes.SELECT,
            replacements: {
                companyId,
                name,
                area,
            },
        });

        return rows;
    } catch (e) {
        console.log("Ex getHistoryByCompanyNameArea", e);
        return [];
    }
};


