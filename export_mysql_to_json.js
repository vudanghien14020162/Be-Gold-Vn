require('dotenv').config();
const express = require("express");
const cors = require("cors");
const { Sequelize, QueryTypes } = require("sequelize");
const fs = require("fs").promises;
const path = require("path");
const app               = require("./app/config/app");
const sequelize         = app.sequelize;

// ================== DANH SÁCH BẢNG CẦN EXPORT ==================
const OUTPUT_DIR = path.join(__dirname, "json_export");

const TABLES = [
    { table: "company", file: "company.json" },
    { table: "gold_price", file: "gold_price.json" },
    { table: "log_crawl_btmc", file: "log_crawl_btmc.json" },
    { table: "log_crawl_btmh", file: "log_crawl_btmh.json" },
    { table: "log_crawl_doji", file: "log_crawl_doji.json" },
    { table: "log_crawl_mi_hong", file: "log_crawl_mi_hong.json" },
    { table: "log_crawl_ngoc_tham", file: "log_crawl_ngoc_tham.json" },
    { table: "log_crawl_phu_quy", file: "log_crawl_phu_quy.json" },
    { table: "log_crawl_pnj", file: "log_crawl_pnj.json" },
    { table: "log_crawl_sjc", file: "log_crawl_sjc.json" },
];

// ================== HÀM HỖ TRỢ ==================
async function ensureOutputDir() {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

// Export 1 bảng ra file JSON dạng mảng (dùng được với mongoimport --jsonArray)
async function exportTable(tableName, fileName) {
    console.log(`⏳ Exporting table ${tableName} ...`);

    const rows = await sequelize.query(`SELECT * FROM \`${tableName}\``, {
        type: QueryTypes.SELECT,
    });

    const jsonContent = JSON.stringify(rows, null, 2);
    const filePath = path.join(OUTPUT_DIR, fileName);
    await fs.writeFile(filePath, jsonContent, "utf8");

    console.log(`✅ Done ${tableName} -> ${fileName} (rows: ${rows.length})`);
}

// ================== MAIN ==================
async function main() {
    try {
        await ensureOutputDir();

        await sequelize.authenticate();
        console.log("✅ Connected MySQL thành công (Sequelize replication).");

        for (const cfg of TABLES) {
            await exportTable(cfg.table, cfg.file);
        }

        await sequelize.close();
        console.log("🎉 Tất cả bảng đã export vào thư mục json_export/");
        console.log("Dùng mongoimport với --jsonArray để import vào MongoDB.");
    } catch (err) {
        console.error("❌ Error:", err);
        try {
            await sequelize.close();
        } catch (_) {}
        process.exit(1);
    }
}

main();
