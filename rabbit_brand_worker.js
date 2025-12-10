// workers/rabbit_brand_worker.js

require("dotenv").config();
const { getChannel, assertQueue } = require("./app/config/rabbit");
const {
    BRAND_QUEUE_NAMES,
    onBrandFinishedRabbit,
} = require("./app/rabbit/syncBatch.rabbit.helper");
const { runBrandJob } = require("./app/rabbit/brandJob.helper");

async function startRabbitBrandWorker() {
    const ch = await getChannel();

    // assert 8 queue brand
    for (const queueName of Object.values(BRAND_QUEUE_NAMES)) {
        await assertQueue(queueName);
    }

    // mỗi consumer 1 message 1 lúc, nhưng nhiều queue -> vẫn song song
    ch.prefetch(1);

    console.log("[RabbitBrandWorker] Listening brand queues...");

    Object.entries(BRAND_QUEUE_NAMES).forEach(([brand, queueName]) => {
        ch.consume(
            queueName,
            async (msg) => {
                if (!msg) return;

                let payload;
                try {
                    payload = JSON.parse(msg.content.toString());
                } catch (e) {
                    console.error(
                        `[RabbitBrandWorker][${brand}] Invalid JSON:`,
                        msg.content.toString()
                    );
                    ch.ack(msg);
                    return;
                }

                const { batchId } = payload;
                console.log(
                    `[RabbitBrandWorker][${brand}] Received job batch=${batchId}`,
                    payload
                );

                try {
                    await runBrandJob(brand);
                    await onBrandFinishedRabbit(batchId, brand);
                    ch.ack(msg);
                } catch (e) {
                    console.error(
                        `[RabbitBrandWorker][${brand}] Error batch=${batchId}:`,
                        e
                    );
                    // tuỳ chiến lược; tạm retry
                    ch.nack(msg, false, true);
                }
            },
            { noAck: false }
        );
    });
}

startRabbitBrandWorker().catch((e) => {
    console.error("[RabbitBrandWorker] Fatal error:", e);
    process.exit(1);
});
