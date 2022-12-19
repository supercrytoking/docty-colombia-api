const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

var transform = (templateList, log) => {
    var temp = [];
    templateList.forEach(item => {
        temp.push(item.dataValues);
    });
    var template = temp.find(temp => temp.trigger.trigger == log.type);
    if (templateList == null) return log;

    var user = log.user != null ? log.user.dataValues : {};
    var by = log.by != null ? log.by.dataValues : {};

    var details = template.content;

    var data = {
        'userName': user.email,
        'withUserName': by.email,

    };

    for (let key in data) {
        let str = "${" + key + "}";
        details = details.replace(str, data[key]);
    }

    log.details = details;
    log.link = template.module_link;

    return log;
};

module.exports = {
    async addActivityLog(data) {
        try {
            db.activity_log.upsert(data).then(resp => {
                console.log(resp);
            }).catch(err => {
                console.log(err);
            });
        } catch (e) { }
    },
    async add_activityLog(req, res, next) {
        let data = req.body;
        try {
            db.activity_log.upsert(data).then(resp => {
                res.send({
                    status: true,
                    data: resp
                });
            }).catch(err => {
                res.send(err);
            });

        } catch (error) {
            res.status(400).send({
                status: false,
                errors: error
            });
        }
    },
    async activityLogs(req, res, next) {
        var data = req.body;
        if (req.user && req.user.id) {
            var templates = await db.activity_log_template.findAll({
                // where: {
                //     user_role: data.user_role,
                //     language: data.language
                // },
                include: ['trigger']
            });

            db.activity_log.findAll({ include: ['user'] }).then(resp => {
                resp.forEach(element => {
                    var log = element.dataValues;
                    log = transform(templates, log);
                });
                // console.log(logs)
                res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                });
            });

        }
        else {
            res.sendStatus(406);
        }
    },
    async activityLog(req, res, next) {
        if (req.user && req.user.id) {
            db.activity_log.update({ seen: true }, { where: { receiver: req.user.id } }).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                });
            });

        }
        else {
            console.log('406');
            res.sendStatus(406);
        }
    },
    async remove(req, res, next) {
        if (req.user && req.user.id) {
            try {
                await db.activity_log.destroy({ where: { id: req.body.id } });
                res.send({
                    success: true,
                    message: 'Deleted Successfully'
                });
            } catch (error) {
                res.status(400).send({
                    status: false,
                    errors: error
                });
            }
        } else {
            res.sendStatus(406);
        }
    }
};