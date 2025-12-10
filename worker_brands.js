// workers/worker_brands.js

require("dotenv").config();
const app = require("./app/config/app");
const { BRAND_QUEUES, onBrandFinished } = require("./app/rabbit/syncBatch.helper");
const { runBrandJob } = require("./app/rabbit/brandJob.helper");

Object.entries(BRAND_QUEUES).forEach(([brand, queue]) => {
    queue.on("ready", function () {
        console.log(`[BrandWorker] Listening queue for brand ${brand}...`);

        // có thể truyền concurrency > 1 nếu muốn
        queue.process(async function (job, done) {
            const { batchId } = job.data || {};
            console.log(
                `[BrandWorker][${brand}] processing job, batch=${batchId}`,
                job.data
            );

            try {
                await runBrandJob(brand);
                await onBrandFinished(batchId, brand);
                done();
            } catch (e) {
                console.error(
                    `[BrandWorker][${brand}] ERROR batch=${batchId}:`,
                    e
                );
                done(e); // Bee-Queue sẽ đánh lỗi, tuỳ cấu hình retry
            }
        });
    });
});

console.log("[BrandWorker] Registered all brand queues.");
