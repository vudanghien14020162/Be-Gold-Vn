const axios = require('axios');

exports.formatDate = function(date) {
    let d = new Date(date),
        month = "" + (d.getMonth() + 1),
        day = "" + d.getDate(),
        year = d.getFullYear(),
        hour = "" + d.getUTCHours(),
        minutes = "" + d.getMinutes(),
        seconds = "" + d.getSeconds();
    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;
    if (hour.length < 2) hour = "0" + hour;
    if (minutes.length < 2) minutes = "0" + minutes;
    if (seconds.length < 2) seconds = "0" + seconds;
    return (
        [year, month, day].join("-") + " " + [hour, minutes, seconds].join(":")
    );
};

exports.formatDateNotification = function(date) {
    let d = new Date(date),
        month = "" + (d.getMonth() + 1),
        day = "" + d.getDate(),
        year = d.getFullYear(),
        hour = "" + d.getUTCHours(),
        minutes = "" + d.getMinutes(),
        seconds = "" + d.getSeconds();
    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;
    if (hour.length < 2) hour = "0" + hour;
    if (minutes.length < 2) minutes = "0" + minutes;
    if (seconds.length < 2) seconds = "0" + seconds;
    return (
        [hour, minutes].join(":") + " " + [day, month, year].join("/")
    );
};

exports.is_numeric = function(value){
    return !isNaN(parseInt(value)) && isFinite(value);
};

exports.isInt = function (value) {
    if(value.slice(-1) === "."){
        return false;
    }
    if(parseInt(value) >= 0){
        return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value))
    }else{
        return false;
    }
};

exports.addMinutes = function(date, minutes) {
    return new Date(date.getTime() + minutes*60000);
};

exports.removeSpecialChar = function (str) {
    let string = str.replace(/[\"",;<>]/g, "");
    return string.replace("Bearer ", "");
};

exports.getMicroTime = function() {
    let hrTime = process.hrtime();
    return hrTime[0] * 1000000 + hrTime[1] / 1000;
};

exports.getIp = async function () {
    let params = {"format" : "json"};
    params = new URLSearchParams(params).toString();
    let url = "https://api.ipify.org/"+"?"+params;
    let call_api = await axios.get(url);
    return call_api && call_api.status === 200 ? call_api.data.ip : false;
};

exports.convertDurationToSeconds = (duration) => {
    const [hours, minutes, seconds] = duration.split(':');
    return Number(hours) * 60 * 60 + Number(minutes) * 60 + Number(seconds);
};

exports.convertDuration = (duration) => {
    const data = duration.split(':');
    return data;
};
