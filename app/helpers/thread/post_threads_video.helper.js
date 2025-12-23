require("dotenv").config();
const axios = require("axios");

// ===============================
// CẤU HÌNH NHIỀU FOLDER ↔ NHIỀU ACCOUNT THREADS
// ===============================
// Mỗi phần tử = 1 folder Cloudinary + 1 Threads Account + 1 link base
const CONFIG = [
    {
        folder: "threads_videos",                       // Folder Cloudinary
        threadsUserId: process.env.THREADS_USER_ID_1,
        token: process.env.THREADS_ACCESS_TOKEN_1,
        linkBase: process.env.THREADS_LINK_BASE_1,   // Caption = linkBase + public_id
    },
    // Có thể thêm nhiều page khác...
    // {
    //     folder: "threads_video_nick_2",
    //     threadsUserId: process.env.THREADS_USER_ID_2,
    //     token: process.env.THREADS_ACCESS_TOKEN_2,
    //     linkBase: process.env.THREADS_LINK_BASE_2,
    // },
];

const {
    CLOUD_NAME,
    CLOUD_KEY,
    CLOUD_SECRET,
} = process.env;

function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
}

// ===============================
// CAPTIONS VUI VẺ + EMOJI
// ===============================
const CAPTIONS = [
    // Vui vẻ / chill
    "Hôm nay đăng chút cho vui ✨",
    "Tâm trạng nhẹ như mây 😌",
    "Đăng chơi cho đời bớt chán 😆",
    "Cuộc sống vui là được 😁",
    "Một chút chill giữa cuộc đời xô bồ ☁️",
    "Không biết post gì nên post đại 😌",
    "Thấy vui nên đăng, vậy thôi 🤭",
    "Tấm này dễ thương nên phải đăng 😄",

    // Hài hước
    "Đăng cho Threads nhớ tôi 😂",
    "Mood hôm nay: ổn áp 😌",
    "Crush chưa rep nhưng tôi vẫn đăng 😆",
    "Đời thì mệt nhưng tôi thì không… lắm 🤣",
    "Đăng lên cho vui, ai coi thì coi 😁",
    "Không biết làm gì nên lên đây phá chút 😆",
    "Nội dung không có, đăng cho sang 🤭",
    "Tới công chuyện rồi 😳",

    // Dễ thương
    "Chúc bạn một ngày thật xinh đẹp ✨",
    "Mong hôm nay bạn được bình yên 🎀",
    "Gửi bạn chút năng lượng dễ thương 💛",
    "Cười lên cho đời tươi nha 😁",
    "Hôm nay nhẹ nhàng thôi 🌿",
    "Hy vọng bạn cũng vui như mình 🤍",

    // Trend Threads – ngắn – chất
    "Up cái cho vui 😆",
    "Nay như này nè 👀",
    "Ổn nha ✨",
    "Hợp lý 👍",
    "Vậy đó 😌",
    "Không nói nhiều 😎",
    "Tới luôn bạn êi 🔥",
    "Đăng cho có tương tác 😂",
    "Done nhe ✌️",

    // Random vibes
    "Ngu gì không đăng 😆",
    "Ai rảnh thì coi, ai bận thì coi sau 🤣",
    "Đời là bể khổ, đăng hình cho đỡ khổ 😌",
    "Hôm nay cũng thường thôi nhưng tôi thích 🤭",
    "Một chút vui cho ngày đẹp trời ✨",

    // Ngắn gọn, hợp Threads
    "Mood: ổn ổn 😌",
    "Tới công chuyện 👀",
    "Ổn áp ✨"
];

const EMOJIS = ["😆", "✨", "😂", "💛", "🔥", "😌", "😁", "🤭"];


function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

const EXTRA_LINKS = [
    "https://s.shopee.vn/1gBmWc9TKX",
    "https://s.shopee.vn/BMyjjeYAX",
    "https://s.shopee.vn/3VdQhqEeWo",
    "https://s.shopee.vn/7AWij9Vi5o",
    "https://s.shopee.vn/3fwqWm5rDl",
    "https://s.shopee.vn/4LCWR9UUHk",
    "https://s.shopee.vn/60KkQ1T7y3",
    "https://s.shopee.vn/805oWgYF4y",
    "https://s.shopee.vn/2g4I9gvtzp",
    "https://s.shopee.vn/8zyLh6DBbD",
    "https://s.shopee.vn/9zqssiIocK",
    "https://s.shopee.vn/60Kk7Fas34",
    "https://s.shopee.vn/1LYt4K9T5d",
    "https://s.shopee.vn/AAAHXIIRzY",
    "https://s.shopee.vn/LgLfQslYm",
    "https://s.shopee.vn/7fSwOg1ZI4",
    "https://s.shopee.vn/3fwndHqWB8",
    "https://s.shopee.vn/40ZcrIzGoH",
    "https://s.lazada.vn/s.6LbUl",
    "https://s.shopee.vn/9AHhc0FFJp",
    "https://s.shopee.vn/6ptmnqaXrj",
    "https://s.shopee.vn/6VGwL40gwi",
    "https://s.shopee.vn/AKTeXfXQ77",
];

function pickRandomLink() {
    return EXTRA_LINKS[Math.floor(Math.random() * EXTRA_LINKS.length)];
}

/**
 * Build caption:
 * - Random 1 câu trong CAPTIONS
 * - Random 1 emoji
 * - Nếu có linkBase → chèn thêm link ở dòng dưới
 *   + Nếu linkBase chứa "{public_id}" → replace
 *   + Nếu không → nối linkBase + public_id
 */
function buildCaption() {
    const baseCaption = pickRandom(CAPTIONS);
    const emoji = pickRandom(EMOJIS);
    // let extraLink = "https://s.shopee.vn/1gBmWc9TKX";
    let extraLink = pickRandomLink();
    // Nếu có link → caption + emoji + xuống dòng + link
    if (extraLink) {
        return `${baseCaption} ${emoji}\n${extraLink}`;
    }
    // Không có link → chỉ caption + emoji
    return `${baseCaption} ${emoji}`;
}

// ===============================
// BƯỚC 1 — Lấy video theo FOLDER
// ===============================
async function fetchVideos(folder) {
    const url = `https://${CLOUD_KEY}:${CLOUD_SECRET}@api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/search`;

    const body = {
        expression: `resource_type:video AND folder:${folder}`,
        sort_by: [{ created_at: "asc" }], // đăng theo thứ tự từ cũ → mới
        max_results: 100,
    };

    console.log(`▶️ Lấy video từ folder: ${folder}`);
    const res = await axios.post(url, body);

    const list = res.data.resources || [];
    console.log(`   → Tìm thấy ${list.length} video`);
    return list;
}

// ===============================
// BƯỚC 2 — Đăng VIDEO LÊN THREADS
// ===============================
async function postVideo(threadsUserId, token, videoUrl, caption) {
    console.log("▶️ Tạo media container...");

    const create = await axios.post(
        `https://graph.threads.net/v1.0/${threadsUserId}/threads`,
        {
            media_type: "VIDEO",
            video_url: videoUrl,
            text: caption,
            access_token: token,
        }
    );

    const mediaId = create.data.id;
    console.log("📌 Media ID:", mediaId);

    let status = "IN_PROGRESS";

    while (status !== "FINISHED") {
        const check = await axios.get(
            `https://graph.threads.net/v1.0/${mediaId}`,
            {
                params: {
                    fields: "status",
                    access_token: token,
                },
            }
        );

        status = check.data.status;
        console.log("   ➜ Status:", status);

        if (status === "ERROR") {
            console.log("❌ Threads không xử lý được video!");
            return null;
        }

        if (status !== "FINISHED") await sleep(4000);
    }

    console.log("🎉 Xử lý xong → Publish");

    const publish = await axios.post(
        `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`,
        {
            creation_id: mediaId,
            access_token: token,
        }
    );

    console.log("✅ Đã đăng! Thread ID:", publish.data.id);
    return publish.data.id;
}

// ===============================
// XỬ LÝ CHO MỖI FOLDER
// ===============================
async function handleFolder(folder, threadsUserId, token, linkBase) {
    const videos = await fetchVideos(folder);

    if (!videos.length) {
        console.log(`⚠️ Folder ${folder} không có video`);
        return;
    }

    for (const v of videos) {
        const publicId = v.public_id;
        const videoUrl = v.secure_url;

        // 🔥 Caption: random vui vẻ + optional linkBase + public_id
        const caption = buildCaption() + "";

        console.log("======================================");
        console.log(`📌 Đăng video: ${publicId}`);
        console.log(`→ Caption:\n${caption}`);

        await postVideo(threadsUserId, token, videoUrl, caption);

        // Tránh spam API
        await sleep(2000);
    }
}

// ===============================
// MAIN
// ===============================
exports.postThreadAccount = async function postThreadAccount() {
    console.log("🚀 BẮT ĐẦU CHẠY NHIỀU PAGE THREADS");

    for (const cfg of CONFIG) {
        console.log("======================================");
        console.log(`🟦 FOLDER: ${cfg.folder}`);
        console.log(`🟩 THREADS USER: ${cfg.threadsUserId}`);

        if (!cfg.threadsUserId || !cfg.token) {
            console.log("❌ Thiếu userId hoặc token → Bỏ qua");
            continue;
        }

        await handleFolder(cfg.folder, cfg.threadsUserId, cfg.token, cfg.linkBase);
    }

    console.log("🎉 HOÀN TẤT TẤT CẢ PAGE");
}
