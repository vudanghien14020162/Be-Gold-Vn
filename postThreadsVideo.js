// postThreadsFromCloudinary.js
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
    // {
    //     folder: "page2",
    //     threadsUserId: process.env.THREADS_USER_ID_2,
    //     token: process.env.THREADS_ACCESS_TOKEN_2,
    //     linkBase: process.env.THREADS_LINK_BASE_2,
    // },
    // Thêm nhiều page tuỳ ý
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

        // Caption = linkBase + public_id
        const caption = 'https://s.shopee.vn/3fwqWm5rDl';

        console.log("======================================");
        console.log(`📌 Đăng video: ${publicId}`);
        console.log(`→ Link caption: ${caption}`);

        await postVideo(threadsUserId, token, videoUrl, caption);

        // Tránh spam API
        await sleep(2000);
    }
}

// ===============================
// MAIN
// ===============================
async function run() {
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

run();
