require('dotenv').config();
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
process.env.TZ = "Asia/Ho_Chi_Minh";
const PORT = 8890;
app.listen(PORT, () => {
  console.log(`Start Cron Job - POST: ${PORT}`);
});
const axios = require("axios");
const cron                  = require('cron');
var xml2json = require('xml2js');
const moment = require("moment/moment");
var parser = new xml2json.Parser();
// const {sendMessage}         = require("app/common/telegram");
const job_price   = new cron.CronJob({
  cronTime:'*/10 * * * * *',// Set time out run cron job 10s
  // cronTime:'20 */8 * * *',// Set time out run cron job 30 minutes
  onTick: async function() {
    console.log('Cron job get price is running...');
      getDataGold().then(function(data) {
          let date = moment().format('DD-MM-YYYY');
          let strGold = getStrGold(data, date);
          sendMessageTelegram(strGold);
      }, function(error) {
          console.log('Promise rejected.');
          console.log(error.message);
      });
  },
  start: true,
  timeZone: 'Asia/Ho_Chi_Minh' // Set time local
});

async function getDataGold() {
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

function getStrGold(data, date){
    let nameGold = '<b>' + "Ngay: " + date + '</b>\n\n';
    console.log("Len", data.length)
     for(let i = 0; i < data.length; i++){
         if(i < 40){
             let objectString = Object.values(data[i]);
             let gold_title = removeAccents(objectString[1]);
             if (gold_title.match(/NHAN TRON TRON.*/)) {
                 nameGold += '<b>' + removeAccents(objectString[1]) + ": " + '</b>' + "\n" + "Mua Vao: " + removeAccents(objectString[4]) + "\n" + "Ban Ra: " + removeAccents(objectString[5]);
                 nameGold = nameGold + "\n" + "____________________________" + "\n" + "\n";
             }
         }

     }
    return nameGold;
}

function sendMessageTelegram(nameGold = ""){
    try {
        if(nameGold !== '' && nameGold != null){
            let message =
                '<i>' + nameGold + '</i>\n';
            let url = 'https://api.telegram.org/bot'+ "5370872342:AAH2roTpnTlIkLRbzyg6aqQYm_LkUT77gEE" + '/sendMessage?chat_id=' + "1636128663" + '&text=' + message + '&parse_mode=html';
            let config = {
                method: 'get',
                url: url,
                headers: {}
            };
            axios(config)
                .then(function (response) {
                    console.log("Send message successfully: ", "Thành công");
                })
                .catch(function (error) {
                    console.log(error);
                    console.log("send failure error message: ", "Thất bại");
                })
        }
    } catch (e) {
    }
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
job_price.start();
