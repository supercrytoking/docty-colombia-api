const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const { monitorNotificationTrigger } = require('../commons/crmTrigger');
/*====documentType API============*/

function checkOnline(req, res, next) {
    try {
        var data = req.body;

        var result = [];
        console.log(data)
        data.forEach(uid => {
            result.push({
                user_id: uid,
                online: global.onlineSocket[`userid${uid}`] != null
            });
        });
        res.send({ success: true, data: result });
    } catch (e) {
        console.log(e)
        res.send({ success: false, data: `${e}` });
    }
}


function create_notification(req, res, next) {
    try {
        var data = req.body;
        monitorNotificationTrigger(data.data.type, data.data);
        res.send({ success: true });
    } catch (e) {
        console.log(e)
        res.send({ success: false, data: `${e}` });
    }
}

module.exports = { checkOnline, create_notification }
