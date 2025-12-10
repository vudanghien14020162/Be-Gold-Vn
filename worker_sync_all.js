// workers/worker_sync_all.js

require("dotenv").config();
const app = require("./app/config/app");
const { runFinalSync } = require("./app/rabbit/finalSync.helper");

const queue_syn_all_data_crawl = app.queue_syn_all_data_crawl;

queue_syn_all_data_crawl.on("ready", function () {
    console.log("[SyncAllWorker] Listening queue_syn_all_data_crawl...");

    queue_syn_all_data_crawl.process(async function (job, done) {
        const { batchId } = job.data || {};
        console.log(
            "[SyncAllWorker] processing final job for batch:",
            batchId,
            job.data
        );

        try {
            await runFinalSync(batchId);
            done();
        } catch (e) {
            console.error("[SyncAllWorker] ERROR:", e);
            done(e);
        }
    });
});

console.log("[SyncAllWorker] Registered processor for queue_syn_all_data_crawl");
