
const { getDb } = require("../../config/mongo");

/**
 * Lấy danh sách công ty vàng từ MongoDB
 */
exports.getAllCompany = async function (lang = "") {
    try {
        const db = getDb();
        const col = db.collection("company");

        const rows = await col
            .find({}, { projection: { _id: 0 } }) // Bỏ _id nếu không cần
            .sort({ id: 1 })
            .toArray();

        return rows.length ? rows : [];
    } catch (err) {
        console.log("❌ EX getAllCompany Mongo:", err);
        return [];
    }
};
