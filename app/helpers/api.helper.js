// gold_price_helper.js
const app               = require("../config/app");
const sequelize         = app.sequelize;
const { QueryTypes } = require('sequelize');

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
            NOW() AS date_sync
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

