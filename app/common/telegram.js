const axios = require('axios');

exports.sendMessage = async function (e = '', title = 'Ex: ', req = '') {
    if (true) {
        try {
            e = e.stack;
            let message = '<b>' + 'API Nethub' + '</b>\n' +
                '<b>' + 'Environment: ' + process.env.ENV + '</b>\n' +
                '<b>' + 'Url: ' + '</b>' + req.route.path + '\n' +
                '<b>' + 'Params: ' + '</b>\n' +
                '   - query: ' + JSON.stringify(req.query) + '\n' +
                '   - params: ' + JSON.stringify(req.params) + '\n' +
                '   - body: ' + JSON.stringify(req.body) + '\n' +
                '   - header: ' + JSON.stringify(req.headers) + '\n' +
                '<b>' + title + '</b>\n' +
                e.replace(/(<([^>]+)>)/gi, "");
            let url = 'https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_TOKEN + '/sendMessage?chat_id=' + process.env.TELEGRAM_CHANNEL_ID + '&text=' + message + '&parse_mode=html';
            let config = {
                method: 'get',
                url: url,
                headers: {}
            };

            axios(config)
                .then(function (response) {
                    // console.log("Send error message successfully: ", JSON.stringify(response.data));
                })
                .catch(function (error) {
                    // console.log("send failure error message: ", error);
                });
        } catch (e) {

        }
    }
    return;
}