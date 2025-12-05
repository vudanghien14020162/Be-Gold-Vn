const {QueryTypes} = require("sequelize");
const sequelize     = require("sequelize");
const COMPANY_SJC       = 1;
const COMPANY_DOJI      = 2;
const COMPANY_PNJ       = 3;
const COMPANY_BTMC      = 4;
const COMPANY_BTMH      = 5;
const COMPANY_PHU_QUY   = 6;
const COMPANY_MI_HONG   = 7;
const COMPANY_NGOC_THAM = 8;
// key map: `${name}__${area}`

exports.getYesterdayLastPrices = async (table = DEFAULT_TABLE) => {
    try {
        // const yesterday = moment().subtract(1, "day").format("YYYY-MM-DD");
        const rows = await sequelize.query(
            `
            SELECT DISTINCT t.*
            FROM ${table} AS t
            INNER JOIN (
                SELECT name, area, MAX(date) AS max_date
                FROM ${table}
                WHERE DATE(date) = CURDATE() - INTERVAL 1 DAY
                GROUP BY name, area
            ) AS x
                ON t.name = x.name
               AND t.area = x.area
               AND t.date = x.max_date
            WHERE DATE(t.date) = CURDATE() - INTERVAL 1 DAY
            ORDER BY t.id ASC;
            `,
            {
                type: QueryTypes.SELECT,
            }
        );

        if (!rows || rows.length === 0) {
            console.log("[getYesterdayLastPrices] Không có dữ liệu ngày hôm qua");
            return {};
        }

        const map = {};
        for (const row of rows) {
            const key = `${row.name}__${row.area}`;
            map[key] = row;
        }

        return map;
    } catch (e) {
        console.log("Ex getYesterdayLastPrices:", e);
        return {};
    }
};

exports.insertCrawledPricesWithDiffYesterday = async (items, table = DEFAULT_TABLE) => {
    if (!items || !Array.isArray(items) || items.length === 0) {
        console.log("[insertCrawledPricesWithDiffYesterday] Không có item nào");
        return 0;
    }

    try {
        // 1) Lấy map giá cuối ngày hôm qua theo name+area
        const yesterdayMap = await exports.getYesterdayLastPrices(table);
        const valuesSql = [];      // danh sách VALUES (...), (...)
        const replacements = {};   // dùng cho sequelize
        let idx = 0;

        for (const item of items) {
            const name = item.name;
            const area = item.area || "";
            const company_id = COMPANY_DOJI;

            const buy = Number(item.buy) || 0;
            const sell = Number(item.sell) || 0;

            const buy_raw = item.buy_raw ?? item.buy ?? "";
            const sell_raw = item.sell_raw ?? item.sell ?? "";

            const last_update = item.last_update || null;
            const source = item.source || null;   // OPTIONAL – vì bảng có cột source

            // KEY dùng để so sánh yesterday
            const key = `${name}__${area}`;
            const yesterday = yesterdayMap[key];

            let diff_yesterday_buy = 0;
            let diff_yesterday_sell = 0;

            if (yesterday) {
                diff_yesterday_buy  = buy  - Number(yesterday.buy || 0);
                diff_yesterday_sell = sell - Number(yesterday.sell || 0);
            }

            // Placeholder theo index
            valuesSql.push(
                `(:name${idx}, :buy_raw${idx}, :sell_raw${idx}, :buy${idx}, :sell${idx}, NOW(), :source${idx}, :last_update${idx}, :area${idx}, :company_id${idx}, :diffYBuy${idx}, :diffYSell${idx})`
            );

            // Gán values
            replacements[`name${idx}`] = name;
            replacements[`buy_raw${idx}`] = buy_raw;
            replacements[`sell_raw${idx}`] = sell_raw;
            replacements[`buy${idx}`] = buy;
            replacements[`sell${idx}`] = sell;
            replacements[`source${idx}`] = source;
            replacements[`last_update${idx}`] = last_update;
            replacements[`area${idx}`] = area;
            replacements[`company_id${idx}`] = company_id;
            replacements[`diffYBuy${idx}`] = diff_yesterday_buy;
            replacements[`diffYSell${idx}`] = diff_yesterday_sell;

            idx++;
        }

        if (valuesSql.length === 0) return 0;

        // ⚡ SQL đầy đủ đúng thứ tự cột trong bảng
        const sql = `
            INSERT INTO ${table}
                (name, buy_raw, sell_raw, buy, sell, date, source, last_update, area, company_id, diff_yesterday_buy, diff_yesterday_sell)
            VALUES
                ${valuesSql.join(",\n")}
        `;

        await sequelize.query(sql, {
            type: QueryTypes.INSERT,
            replacements,
        });

        console.log(`[insertCrawledPricesWithDiffYesterday] Inserted: ${valuesSql.length}`);

        return valuesSql.length;

    } catch (err) {
        console.log("Ex insertCrawledPricesWithDiffYesterday:", err);
        return 0;
    }
};

