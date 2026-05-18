require("dotenv").config();

process.env.TZ = "Asia/Ho_Chi_Minh";

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.setHeader("Content-Type", "application/json");
    next();
});

app.get("/", (req, res) => {
    res.json({
        message: "Welcome to api Gold (nodejs version)"
    });
});

require("./app/routes/api.app.routes")(app);

const IP_SERVER = process.env.IP_SERVER || "localhost";
const PORT = process.env.PORT || 8083;

async function bootstrap() {
    try {
        const mongoEnable = parseInt(process.env.DB_MONGODB_ENABLE || "0", 10) === 1;

        if (mongoEnable) {
            const { connectMongo } = require("./app/config/mongo");

            await connectMongo();

            // console.log("🚀 Atlas MongoDB READY → Starting API + Queues...");
        }

        app.listen(PORT, () => {
            console.log(
                `Server is running app on http://${IP_SERVER}:${PORT}.`
            );
        });
    } catch (err) {
        console.error("❌ Server start failed:", err);
        process.exit(1);
    }
}

bootstrap();