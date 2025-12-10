// helpers/syncBatch.rabbit.helper.js (bản 1 queue + 8 channel)

const app = require("../config/app");           // dùng redisClient hiện có
const { getChannel, assertQueue } = require("../config/rabbit");

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

const BRAND_QUEUE_NAME = "queue_brand_jobs";   // 1 queue duy nhất
const FINAL_QUEUE_NAME = "queue_sync_all";

async function createSyncBatchRabbit() {
    const batchId = Date.now().toString(); // hoặc uuid

    const remainingKey = `batch:${batchId}:remaining`;
    await app.redisClient.set(remainingKey, BRANDS.length.toString());

    const ch = await getChannel();
    await assertQueue(BRAND_QUEUE_NAME);

    for (const brand of BRANDS) {
        const payload = {
            batchId,
            brand,
            requestedAt: new Date().toISOString(),
            trigger: "api_sync_all_rabbit",
        };

        ch.sendToQueue(
            BRAND_QUEUE_NAME,
            Buffer.from(JSON.stringify(payload)),
            { persistent: true }
        );

        console.log("[syncBatchRabbit] Published job:", BRAND_QUEUE_NAME, payload);
    }

    return batchId;
}

async function onBrandFinishedRabbit(batchId, brandForLog) {
    const remainingKey = `batch:${batchId}:remaining`;

    const remaining = await app.redisClient.decr(remainingKey);
    console.log(
        `[syncBatchRabbit] batch=${batchId}, brand=${brandForLog}, remaining=${remaining}`
    );

    if (parseInt(remaining, 10) === 0) {
        const ch = await getChannel();
        await assertQueue(FINAL_QUEUE_NAME);

        const finalPayload = { batchId };

        ch.sendToQueue(
            FINAL_QUEUE_NAME,
            Buffer.from(JSON.stringify(finalPayload)),
            { persistent: true }
        );

        console.log(
            `[syncBatchRabbit] batch=${batchId} done, sent final job to ${FINAL_QUEUE_NAME}`
        );
    }
}

module.exports = {
    BRANDS,
    BRAND_QUEUE_NAME,
    FINAL_QUEUE_NAME,
    createSyncBatchRabbit,
    onBrandFinishedRabbit,
};
