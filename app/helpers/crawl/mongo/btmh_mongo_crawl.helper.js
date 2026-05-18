// btmc_mongo_crawl.helper.js
// Lấy dữ liệu giá vàng Bảo Tín Minh Châu (BTMC) từ https://giavang.org/trong-nuoc/bao-tin-minh-chau/
// và làm việc với MongoDB thông qua btmc_mongo_gold.helper.js

const axios = require("axios");
const cheerio = require("cheerio");
const moment = require("moment");

// 👉 helper Mongo (file mình đã viết ở trên)
const btmcGoldHelper = require("../../mongo/btmh_mongo_gold.helper"); // chỉnh path cho đúng

const URL = "https://giavang.org/trong-nuoc/bao-tin-manh-hai/";

// Chuẩn hoá giá từ giavang.org
function normalizePriceFromGiaVangOrg(cellText) {
    const cleaned = (cellText || "").replace(/[^\d]/g, ""); // "152900"
    if (!cleaned) {
        return 0;
    }

    const base = Number(cleaned); // 152900
    if (!base || Number.isNaN(base)) {
        return 0;
    }

    // Nhân 100 để từ "152.900 (nghìn/lượng)" -> "15.290.000 (đồng/chỉ)"
    const dongPerChi = base * 100; // 15.290.000
    return dongPerChi;
}

/**
 * Crawl BTMC từ giavang.org
 * - So sánh last_update trên web với last_update trong Mongo
 * - Nếu trùng thì không crawl thêm
 * - Nếu mới thì build danh sách items, có thể lưu vào Mongo bằng helper
 */
exports.fetchGiavangOrgBTMH = async function fetchGiavangOrgBTMH() {
    try {
        // 1) Gọi trang giavang.org
        const res = await axios.get(URL, {
            timeout: 20000,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "text/html",
                Referer: "https://giavang.org/",
            },
        });

        const $ = cheerio.load(res.data);

        // 2) Lấy thời gian cập nhật trong <h1>
        // Ví dụ: "Giá vàng BTMC hôm nay Cập nhật lúc 16:10:04 27/11/2025"
        let last_update = "";
        const h1Text = $("h1").first().text().trim();
        const m = h1Text.match(/Cập nhật lúc\s+(.+)$/);
        if (m) {
            last_update = m[1].trim(); // "16:10:04 27/11/2025"
        }

        // 3) So với DB – nếu không có dữ liệu mới thì thôi
        const last_update_db = await btmcGoldHelper.getLastUpdateTime();

        console.log("[GIAVANG-BTMH] last_update trang   :", last_update);
        console.log("[GIAVANG-BTMH] last_update trong DB:", last_update_db);

        if (last_update && last_update_db && last_update === last_update_db) {
            console.log(
                "[GIAVANG-BTMH] last_update trùng DB (Mongo), không crawl thêm."
            );
            return [];
        }

        // 4) Lấy bảng dữ liệu (bảng "Bảng giá vàng BTMC ngày ...")
        const wrapper = $(".table-responsive").first();
        const table = wrapper.find("table").first();

        if (!table || !table.length) {
            console.log(
                "❌ [GIAVANG-BTMH] Không tìm thấy bảng trong .table-responsive"
            );
            return [];
        }

        const items = [];
        const rows = table.find("tbody tr");
        console.log("[GIAVANG-BTMH] Số <tr> trong tbody:", rows.length);

        // Giữ thương phẩm hiện tại (VRTL, Nhẫn tròn trơn, Vàng SJC, Vàng BTMC, ...)
        let currentBrand = "";

        rows.each((index, row) => {
            const $row = $(row);
            const cells = $row.children("th,td");
            if (!cells.length) return;

            // Dòng footer "Cập nhật lúc ..."
            if (cells.length === 1 && cells.eq(0).attr("colspan")) {
                const text = cells.eq(0).text().trim();
                if (/Cập nhật lúc/.test(text)) {
                    // đã lấy last_update ở <h1> rồi, bỏ qua
                }
                return;
            }

            let area = "Toàn quốc";
            let name = "";
            let buy_raw = "";
            let sell_raw = "";

            // Cấu trúc bảng BTMC:
            // Thương phẩm | Loại vàng | Mua vào | Bán ra
            if (cells.length >= 4) {
                const brand = cells.eq(0).text().trim(); // VRTL / Nhẫn tròn trơn / Vàng SJC / Vàng BTMC / ...
                const type = cells.eq(1).text().trim(); // Vàng miếng 999.9 (24k) / Trang sức bằng Vàng Rồng Thăng Long ...
                buy_raw = cells.eq(2).text().trim();
                sell_raw = cells.eq(3).text().trim();

                currentBrand = brand;

                // Ghép brand + loại cho rõ ràng
                name = `${brand} ${type}`.replace(/\s+/g, " ").trim();
            } else if (cells.length >= 3) {
                // Trường hợp có dòng 3 cột: [Loại vàng][Mua][Bán] -> dùng lại currentBrand
                const type = cells.eq(0).text().trim();
                buy_raw = cells.eq(1).text().trim();
                sell_raw = cells.eq(2).text().trim();

                const brand = currentBrand || "";
                name = `${brand} ${type}`.replace(/\s+/g, " ").trim();
            } else {
                console.log(
                    `[GIAVANG-BTMC] Row ${index} bỏ qua, cells.length = ${cells.length}, text =`,
                    $row.text().trim()
                );
                return;
            }

            const buy = normalizePriceFromGiaVangOrg(buy_raw);
            const sell = normalizePriceFromGiaVangOrg(sell_raw);

            items.push({
                name, // VRTL Vàng miếng 999.9 (24k) / Vàng BTMC Trang sức ... / Vàng miếng SJC 999.9 / ...
                area, // "Toàn quốc" (hoặc sau này bạn đổi nếu web tách theo khu vực)
                buy_raw,
                sell_raw,
                buy,
                sell,
                // Lưu Date thật vào Mongo (dễ query theo ngày/giờ)
                date: new Date(), // tương đương NOW() tại server
                source: URL,
                last_update,
            });
        });

        console.log("[GIAVANG-BTMH] Tổng items lấy được:", items.length);
        console.log(
            "[GIAVANG-BTMH] Thống kê theo khu vực:",
            items.reduce((acc, it) => {
                const key = it.area || "NO_AREA";
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {})
        );

        // 👉 Tuỳ bạn: nếu muốn lưu luôn vào Mongo ở đây:
        // if (items.length > 0) {
        //     await btmcGoldHelper.insertCrawledPricesWithDiffYesterday(items);
        //     console.log(
        //         "[GIAVANG-BTMH] Đã lưu items vào Mongo (log_crawl_btmh + diff_yesterday)"
        //     );
        // }
        return items;
    } catch (err) {
        console.log("❌ [GIAVANG-BTMH] Lỗi fetchGiavangOrgBTMH:", err);
        return [];
    }
};
