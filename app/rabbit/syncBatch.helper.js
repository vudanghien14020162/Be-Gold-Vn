// helpers/syncBatch.helper.js

const app = require("../config/app");

// Danh sách brand
const BRANDS = [
    "SJC",
    "DOJI",
    "PNJ",
    "BTMC",
    "BTMH",
    "PHU_QUY",
    "MI_HONG",
    "NGOC_THAM",
];

// Map brand -> queue Bee-Queue đã khai báo trong config/app.js
const BRAND_QUEUES = {
    SJC: app.queue_crawl_data_sjc,
    DOJI: app.queue_crawl_data_doji,
    PNJ: app.queue_crawl_data_pnj,
    BTMC: app.queue_crawl_data_btmc,
    BTMH: app.queue_crawl_data_btmh,
    PHU_QUY: app.queue_crawl_data_phu_quy,
    MI_HONG: app.queue_crawl_data_mi_hong,
    NGOC_THAM: app.queue_crawl_data_ngoc_tham,
};

// Queue cuối cùng để syncAll + news
const FINAL_QUEUE = app.queue_syn_all_data_crawl;

/**
 * API gọi hàm này:
 * - Tạo batchId
 * - Set Redis remaining = 8
 * - Đẩy 8 job vào 8 queue brand tương ứng
 */
async function createSyncBatch() {
    const batchId = Date.now().toString(); // hoặc dùng uuid

    const remainingKey = `batch:${batchId}:remaining`;

    // set số brand phải xử lý
    await app.redisClient.set(remainingKey, BRANDS.length.toString());

    for (const brand of BRANDS) {
        const queue = BRAND_QUEUES[brand];
        if (!queue) {
            console.warn("[syncBatch] No queue defined for brand:", brand);
            continue;
        }

        const payload = {
            batchId,
            brand,
            requestedAt: new Date().toISOString(),
            trigger: "api_trigger_sync_all",
        };

        // Bee-Queue: tạo job
        await queue.createJob(payload).save();
        console.log("[syncBatch] Published job:", brand, payload);
    }

    return batchId;
}

/**
 * Worker brand gọi hàm này sau khi xử lý xong 1 brand:
 * - DECR Redis remaining
 * - Nếu remaining == 0 -> đẩy 1 job vào queue_syn_all_data_crawl
 */
async function onBrandFinished(batchId, brandForLog = "") {
    const remainingKey = `batch:${batchId}:remaining`;

    const remaining = await app.redisClient.decr(remainingKey);
    console.log(
        `[syncBatch] batch=${batchId}, brand=${brandForLog}, remaining=${remaining}`
    );

    if (parseInt(remaining, 10) === 0) {
        const finalPayload = { batchId };

        FINAL_QUEUE.createJob(finalPayload).save();
        console.log(
            `[syncBatch] batch=${batchId} done, sent final job to queue_syn_all_data_crawl`
        );
    }
}

module.exports = {
    BRANDS,
    BRAND_QUEUES,
    FINAL_QUEUE,
    createSyncBatch,
    onBrandFinished,
};
