// producers/gold_producer.js
require("dotenv").config();
const { Kafka } = require("kafkajs");
const Redis = require("ioredis");

const kafka = new Kafka({
    clientId: "gold-producer",
    brokers: [process.env.KAFKA_BROKER],
});

const producer = kafka.producer();
const redis = new Redis(process.env.REDIS_HOST);

async function createGoldBatch(brands) {
    const batchId = Date.now();

    await redis.set(`batch:${batchId}`, brands.length);

    await producer.connect();

    for (const brand of brands) {
        await producer.send({
            topic: "gold-topic",
            messages: [
                {
                    value: JSON.stringify({ batchId, brand }),
                },
            ],
        });
    }

    console.log("[Producer] Batch created:", batchId);
}

module.exports = { createGoldBatch };