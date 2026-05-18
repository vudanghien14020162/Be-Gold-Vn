// btmc_crawl.helper.js
// Lấy dữ liệu giá vàng Bảo Tín Minh Châu (BTMC) từ https://giavang.org/trong-nuoc/bao-tin-minh-chau/

const axios = require("axios");
const cheerio = require("cheerio");
const moment = require("moment");
const btmc_gold_helper = require("./btmc_gold.helper"); // tự chỉnh path cho đúng

const URL = "https://giavang.org/trong-nuoc/bao-tin-minh-chau/";

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

exports.fetchGiavangOrgBTMC = async function fetchGiavangOrgBTMC() {
    // 1) Gọi trang giavang.org
    const res = await axios.get(URL, {
        timeout: 20000,
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html",
            "Referer": "https://giavang.org/",
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
    const last_update_db = await btmc_gold_helper.getLastUpdateTime();

    console.log("[GIAVANG-BTMC] last_update trang   :", last_update);
    console.log("[GIAVANG-BTMC] last_update trong DB:", last_update_db);

    if (last_update && last_update_db && last_update === last_update_db) {
        console.log("[GIAVANG-BTMC] last_update trùng DB, không crawl thêm.");
        return [];
    }

    // 4) Lấy bảng dữ liệu (bảng "Bảng giá vàng BTMC ngày ...")
    const wrapper = $(".table-responsive").first();
    const table = wrapper.find("table").first();

    if (!table || !table.length) {
        console.log("❌ [GIAVANG-BTMC] Không tìm thấy bảng trong .table-responsive");
        return [];
    }

    const items = [];
    const rows = table.find("tbody tr");
    console.log("[GIAVANG-BTMC] Số <tr> trong tbody:", rows.length);

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
            const type = cells.eq(1).text().trim();  // Vàng miếng 999.9 (24k) / Trang sức bằng Vàng Rồng Thăng Long ...
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
        // const buy = Number(buy_raw.replace(/[^\d]/g, "")) || 0;
        // const sell = Number(sell_raw.replace(/[^\d]/g, "")) || 0; const buy = Number(buy_raw.replace(/[^\d]/g, "")) || 0;
        const buy = normalizePriceFromGiaVangOrg(buy_raw);
        const sell = normalizePriceFromGiaVangOrg(sell_raw);
        items.push({
            name,                                   // VRTL Vàng miếng 999.9 (24k) / Vàng BTMC Trang sức ... / Vàng miếng SJC 999.9 / ...
            area,                                   // "Hà Nội"
            buy_raw,
            sell_raw,
            buy,
            sell,
            date: moment().add(7, 'hours').format("YYYY-MM-DD HH:mm:ss"),
            source: URL,
            last_update,
        });
    });

    console.log("[GIAVANG-BTMC] Tổng items lấy được:", items.length);
    console.log(
        "[GIAVANG-BTMC] Thống kê theo khu vực:",
        items.reduce((acc, it) => {
            const key = it.area || "NO_AREA";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {})
    );

    return items;
};
