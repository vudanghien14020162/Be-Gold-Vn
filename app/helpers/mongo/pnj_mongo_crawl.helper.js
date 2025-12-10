// fetch_giavang_org_pnj.js
// Lấy dữ liệu giá vàng PNJ từ https://giavang.org/trong-nuoc/pnj/

const axios = require("axios");
const cheerio = require("cheerio");
const moment = require("moment");
const pnj_gold_helper = require("./pnj_mongo_gold.helper"); // sửa path cho đúng

const URL = "https://giavang.org/trong-nuoc/pnj/";

/**
 * Chuẩn hoá giá từ giavang.org:
 *   - Input: text ở ô <td>, ví dụ "152.900" (nghìn đồng / lượng)
 *   - Output: số đồng / chỉ (vd: 15290000)
 *
 * Logic: 152.900 (nghìn/lượng)
 *   -> 152900 * 1000 = 152.900.000 đồng / lượng
 *   -> /10 chỉ  = 15.290.000 đồng / chỉ
 *   => nhân 100: 152900 * 100 = 15.290.000
 */
function normalizePriceFromGiaVangOrg(cellText) {
    const cleaned = (cellText || "").replace(/[^\d]/g, ""); // "152900"
    if (!cleaned) return 0;

    const base = Number(cleaned); // 152900
    if (!base || Number.isNaN(base)) return 0;

    // Nhân 100 để từ "152.900 (nghìn/lượng)" -> "15.290.000 (đồng/chỉ)"
    const dongPerChi = base * 100; // 15.290.000
    return dongPerChi;
}

exports.fetchGiavangOrgPNJ = async function fetchGiavangOrgPNJ() {
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
    // Ví dụ: "Giá vàng PNJ hôm nay Cập nhật lúc 15:25:04 27/11/2025"
    let last_update = "";
    const h1Text = $("h1").first().text().trim();
    const m = h1Text.match(/Cập nhật lúc\s+(.+)$/);
    if (m) {
        last_update = m[1].trim(); // "15:25:04 27/11/2025"
    }

    // 3) So với DB – nếu không có dữ liệu mới thì thôi
    const last_update_db = await pnj_gold_helper.getLastUpdateTime();

    console.log("[GIAVANG-PNJ] last_update trang   :", last_update);
    console.log("[GIAVANG-PNJ] last_update trong DB:", last_update_db);

    if (last_update && last_update_db && last_update === last_update_db) {
        console.log("[GIAVANG-PNJ] last_update trùng DB, không crawl thêm.");
        return [];
    }

    // 4) Lấy bảng dữ liệu (bảng "Bảng giá vàng PNJ ngày ...")
    const wrapper = $(".table-responsive").first();
    const table = wrapper.find("table").first();

    if (!table || !table.length) {
        console.log("❌ [GIAVANG-PNJ] Không tìm thấy bảng trong .table-responsive");
        return [];
    }

    const items = [];
    const rows = table.find("tbody tr");
    console.log("[GIAVANG-PNJ] Số <tr> trong tbody:", rows.length);

    // Giữ khu vực hiện tại (TPHCM / Hà Nội / Miền Tây / Giá vàng nữ trang / ...)
    let currentArea = "";

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

        let area = "";
        let name = "";
        let buy_raw = "";
        let sell_raw = "";

        if (cells.length >= 4) {
            // Dòng 4 cột: [Khu vực][Loại vàng][Mua][Bán]
            area = cells.eq(0).text().trim();
            name = cells.eq(1).text().trim();
            buy_raw = cells.eq(2).text().trim();
            sell_raw = cells.eq(3).text().trim();

            currentArea = area; // lưu lại cho dòng 3 cột
        } else if (cells.length >= 3) {
            // Dòng 3 cột: [Loại vàng][Mua][Bán] -> dùng lại currentArea
            area = currentArea || "";
            name = cells.eq(0).text().trim();
            buy_raw = cells.eq(1).text().trim();
            sell_raw = cells.eq(2).text().trim();
        } else {
            console.log(
                `[GIAVANG-PNJ] Row ${index} bỏ qua, cells.length = ${cells.length}, text =`,
                $row.text().trim()
            );
            return;
        }

        // ======= RULE theo yêu cầu trước đây =======

        // 1) Bỏ hết dòng PNJ
        if (name === "PNJ") {
            console.log(`[GIAVANG-PNJ] Bỏ qua PNJ ở khu vực: ${area}`);
            return;
        }

        // 2) SJC -> "Vàng miếng SJC 999.9"
        if (name === "SJC") {
            name = "Vàng miếng SJC 999.9";
        }

        // 3) area = "Giá vàng nữ trang" -> "Toàn quốc"
        if (area === "Giá vàng nữ trang") {
            area = "Toàn quốc";
        }

        // ==========================================

        const buy = normalizePriceFromGiaVangOrg(buy_raw);
        const sell = normalizePriceFromGiaVangOrg(sell_raw);

        items.push({
            name,
            area,
            buy_raw,
            sell_raw,
            buy,
            sell,
            date: moment().add(7, "hours").format("YYYY-MM-DD HH:mm:ss"),
            source: URL,
            last_update,
        });
    });

    console.log("[GIAVANG-PNJ] Tổng items lấy được:", items.length);
    console.log(
        "[GIAVANG-PNJ] Thống kê theo khu vực:",
        items.reduce((acc, it) => {
            const key = it.area || "NO_AREA";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {})
    );

    // 5) Ghi vào MongoDB (log + diff hôm qua)
    // if (items.length) {
    //     try {
    //         const inserted =
    //             await pnj_gold_helper.insertCrawledPricesWithDiffYesterday(items);
    //         console.log("[GIAVANG-PNJ] Đã insert vào Mongo (PNJ):", inserted);
    //     } catch (e) {
    //         console.log("[GIAVANG-PNJ] Lỗi insert Mongo:", e);
    //     }
    // }

    // vẫn return items nếu chỗ khác cần dùng
    return items;
};
