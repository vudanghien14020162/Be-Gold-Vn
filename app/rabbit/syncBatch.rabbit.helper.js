// helpers/syncBatch.rabbit.helper.js

const app = require("../config/app");           // dùng redisClient hiện tại
const { getChannel, assertQueue } = require("../config/rabbit");

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

// Tên queue RabbitMQ
const BRAND_QUEUE_NAMES = {
    SJC: "queue_sjc",
    DOJI: "queue_doji",
    PNJ: "queue_pnj",
    BTMC: "queue_btmc",
    BTMH: "queue_btmh",
    PHU_QUY: "queue_phu_quy",
    MI_HONG: "queue_mi_hong",
    NGOC_THAM: "queue_ngoc_tham",
};

const FINAL_QUEUE_NAME = "queue_sync_all";

/**
 * API dùng: tạo batchId, set remaining = 8, đẩy 8 job brand vào RabbitMQ
 */
async function createSyncBatchRabbit() {
    const batchId = Date.now().toString(); // hoặc uuid

    const remainingKey = `batch:${batchId}:remaining`;

    // set số brand phải xử lý
    await app.redisClient.set(remainingKey, BRANDS.length.toString());

    const ch = await getChannel();

    for (const brand of BRANDS) {
        const queueName = BRAND_QUEUE_NAMES[brand];
        if (!queueName) {
            console.warn("[syncBatchRabbit] missing queueName for brand:", brand);
            continue;
        }

        await assertQueue(queueName);

        const payload = {
            batchId,
            brand,
            requestedAt: new Date().toISOString(),
            trigger: "api_trigger_sync_all_rabbit",
        };

        ch.sendToQueue(queueName, Buffer.from(JSON.stringify(payload)), {
            persistent: true,
        });

        console.log("[syncBatchRabbit] Published job:", queueName, payload);
    }

    return batchId;
}

/**
 * Worker brand gọi:
 * - giảm remaining trong Redis
 * - nếu remaining == 0 => publish job cuối vào queue_sync_all
 */
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
    BRAND_QUEUE_NAMES,
    FINAL_QUEUE_NAME,
    createSyncBatchRabbit,
    onBrandFinishedRabbit,
};
