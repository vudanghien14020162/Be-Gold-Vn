// fetch_giavang_org_phu_quy.js
// Lấy dữ liệu giá vàng Phú Quý từ https://giavang.org/trong-nuoc/phu-quy/

const axios = require("axios");
const cheerio = require("cheerio");
const moment = require("moment");
const phuquy_gold_helper = require("./phu_quy_mongo_gold.helper");

const URL = "https://giavang.org/trong-nuoc/phu-quy/";

/**
 * Chuẩn hoá giá từ giavang.org:
 * - Trên web hiển thị dạng: "152.900" (nghìn đồng / lượng)
 * - Muốn lưu: đồng / CHỈ
 *   152.900 (nghìn/lượng) = 152.900 * 1.000 = 152.900.000 đồng / lượng
 *   1 lượng = 10 chỉ => 152.900.000 / 10 = 15.290.000 đồng / chỉ
 * => Nhân 100 là ra đồng/chỉ
 */
function normalizePriceFromGiaVangOrg(cellText) {
    const cleaned = (cellText || "").replace(/[^\d]/g, ""); // "152900"
    if (!cleaned) return 0;

    const base = Number(cleaned); // 152900
    if (!base || Number.isNaN(base)) return 0;

    // "152.900 (nghìn/lượng)" -> "15.290.000 (đồng/chỉ)"
    const dongPerChi = base * 100;

    return dongPerChi;
}

exports.fetchGiavangOrgPhuQuy = async function fetchGiavangOrgPhuQuy() {
    // 1) Gọi trang giavang.org /trong-nuoc/phu-quy/
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

    // 2) Lấy thời gian cập nhật: "Cập nhật lúc 16:10:04 27/11/2025"
    let last_update = "";
    let textWithUpdate = "";

    // Quét toàn bộ DOM, tìm text chứa "Cập nhật lúc"
    $("*").each((_, el) => {
        const t = $(el).text().trim();
        if (t.includes("Cập nhật lúc")) {
            textWithUpdate = t;
            return false; // break
        }
    });

    if (textWithUpdate) {
        const m = textWithUpdate.match(
            /Cập nhật lúc\s*([0-9:]+\s+\d{2}\/\d{2}\/\d{4})/
        );
        if (m) {
            last_update = m[1].trim(); // "16:10:04 27/11/2025"
        }
    }

    // 3) So với DB – nếu không có dữ liệu mới thì thôi
    const last_update_db = await phuquy_gold_helper.getLastUpdateTime();

    console.log("[GIAVANG-PHUQUY] last_update trang   :", last_update);
    console.log("[GIAVANG-PHUQUY] last_update trong DB:", last_update_db);

    if (last_update && last_update_db && last_update === last_update_db) {
        console.log("[GIAVANG-PHUQUY] last_update trùng DB, không crawl thêm.");
        return [];
    }

    // 4) Tìm bảng giá vàng
    // Thường sẽ nằm trong .table-responsive đầu tiên
    let tableWrapper = $(".table-responsive").first();
    if (!tableWrapper || !tableWrapper.length) {
        // fallback: lấy table đầu tiên
        tableWrapper = $("table").first();
    }

    const table = tableWrapper.find("table").length
        ? tableWrapper.find("table").first()
        : tableWrapper;

    if (!table || !table.length) {
        console.log("❌ [GIAVANG-PHUQUY] Không tìm thấy bảng giá vàng.");
        return [];
    }

    let rows = table.find("tbody tr");
    if (!rows.length) {
        rows = table.find("tr");
    }

    console.log("[GIAVANG-PHUQUY] Số <tr> trong bảng:", rows.length);

    const items = [];
    let currentArea = ""; // giữ khu vực cho các dòng rowspan

    rows.each((index, row) => {
        const $row = $(row);
        const rowText = $row.text().replace(/\s+/g, " ").trim();

        if (!rowText) return;

        // Bỏ qua header / ghi chú
        if (
            /Khu vực/i.test(rowText) ||
            /Loại vàng/i.test(rowText) ||
            /Mua vào/i.test(rowText) ||
            /Bán ra/i.test(rowText) ||
            /Đơn giá/i.test(rowText) ||
            rowText.startsWith("- ")
        ) {
            return;
        }

        const cells = $row.children("th,td");
        if (!cells.length) return;
        let area = currentArea || "Toàn quốc";
        let name = "";
        let buy_raw = "";
        let sell_raw = "";

        if (cells.length >= 4) {
            // Dạng: [Khu vực][Loại vàng][Mua][Bán]
            area = cells.eq(0).text().trim();
            name = cells.eq(1).text().trim();
            buy_raw = cells.eq(2).text().trim();
            sell_raw = cells.eq(3).text().trim();
            currentArea = area; // cập nhật khu vực hiện tại
        } else if (cells.length >= 3) {
            // Dạng: [Loại vàng][Mua][Bán] – dùng lại currentArea
            name = cells.eq(0).text().trim();
            buy_raw = cells.eq(1).text().trim();
            sell_raw = cells.eq(2).text().trim();
            area = currentArea || "Toàn quốc";
        } else {
            console.log(
                `[GIAVANG-PHUQUY] Row ${index} bỏ qua, cells.length = ${cells.length}, text =`,
                rowText
            );
            return;
        }

        // Nếu tên vàng rỗng → dùng loại mặc định
        let nameGold = name && name.trim() !== "" ? name : "Vàng trang sức 999.9";

        const buy = normalizePriceFromGiaVangOrg(buy_raw);
        const sell = normalizePriceFromGiaVangOrg(sell_raw);

        if (buy < 3000000 && name.trim() === "") {
            nameGold =
                "Bạc thỏi Phú Quý 999 (1Kilo, 10 lượng, 5 lượng, 1 lượng)";
        }

        items.push({
            name: nameGold,
            area: area || "Toàn quốc",
            buy_raw,
            sell_raw,
            buy,
            sell,
            // Giờ Việt Nam
            date: moment().utcOffset(7).format("YYYY-MM-DD HH:mm:ss"),
            source: URL,
            last_update,
        });
    });

    console.log("[GIAVANG-PHUQUY] Tổng items lấy được:", items.length);
    console.log(
        "[GIAVANG-PHUQUY] Thống kê theo khu vực:",
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
    //             await phuquy_gold_helper.insertCrawledPricesWithDiffYesterday(items);
    //         console.log("[GIAVANG-PHUQUY] Đã insert vào Mongo (Phú Quý):", inserted);
    //     } catch (e) {
    //         console.log("[GIAVANG-PHUQUY] Lỗi insert Mongo:", e);
    //     }
    // }

    // Vẫn trả items nếu chỗ khác còn dùng
    return items;
};
