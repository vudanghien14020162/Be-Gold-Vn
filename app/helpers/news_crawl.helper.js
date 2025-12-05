// baomoi_news.helper.js
const axios   = require("axios");
const cheerio = require("cheerio");
const moment  = require("moment");

// CHỈ CRAWL – không insert DB, không gọi helper khác
exports.crawlDataBaoMoiNewsHelper = async function crawlDataBaoMoiNewsHelper() {
    const TAG_URL = "https://baomoi.com/gia-vang-tag12704.epi";

    // 1) Gọi trang tag
    const res = await axios.get(TAG_URL, {
        headers: {
            // chỉ ASCII, không dấu để tránh ERR_INVALID_CHAR
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept":
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        timeout: 20000,
    });

    const $ = cheerio.load(res.data);

    // Hàm parse datetime từ thuộc tính dateTime (ISO) hoặc fallback now
    const parseDateTime = (dtText, relativeText) => {
        if (dtText) {
            const m = moment(dtText);
            if (m.isValid()) {
                return m.format("YYYY-MM-DD HH:mm:ss");
            }
        }
        // fallback nếu cần tính từ "7 giờ", "30 phút"
        if (relativeText) {
            const m = relativeText.match(/(\d+)\s*(phút|giờ)/i);
            if (m) {
                const value = parseInt(m[1], 10);
                const unit = m[2].toLowerCase().includes("phút") ? "minutes" : "hours";
                return moment()
                    .subtract(value, unit)
                    .format("YYYY-MM-DD HH:mm:ss");
            }
        }
        return moment().format("YYYY-MM-DD HH:mm:ss");
    };

    const items = [];
    const seen  = new Set();
    const now   = moment().format("YYYY-MM-DD HH:mm:ss");

    // 2) Mỗi bài là một .bm-card (như HTML bạn gửi)
    $(".bm-card").each((_, card) => {
        const $card = $(card);

        // 2.1 Thời gian: chỉ lấy bài có "X giờ" hoặc "Y phút"
        const $time = $card.find("time.content-time").first();
        if (!$time.length) return;

        const timeText = $time.text().trim();            // vd: "7 giờ"
        const dtAttr   = $time.attr("datetime") || $time.attr("dateTime") || "";

        if (!/\d+\s*(phút|giờ)/i.test(timeText)) {
            // không phải "mấy giờ trước" thì bỏ
            return;
        }

        const last_update = parseDateTime(dtAttr, timeText);

        // 2.2 Tiêu đề + link
        const $titleLink = $card.find(".bm-card-header h3 a").first();
        if (!$titleLink.length) return;

        const title = $titleLink.text().trim();
        let href    = $titleLink.attr("href") || "";

        if (!title || !href) return;

        if (!href.startsWith("http")) {
            href = "https://baomoi.com" + href;
        }
        if (seen.has(href)) return;
        seen.add(href);

        // 2.3 Ảnh: lấy img trong .bm-card-image
        const $img = $card.find(".bm-card-image img").first();
        let img = $img.attr("src") || null;
        if (img) {
            if (img.startsWith("//")) {
                img = "https:" + img;
            } else if (img.startsWith("/")) {
                img = "https://baomoi.com" + img;
            }
        }

        // 2.4 Mô tả: <p class="description">
        let desc = $card.find("p.description").first().text().trim();
        if (!desc) {
            desc = title;
        }

        items.push({
            title:       title,
            content:     desc,
            links:       href,          // link bài
            images:      img,           // link ảnh
            last_update: last_update,   // lấy từ dateTime hoặc "mấy giờ trước"
            status:      1,
            deleted:     0,
            created_at:  now,
            // nếu cần thêm updated_at, company_id, gold_id thì thêm ở chỗ insert DB
        });
    });

    return items;
};
