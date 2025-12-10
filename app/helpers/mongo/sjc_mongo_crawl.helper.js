// fetch_giavang_org_sjc.js

const axios = require("axios");
const cheerio = require("cheerio");
const moment = require("moment");
const sjc_gold_helper = require("./sjc_mongo_gold.helper"); // sửa path cho đúng

const URL = "https://giavang.org/trong-nuoc/sjc/";

/**
 * Chuẩn hoá giá từ giavang.org:
 *   - Input: text ở ô <td>, ví dụ "152.900" (nghìn đồng / lượng)
 *   - Output: số đồng / chỉ (vd: 15.290.000)
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

    const dongPerChi = base * 100; // 15.290.000
    return dongPerChi;
}

exports.fetchGiaVangOrgSJC = async function fetchGiaVangOrgSJC() {
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

    // 2) Lấy thời gian cập nhật
    // <td colspan="5"><i>Cập nhật lúc 15:00:05 27/11/2025<br>...</i></td>
    let last_update = "";
    const footerCell = $(".table-responsive table.table tbody tr td[colspan]").first();
    if (footerCell.length) {
        const text = footerCell.text().replace(/\s+/g, " ").trim();
        const m = text.match(/Cập nhật lúc\s+([0-9:]+\s+\d{2}\/\d{2}\/\d{4})/);
        if (m) {
            last_update = m[1].trim(); // "15:00:05 27/11/2025"
        }
    }

    // 3) So với DB – nếu không có dữ liệu mới thì thôi
    const last_update_db = await sjc_gold_helper.getLastUpdateTime();

    console.log("[GIAVANG-SJC] last_update trang   :", last_update);
    console.log("[GIAVANG-SJC] last_update trong DB:", last_update_db);

    if (last_update && last_update_db && last_update === last_update_db) {
        console.log("[GIAVANG-SJC] last_update trùng DB, không crawl thêm.");
        return [];
    }

    // 4) Lấy đúng bảng trong .table-responsive
    const wrapper = $(".table-responsive").first();
    const table = wrapper.find("table").first();

    if (!table || !table.length) {
        console.log("❌ [GIAVANG-SJC] Không tìm thấy bảng trong .table-responsive");
        return [];
    }

    const items = [];
    let currentArea = "";

    const rows = table.find("tbody tr");
    console.log("[GIAVANG-SJC] Số <tr> trong tbody:", rows.length);

    rows.each((index, row) => {
        const $row = $(row);
        const cells = $row.children("th,td");
        if (!cells.length) return;

        // Dòng cuối chứa "Cập nhật lúc..." -> bỏ qua (đã xử lý)
        if (cells.length === 1 && cells.eq(0).attr("colspan")) {
            return;
        }

        const th = $row.children("th").first(); // Khu vực nếu có
        const tds = $row.children("td");        // Loại / Mua / Bán

        if (th.length) {
            currentArea = th.text().trim();
        }

        if (tds.length < 3) {
            console.log(
                `[GIAVANG-SJC] Row ${index} bỏ qua, tds.length = ${tds.length}, text =`,
                $row.text().trim()
            );
            return;
        }

        const area = currentArea || "Toàn quốc";
        const type = tds.eq(0).text().trim();
        const buy_raw = tds.eq(1).text().trim();
        const sell_raw = tds.eq(2).text().trim();

        const buy = normalizePriceFromGiaVangOrg(buy_raw);
        const sell = normalizePriceFromGiaVangOrg(sell_raw);

        items.push({
            name: type,
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

    console.log("[GIAVANG-SJC] Tổng items lấy được:", items.length);
    console.log(
        "[GIAVANG-SJC] Thống kê theo khu vực:",
        items.reduce((acc, it) => {
            const k = it.area || "NO_AREA";
            acc[k] = (acc[k] || 0) + 1;
            return acc;
        }, {})
    );
    // 5) Ghi vào MongoDB (log + diff hôm qua)
    // if (items.length) {
    //     try {
    //         const inserted =
    //             await sjc_gold_helper.insertCrawledPricesWithDiffYesterday(items);
    //         console.log("[GIAVANG-SJC] Đã insert vào Mongo (SJC):", inserted);
    //     } catch (e) {
    //         console.log("[GIAVANG-SJC] Lỗi insert Mongo:", e);
    //     }
    // }
    // vẫn trả items nếu chỗ khác cần dùng
    return items;
};
