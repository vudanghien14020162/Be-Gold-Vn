// btmh_mongo_crawl.helper.js
// Crawl Bảo Tín Mạnh Hải (BTMH) và làm việc với MongoDB

const axios = require("axios");
const cheerio = require("cheerio");
const moment = require("moment");

// 👉 Dùng chung helper Mongo mà BTMC đang dùng
const btmhGoldHelper = require("./btmh_mongo_gold.helper");
// file btmhMongo.mongo bạn sẽ làm giống file btmcMongo.mongo (đổi tên collection)

// URL trang giá vàng
const URL = "https://baotinmanhhai.vn/gia-vang-hom-nay";

/**
 * Helper convert text → number giá vàng
 */
function toNumber(str) {
    if (!str) return 0;
    const n = Number(String(str).replace(/[^0-9]/g, ""));
    return isNaN(n) ? 0 : n;
}

/**
 * Crawl BTMH + so sánh last_update trong Mongo
 */
exports.crawlDataBTMHHelper = async () => {
    try {
        // 1) Load trang HTML
        const res = await axios.get(URL, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
            },
            timeout: 15000,
        });

        const $ = cheerio.load(res.data);

        // 2) Lấy thời gian cập nhật → updatedAt
        const bodyText = $("body").text().replace(/\s+/g, " ");
        const m = bodyText.match(/Cập (?:nhập|nhật) lúc\s*([0-9: ]+\d{2}\/\d{2}\/\d{4})/);

        const updatedAt = m ? m[1].trim() : null;
        console.log("[BTMH] last_update từ website:", updatedAt);

        // 3) Lấy last_update trong Mongo
        const last_update_db = await btmhGoldHelper.getLastUpdateTime();
        console.log("[BTMH] last_update trong Mongo:", last_update_db);

        // Nếu giống nhau → không crawl nữa
        if (updatedAt && last_update_db && updatedAt === last_update_db) {
            console.log("[BTMH] last_update trùng Mongo, không lấy thêm.");
            return [];
        }

        // 4) Tìm bảng dữ liệu
        let targetTable = null;

        $("table").each((i, table) => {
            const header = $(table).find("tr").first().text();
            if (
                /LOẠI VÀNG/i.test(header) &&
                /MUA VÀO/i.test(header) &&
                /BÁN RA/i.test(header)
            ) {
                targetTable = $(table);
                return false;
            }
        });

        if (!targetTable) {
            console.log("[BTMH] Không tìm thấy bảng giá.");
            return [];
        }

        const items = [];
        const area = "Toàn quốc";

        // 5) Parse từng dòng
        targetTable.find("tbody tr").each((_, row) => {
            const tds = $(row).find("td");
            if (tds.length < 2) return;

            let name = "";
            let buyRaw = "";
            let sellRaw = "";

            if (tds.length >= 4) {
                // Ví dụ: | Vàng BTMC | 999.9 | 75.000 | 76.000 |
                const typeName = $(tds[0]).text().trim();
                const age = $(tds[1]).text().trim();
                name = `${typeName} ${age}`.trim();

                buyRaw = $(tds[2]).text().trim();
                sellRaw = $(tds[3]).text().trim();
            } else {
                // Dạng 3 cột
                name = $(tds[0]).text().trim();
                buyRaw = $(tds[1]).text().trim();
                sellRaw = $(tds[2]).text().trim();
            }

            const buy = toNumber(buyRaw);
            const sell = toNumber(sellRaw);

            items.push({
                name,
                buy_raw: buyRaw || "0",
                sell_raw: sellRaw || "0",
                buy,
                sell,
                date: new Date(), // lưu dạng Date cho Mongo
                source: URL,
                last_update: updatedAt,
                area,
            });
        });

        console.log("[BTMH] Tổng items:", items.length);

        // 6) (Tùy bạn) Lưu vào Mongo
        // await btmhGoldHelper.insertCrawledPricesWithDiffYesterday(items);
        // console.log("[BTMH] Đã lưu vào Mongo");

        return items;
    } catch (err) {
        console.log("❌ LỖI crawlDataBTMHHelper (Mongo):", err);
        return [];
    }
};
