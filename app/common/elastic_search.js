const axios = require('axios');
const app = require("../config/app");
const moment = app.moment;
/*
Define type logs
 */
const LOG_ERROR = 1;

exports.logError = async function (e = '', title = 'Ex: ', req = '') {
    let url = process.env.ENV == 'production' ? 'http://192.168.82.58:9200/error_logs/_doc' : 'http://192.168.82.58:9200/sb_error_logs/_doc';
    let data = JSON.stringify({
        "url": req?.route?.path ?? '',
        "params": {
            "header": req.headers ?? null,
            "body": req.body ?? null,
            "params": req.params ?? null,
            "query": req.query ?? null
        },
        "title": title,
        "detail": {
          "errLogs": e?.stack
        },
        "type": LOG_ERROR,
        "created_at": moment(Date.now()).format("YYYY-MM-DD HH:mm:ss")
    });

    let config = {
        method: 'post',
        url: url,
        headers: {
            'Content-Type': 'application/json'
        },
        data: data
    };

    axios(config)
        .then(function (response) {
            // console.log(JSON.stringify(response.data));
        })
        .catch(function (error) {
            // console.log(error);
        });
    return;
}