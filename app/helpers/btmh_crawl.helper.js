const axios                 = require('axios');
const cheerio = require('cheerio');
const moment = require("moment");
const btmh_gold_helper                = require("./btmh_gold.helper");

exports.crawlDataBTMHHelper = async function crawlDataBTMHHelper() {
    const url = "https://baotinmanhhai.vn/gia-vang-hom-nay";
    const res = await axios.get(url, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        },
    });
    const $ = cheerio.load(res.data);
    const toNumber = (s) => {
        if (!s) return 0;
        const num = Number(String(s).replace(/[^0-9]/g, ""));
        return isNaN(num) ? 0 : num;
    };
    // Lấy thời gian cập nhật
    const bodyText = $("body").text().replace(/\s+/g, " ");
    const m = bodyText.match(/Cập (?:nhập|nhật) lúc\s*([0-9: ]+\d{2}\/\d{2}\/\d{4})/);
    const updatedAt = m ? m[1].trim() : null;
    const last_update = await btmh_gold_helper.getLastUpdateTime();
    if(updatedAt == last_update) {
        return 1;
    }else {
        let area = "Toàn quốc";
        // Tìm đúng bảng
        let targetTable = null;
        $("table").each((_, table) => {
            const header = $(table).find("tr").first().text();
            if (/LOẠI VÀNG/i.test(header) && /MUA VÀO/i.test(header) && /BÁN RA/i.test(header)) {
                targetTable = $(table);
                return false;
            }
        });

        if (!targetTable) {
            return { updated_at: null, items: [] };
        }
        const items = [];
        targetTable.find("tbody tr").each((_, row) => {
            const tds = $(row).find("td");
            if (tds.length < 1) return;
            let name = "";
            let buyRaw = "";
            let sellRaw = "";

            if (tds.length >= 4) {
                // Cột thứ 2 là "tuổi vàng 999.9"
                const name1 = $(tds[0]).text().trim();
                const age = $(tds[1]).text().trim(); // 999.9 hoặc trống
                name = `${name1} ${age}`.trim();
                buyRaw = $(tds[2]).text().trim();
                sellRaw = $(tds[3]).text().trim();
            } else {
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
                date: moment().add(7, 'hours').format("YYYY-MM-DD HH:mm:ss"),
                source: url,
                last_update: updatedAt,
                area: area
            });
        });
        return items;
    }
}




