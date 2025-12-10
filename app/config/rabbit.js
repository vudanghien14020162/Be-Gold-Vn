// config/rabbit.js
// Kết nối RabbitMQ dùng chung (COMMONJS)

const amqplib = require("amqplib");

const RABBITMQ_URL =
    process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

let _conn = null;
let _channel = null;

async function getChannel() {
    if (_channel) return _channel;

    _conn = await amqplib.connect(RABBITMQ_URL);

    _conn.on("error", (err) => {
        console.error("[RabbitMQ] connection error:", err.message);
    });

    _conn.on("close", () => {
        console.error("[RabbitMQ] connection closed");
        _conn = null;
        _channel = null;
    });

    _channel = await _conn.createChannel();
    console.log("[RabbitMQ] Connected:", RABBITMQ_URL);

    return _channel;
}

async function assertQueue(queueName, options = {}) {
    const ch = await getChannel();
    await ch.assertQueue(queueName, {
        durable: true,
        ...options,
    });
    return ch;
}

module.exports = {
    getChannel,
    assertQueue,
};
