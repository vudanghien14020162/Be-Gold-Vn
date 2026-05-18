const axios                 = require('axios');
const fs = require('fs');
const cheerio = require('cheerio');
const TOKEN_URL = 'https://api.vnappmob.com/api/request_api_key?scope=gold';
const BASE_URL = 'https://api.vnappmob.com/api/v2/gold';

const TOKEN_FILE = './token_gold.json';

exports.getData = async function() {
    //get to redis cached
    const key_redis = 'get_data_gold' ;
    let cached_data = await app.getCache(key_redis);
    if (cached_data) {
        let data = JSON.parse(cached_data);
        if(!data || Object.keys(data).length === 0){
            return null;
        }
        return data;
    } else {
        let dataResponse = null;
        let dataGold = await this.getDataGold();
        if(dataGold.length > 0){
            dataResponse = dataGold;
        }
        await app.setCache(key_redis, dataResponse);
        return dataResponse;
    }
};


exports.getDataGold = async function (){
    let dataCallServer = await this.callDataServer();
    let data = [];
    if(dataCallServer){
        for(let i = 0; i < dataCallServer.length; i++){
            if(i < 40){
                let objectData = await this.getStrGold(dataCallServer[i]);
                console.log("objectData", objectData);
                if(objectData) data.push(objectData);
            }
        }
    }
    return data;
}
exports.callDataServer = async function() {
    let url = "http://api.btmc.vn/api/BTMCAPI/getpricebtmc?key=3kd8ub1llcg9t45hnoh8hmn7t5kc2v"
    let config = {
        method: 'get',
        url: url
    };
    let res = await axios(config);
    if(Number(res.status) === 200){
        let data = res.data.DataList.Data;
        console.log("Data", data);
        return data;
    }else {
        console.log("Không lấy dc dữ liệu")
        return -1;
    }
}

exports.getStrGold = async function (data){
    let objectString = Object.values(data);
    let object = null;
    if(objectString){
        object = {};
        // object.title = removeAccents(objectString[1]);
        // object.priceBuying = removeAccents(objectString[5]);
        // object.priceSell = removeAccents(objectString[4]);
        object.title = objectString[1];
        object.priceBuying = objectString[5];
        object.priceSell = objectString[4];
    }
    return object;
}

function removeAccents(str) {
    var AccentsMap = [
        "aàảãáạăằẳẵắặâầẩẫấậ",
        "AÀẢÃÁẠĂẰẲẴẮẶÂẦẨẪẤẬ",
        "dđ", "DĐ",
        "eèẻẽéẹêềểễếệ",
        "EÈẺẼÉẸÊỀỂỄẾỆ",
        "iìỉĩíị",
        "IÌỈĨÍỊ",
        "oòỏõóọôồổỗốộơờởỡớợ",
        "OÒỎÕÓỌÔỒỔỖỐỘƠỜỞỠỚỢ",
        "uùủũúụưừửữứự",
        "UÙỦŨÚỤƯỪỬỮỨỰ",
        "yỳỷỹýỵ",
        "YỲỶỸÝỴ"
    ];
    for (var i=0; i<AccentsMap.length; i++) {
        var re = new RegExp('[' + AccentsMap[i].substr(1) + ']', 'g');
        var char = AccentsMap[i][0];
        str = str.replace(re, char);
    }
    return str;
}

// ----------------------------
// Đọc token từ file
// ----------------------------
function loadToken() {
    if (!fs.existsSync(TOKEN_FILE)) return null;

    try {
        const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
        if (!data.token || !data.expires_at) return null;
        return data;
    } catch {
        return null;
    }
}

// ----------------------------
// Lưu token vào file
// ----------------------------
function saveToken(token, expiresAt) {
    fs.writeFileSync(
        TOKEN_FILE,
        JSON.stringify({ token, expires_at: expiresAt }, null, 2)
    );
}

// ----------------------------
// Xin token mới từ API
// ----------------------------
async function requestNewToken() {
    const res = await axios.get(TOKEN_URL);

    if (!res.data.results) {
        throw new Error('Không xin được API key mới');
    }

    const token = res.data.results;
    const expiresAt = Date.now() + 15 * 24 * 60 * 60 * 1000; // 15 ngày

    saveToken(token, expiresAt);

    console.log('🔥 Token mới đã được tạo & lưu!');
    return token;
}

// ----------------------------
// Lấy token hợp lệ
// ----------------------------
exports.getValidToken = async function getValidToken() {
    const data = loadToken();

    if (!data) {
        return await requestNewToken();
    }

    if (Date.now() >= data.expires_at) {
        console.log('⚠ Token hết hạn → xin mới…');
        return await requestNewToken();
    }

    return data.token;
}

async function getValidToken() {
    const data = loadToken();

    if (!data) {
        return await requestNewToken();
    }

    if (Date.now() >= data.expires_at) {
        console.log('⚠ Token hết hạn → xin mới…');
        return await requestNewToken();
    }

    return data.token;
}

// ----------------------------
// Lấy dữ liệu 1 brand
// ----------------------------
exports.fetchBrand = async function fetchBrand(brand, token, options = {}) {
    const url = `${BASE_URL}/${brand}`;

    const res = await axios.get(url, {
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
        params: options,
    });

    return res.data?.results || [];
}

async function fetchBrand(brand, token, options = {}) {
    const url = `${BASE_URL}/${brand}`;

    const res = await axios.get(url, {
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
        params: options,
    });

    return res.data?.results || [];
}

exports.fetchAllGoldVN = async function fetchAllGoldVN(options = {}) {
    const token = await getValidToken();
    const data = {};
    const BRANDS = ['sjc', 'doji', 'pnj'];
    for (const brand of BRANDS) {
        try {
            data[brand] = await fetchBrand(brand, token, options);
        } catch (err) {
            console.error(`❌ Lỗi khi lấy ${brand}:`, err.response?.data || err.message);
            data[brand] = null;
        }
    }

    return data;
}

// exports.fetchDojiPrices = async function fetchDojiPrices() {
//     const DOJI_URL = 'https://giavang.doji.vn/';
//     // Fake User-Agent cho giống trình duyệt thật
//     const res = await axios.get(DOJI_URL, {
//         headers: {
//             'User-Agent':
//                 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
//         },
//     });
//
//     const html = res.data;
//     const $ = cheerio.load(html);
//
//     // Lấy dòng "Cập nhập lúc: 08:51 24/11/2025"
//     const updatedText = $('body').text();
//     const updatedMatch = updatedText.match(/Cập nhập lúc:\s*([0-9: ]+\d{2}\/\d{2}\/\d{4})/);
//     const updatedAt = updatedMatch ? updatedMatch[1].trim() : null;
//
//     const regions = [];
//
//     // Tùy cấu trúc thật của trang, có thể là h2 hoặc h3
//     $('h2, h3').each((_, el) => {
//         const title = $(el).text().trim();
//
//         // Ví dụ: "Bảng giá tại Hà Nội", "Bảng giá tại Đà Nẵng", ...
//         if (title.startsWith('Bảng giá tại')) {
//             const regionName = title.replace('Bảng giá tại', '').trim();
//
//             // Giả sử ngay sau heading là 1 table chứa dữ liệu
//             const table = $(el).next('table');
//             const items = [];
//
//             table.find('tbody tr').each((_, row) => {
//                 const tds = $(row).find('td');
//                 if (tds.length >= 3) {
//                     const type = $(tds[0]).text().trim(); // Loại
//                     const buyStr = $(tds[1]).text().trim(); // Mua vào
//                     const sellStr = $(tds[2]).text().trim(); // Bán ra
//
//                     // Bỏ dấu phẩy, chấm, parse số (nếu cần)
//                     const toNumber = (s) =>
//                         Number(String(s).replace(/\./g, '').replace(/,/g, '').trim()) || null;
//
//                     items.push({
//                         type,
//                         buy_raw: buyStr,
//                         sell_raw: sellStr,
//                         buy: toNumber(buyStr),
//                         sell: toNumber(sellStr),
//                     });
//                 }
//             });
//
//             if (items.length > 0) {
//                 regions.push({
//                     region: regionName,
//                     items,
//                 });
//             }
//         }
//     });
//
//     return {
//         source: DOJI_URL,
//         updated_at: updatedAt, // ví dụ: "08:51 24/11/2025"
//         regions,
//     };
// }
exports.fetchDojiPrices = async function fetchDojiPrices() {
    const DOJI_URL = 'https://giavang.doji.vn/';

    const res = await axios.get(DOJI_URL, {
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        },
    });

    const html = res.data;
    const $ = cheerio.load(html);

    // Lấy dòng "Cập nhập lúc: 12:07 26/11/2025"
    const updatedText = $('body').text();
    const updatedMatch = updatedText.match(/Cập (nhập|nhật) lúc:\s*([0-9: ]+\d{2}\/\d{2}\/\d{4})/);
    const updatedAt = updatedMatch ? updatedMatch[2].trim() : null;

    // Hàm parse số: "15,140" -> 15140 (nghìn/chỉ)
    // nếu bạn muốn ra VND thì nhân * 1000 nữa.
    const toNumber = (s) =>
        Number(String(s).replace(/\./g, '').replace(/,/g, '').trim()) || null;

    // ====== LẤY BẢNG "GIÁ VÀNG TRONG NƯỚC" ======
    const domesticItems = [];

    // tìm table mà ô đầu tiên có chữ "Giá vàng trong nước"
    $('table').each((_, table) => {
        const firstCellText = $(table).find('th, td').first().text().trim();
        if (!/Giá vàng trong nước/i.test(firstCellText)) {
            return; // không phải bảng cần tìm
        }

        // duyệt từng dòng (bỏ dòng header)
        $(table)
            .find('tr')
            .each((i, row) => {
                if (i === 0) return; // dòng tiêu đề: "Giá vàng trong nước | Mua | Bán"

                const tds = $(row).find('td');
                if (tds.length < 3) return;

                const name = $(tds[0]).text().trim();
                const buyStr = $(tds[1]).text().trim();
                const sellStr = $(tds[2]).text().trim();

                if (!name) return;

                domesticItems.push({
                    name,
                    buy_raw: buyStr,
                    sell_raw: sellStr,
                    buy: toNumber(buyStr),   // 15,140 -> 15140 (nghìn/chỉ)
                    sell: toNumber(sellStr), // 15,340 -> 15340 (nghìn/chỉ)
                    date: updatedAt,
                    source: DOJI_URL
                });
            });

        // đã lấy được rồi thì break vòng each()
        return false;
    });


    return domesticItems;

}


/**
 * Lấy giá vàng Bảo Tín Mạnh Hải
 *
 * @param {Object} options
 * @param {string} options.goldType - loại vàng, ví dụ: 'KGB'
 * @param {string} options.timeType - kiểu thời gian: 'day' | 'month' | 'year'
 * @param {boolean} options.init   - tham số init của API
 */
async function fetchBTMHGoldRate({
                                     goldType = 'KGB',
                                     timeType = 'month',
                                     init = false,
                                 } = {}) {
    const BASE_URL = 'https://baotinmanhhai.vn/api/v1/exchangerate/goldRateChart';
    const res = await axios.get(BASE_URL, {
        params: {
            gold_type: goldType,
            time_type: timeType,
            init: init,
        },
        headers: {
            Accept: 'application/json, text/plain, */*',
            'X-Requested-With': 'XMLHttpRequest',
            // User-Agent để cho giống browser (thường không bắt buộc, nhưng có thì chắc cú hơn)
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 10000,
    });

    const body = res.data || {};
    const labels = body.labels || [];
    const rate = body.data?.rate || [];
    const sell = body.data?.sell || [];

    return { labels, rate, sell, raw: body };
}

