require('dotenv').config();
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.DB_MONGODB_ENABLE && parseInt(process.env.DB_MONGODB_ENABLE) === 1) {
    const { connectMongo } = require("./app/config/mongo");
    (async () => {
        await connectMongo();
        console.log("🚀 Atlas MongoDB READY → Starting API + Queues...");
    })();
}

app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});

app.get("/", (req, res) => {
  res.json({ message: "Welcome to api Gold (nodejs version)" });
});
require("./app/routes/api.app.routes")(app);
// set time zone
process.env.TZ = "Asia/Ho_Chi_Minh";
// console.log("Now is: ", new Date().toString());
// set port, listen for requests
//console.log("port:", process.env.PORT);
const IP_SERVER = process.env.IP_SERVER || 8083;
const PORT = process.env.PORT || 8083;
app.listen(PORT, () => {
  console.log(`Server is running app on http://${IP_SERVER}:${PORT}.`);
});
