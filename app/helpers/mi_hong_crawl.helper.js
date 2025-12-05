// fetch_giavang_org_mihong.js
// Lấy dữ liệu giá vàng Mi Hồng từ https://giavang.org/trong-nuoc/mi-hong/

const axios = require("axios");
const cheerio = require("cheerio");
const moment = require("moment");
const mihong_gold_helper = require("./mi_hong_gold.helper"); // giống phu_quy_gold.helper

const URL = "https://giavang.org/trong-nuoc/mi-hong/";


/**
 * Chuẩn hoá giá từ giavang.org:
 *   - Input: text ở ô <td>, ví dụ "152.900" (nghìn đồng / lượng)
 *   - Output:
 *        value:  số đồng / chỉ (vd: 15290000)
 *        raw:    string format "15.290.000"
 *
 * Logic: 152.900 (nghìn/lượng)
 *   -> 152900 * 1000 = 152.900.000 đồng / lượng
 *   -> /10 chỉ  = 15.290.000 đồng / chỉ
 *   => nhân 100: 152900 * 100 = 15.290.000
 */
function normalizePriceFromGiaVangOrg(cellText) {
    const cleaned = (cellText || "").replace(/[^\d]/g, ""); // "152900"
    if (!cleaned) {
        return { value: 0, raw: "0" };
    }

    const base = Number(cleaned); // 152900
    if (!base || Number.isNaN(base)) {
        return { value: 0, raw: "0" };
    }

    // Nhân 100 để từ "152.900 (nghìn/lượng)" -> "15.290.000 (đồng/chỉ)"
    const dongPerChi = base * 100; // 15.290.000

    // Format thành "15.290.000"
    // const raw = dongPerChi
    //     .toString()
    // .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    // return {
    //     value: dongPerChi,
    //     raw,
    // };
    return dongPerChi;
}

exports.fetchGiavangOrgMiHong = async function fetchGiavangOrgMiHong() {
    // 1) Gọi trang giavang.org (Mi Hồng)
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

    // 2) Lấy thời gian cập nhật: "Cập nhật lúc 16:50:05 27/11/2025"
    let last_update = "";
    let textWithUpdate = "";

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
            last_update = m[1].trim(); // "16:50:05 27/11/2025"
        }
    }

    // 3) So với DB – nếu không có dữ liệu mới thì thôi
    const last_update_db = await mihong_gold_helper.getLastUpdateTime();

    console.log("[MIHONG] last_update trang   :", last_update);
    console.log("[MIHONG] last_update trong DB:", last_update_db);

    if (last_update && last_update_db && last_update === last_update_db) {
        console.log("[MIHONG] last_update trùng DB, không crawl thêm.");
        return [];
    }

    // 4) Tìm bảng giá vàng (dùng table đầu tiên)
    let table = $("table").first();

    if (!table || !table.length) {
        console.log("❌ [MIHONG] Không tìm thấy bảng <table> trên trang.");
        return [];
    }

    let rows = table.find("tbody tr");
    if (!rows.length) {
        // fallback nếu không có <tbody>
        rows = table.find("tr");
    }

    console.log("[MIHONG] Số <tr> trong bảng:", rows.length);

    const items = [];

    rows.each((index, row) => {
        const $row = $(row);
        const rowText = $row.text().replace(/\s+/g, " ").trim();

        if (!rowText) return;

        // Bỏ qua header hoặc các dòng ghi chú
        if (
            /Loại vàng/i.test(rowText) ||
            /Mua vào/i.test(rowText) ||
            /Bán ra/i.test(rowText) ||
            /Đơn vị/i.test(rowText) ||
            rowText.startsWith("- ")
        ) {
            // console.log("[MIHONG] Bỏ qua header/note:", rowText);
            return;
        }

        // ⚠️ CHỖ QUAN TRỌNG: dùng cả th và td
        const cells = $row.children("th,td");

        if (cells.length < 3) {
            console.log(
                `[MIHONG] Row ${index} bỏ qua, cells.length = ${cells.length}, text =`,
                rowText
            );
            return;
        }

        const type = cells.eq(0).text().trim();
        const buy_raw = cells.eq(1).text().trim();
        const sell_raw = cells.eq(2).text().trim();

        // const buy = Number(buy_raw.replace(/[^\d]/g, "")) || 0;
        // const sell = Number(sell_raw.replace(/[^\d]/g, "")) || 0;

        const buy = normalizePriceFromGiaVangOrg(buy_raw);
        const sell = normalizePriceFromGiaVangOrg(sell_raw);

        // Mi Hồng không chia khu vực, tạm đặt area = "Mi Hồng"
        const area = "Toàn quốc";

        items.push({
            name: type,
            area: area,
            buy_raw,
            sell_raw,
            buy,
            sell,
            date: moment().add(7, 'hours').format("YYYY-MM-DD HH:mm:ss"),
            source: URL,
            last_update,
        });
    });

    console.log("[MIHONG] Tổng items lấy được:", items.length);
    console.log(
        "[MIHONG] Thống kê theo area:",
        items.reduce((acc, it) => {
            acc[it.area] = (acc[it.area] || 0) + 1;
            return acc;
        }, {})
    );

    return items;
};
