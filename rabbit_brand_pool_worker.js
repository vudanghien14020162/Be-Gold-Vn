// workers/rabbit_brand_pool_worker.js

require("dotenv").config();
const { getChannel, assertQueue } = require("./app/config/rabbit");
const {
    BRAND_QUEUE_NAME,
    onBrandFinishedRabbit,
} = require("./app/rabbit/syncBatchPool.rabbit.helper");
const { runBrandJob } = require("./app/rabbit/brandJob.helper");

const amqplib = require("amqplib"); // cần để tự mở connection riêng
const RABBITMQ_URL =
    process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

const WORKER_COUNT = 8; // 8 channel / 8 worker

async function startBrandPoolWorker() {
    // 1 connection duy nhất
    const conn = await amqplib.connect(RABBITMQ_URL);
    console.log("[BrandPoolWorker] Connected to RabbitMQ:", RABBITMQ_URL);

    // Đảm bảo queue tồn tại (dùng 1 channel tạm để assert)
    const tmpCh = await conn.createChannel();
    await tmpCh.assertQueue(BRAND_QUEUE_NAME, { durable: true });
    await tmpCh.close();

    for (let i = 1; i <= WORKER_COUNT; i++) {
        const ch = await conn.createChannel();
        await ch.assertQueue(BRAND_QUEUE_NAME, { durable: true });

        // mỗi channel xử lý 1 message 1 lúc
        ch.prefetch(1);

        console.log(
            `[BrandPoolWorker] Channel #${i} is consuming ${BRAND_QUEUE_NAME}...`
        );

        ch.consume(
            BRAND_QUEUE_NAME,
            async (msg) => {
                if (!msg) return;

                let payload;
                try {
                    payload = JSON.parse(msg.content.toString());
                } catch (e) {
                    console.error(
                        `[BrandPoolWorker][ch${i}] Invalid JSON:`,
                        msg.content.toString()
                    );
                    ch.ack(msg);
                    return;
                }

                const { batchId, brand } = payload;
                console.log(
                    `[BrandPoolWorker][ch${i}] Received job batch=${batchId}, brand=${brand}`
                );

                try {
                    await runBrandJob(brand);                    // crawl + insert
                    await onBrandFinishedRabbit(batchId, brand); // DECR + job cuối nếu hết
                    ch.ack(msg);
                } catch (e) {
                    console.error(
                        `[BrandPoolWorker][ch${i}] Error batch=${batchId}, brand=${brand}:`,
                        e
                    );
                    ch.nack(msg, false, true); // requeue lại cho channel khác
                }
            },
            { noAck: false }
        );
    }
}

startBrandPoolWorker().catch((e) => {
    console.error("[BrandPoolWorker] Fatal error:", e);
    process.exit(1);
});
