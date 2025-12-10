// workers/rabbit_sync_all_worker.js

require("dotenv").config();
const { getChannel, assertQueue } = require("./app/config/rabbit");
const { FINAL_QUEUE_NAME } = require("./app/rabbit/syncBatch.rabbit.helper");
const { runFinalSync } = require("./app/rabbit/finalSync.helper");

async function startRabbitSyncAllWorker() {
    const ch = await getChannel();

    await assertQueue(FINAL_QUEUE_NAME);
    ch.prefetch(1);

    console.log("[RabbitSyncAllWorker] Waiting in", FINAL_QUEUE_NAME);

    ch.consume(
        FINAL_QUEUE_NAME,
        async (msg) => {
            if (!msg) return;

            let payload;
            try {
                payload = JSON.parse(msg.content.toString());
            } catch (e) {
                console.error(
                    "[RabbitSyncAllWorker] Invalid JSON:",
                    msg.content.toString()
                );
                ch.ack(msg);
                return;
            }

            const { batchId } = payload;
            console.log(
                "[RabbitSyncAllWorker] Start final sync for batch:",
                batchId
            );

            try {
                await runFinalSync(batchId);
                ch.ack(msg);
            } catch (e) {
                console.error("[RabbitSyncAllWorker] Error:", e);
                ch.nack(msg, false, true);
            }
        },
        { noAck: false }
    );
}

startRabbitSyncAllWorker().catch((e) => {
    console.error("[RabbitSyncAllWorker] Fatal error:", e);
    process.exit(1);
});
