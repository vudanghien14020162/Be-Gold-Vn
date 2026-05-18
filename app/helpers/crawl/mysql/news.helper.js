// news.helper.js
const app          = require("../config/app");
const sequelize    = app.sequelize;
const moment       = require("moment");
const { QueryTypes } = require("sequelize");

const DEFAULT_TABLE_NEWS = "news";

/**
 * Chèn danh sách news (từ BaoMoi) vào bảng news
 *
 * datas: array item từ crawlDataBaoMoiNewsHelper()
 *  - title
 *  - content
 *  - links
 *  - images
 *  - last_update
 *  - status
 *  - deleted
 *  - created_at (optional)
 *  - company_id (optional, default null)
 *  - gold_id (optional, default null)
 */
exports.insertNewsBaoMoi = async function insertNewsBaoMoi(datas, table = DEFAULT_TABLE_NEWS) {
    try {
        if (datas && datas.length) {
            const now = moment().format("YYYY-MM-DD HH:mm:ss");

            const values = datas
                .map((r) => {
                    const title       = r.title || "";
                    const content     = r.content || "";
                    const links       = r.links || "";
                    let   images      = r.images || null;
                    const lastUpdate  = r.last_update || now;
                    const status      = typeof r.status !== "undefined" ? r.status : 1;
                    const deleted     = typeof r.deleted !== "undefined" ? r.deleted : 0;
                    const createdAt   = r.created_at || now;
                    // chuẩn hoá images: nếu chuỗi rỗng thì để null
                    if (images === "") {
                        images = null;
                    }

                    return `(
                        ${sequelize.escape(title)},
                        ${sequelize.escape(content)},
                        ${sequelize.escape(lastUpdate)},
                        ${images === null ? "NULL" : sequelize.escape(images)},
                        ${sequelize.escape(links)},
                        ${status},
                        ${deleted},
                        ${sequelize.escape(createdAt)}
                       
                    )`;
                })
                .join(",");

            const sql = `
                INSERT INTO ${table}
                    (title, content,
                     last_update, images, links,
                     status, deleted, created_at)
                VALUES ${values};
            `;

            const [result] = await sequelize.query(sql, { type: QueryTypes.INSERT });
            return result ? result : false;
        }

        return false;
    } catch (e) {
        console.log("EX insertNewsBaoMoi", e);
        return false;
    }
};

/**
 * Lấy last_update mới nhất trong bảng news
 * (để sau này bạn truyền vào crawl nếu muốn chỉ lấy tin mới hơn)
 */
exports.getLastUpdateTimeNews = async (table = DEFAULT_TABLE_NEWS) => {
    try {
        const result = await sequelize.query(
            `
            SELECT last_update
            FROM ${table}
            ORDER BY last_update DESC, id DESC
            LIMIT 1
            `,
            {
                type: QueryTypes.SELECT,
            }
        );

        if (result && result.length > 0) {
            const data = result[0].last_update;
            console.log("[getLastUpdateTimeNews] last_update:", data);
            return data;
        }

        return null;
    } catch (e) {
        console.log("Ex getLastUpdateTimeNews", e);
        return null;
    }
};
