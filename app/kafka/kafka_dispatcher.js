// workers/kafka_dispatcher.js
require("dotenv").config();
const { Kafka } = require("kafkajs");
const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_HOST);

const kafka = new Kafka({
    clientId: "dispatcher",
    brokers: [process.env.KAFKA_BROKER],
});

const consumer = kafka.consumer({ groupId: "gold-group" });

const STREAM = "gold-stream";

async function start() {
    await consumer.connect();
    await consumer.subscribe({ topic: "gold-topic" });

    await consumer.run({
        eachMessage: async ({ message }) => {
            const payload = JSON.parse(message.value.toString());

            await redis.xadd(
                STREAM,
                "*",
                "data",
                JSON.stringify(payload)
            );

            console.log("[Dispatcher] pushed to Redis");
        },
    });
}

start();