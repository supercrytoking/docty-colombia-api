const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

var transform = (templateList, log) => {
    var temp = [];
    temp = JSON.parse(JSON.stringify(templateList));
    var template = temp.find(tem => tem.trigger && tem.trigger.trigger == log.type);

    // if (!template) return temp.trigger;
    var user = log.user != null ? log.user.dataValues : {};
    // console.log(temp)
    if (template == null) {
        log.details = `${user.first_name} ${log.type}`;
        return log;
    }

    var by = log.by != null ? log.by.dataValues : {};

    var details = template.content;

    var data = { 'userName': user.first_name, 'withUserName': by.first_name };

    for (let key in data) {
        let str = "${" + key + "}";
        details = details.replace(str, data[key]);
    }

    log.details = details;
    log.link = template.module_link;
    // console.log(log)
    return log;
};

module.exports = {
    async addActivityLog(data) {
        try {
            db.activity_log.upsert(data).then(resp => {
                // console.log(resp)
            }).catch(err => {
                console.log(err);
            });
        } catch (e) {

        }
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
        if (req.user && req.user.id) {
            var data = req.body;
            var language = req.lang;
            if (req.body.language) language = req.body.language;
            var templates = await db.activity_log_template.findAll({
                where: {
                    user_role: req.user.role,
                    language: language
                },
                include: ['trigger']

            });

            let where = { user_id: req.user.id };

            where.user_id = req.user.id;

            db.activity_log.findAll({
                include: [
                    {
                        model: db.user,
                        as: 'user',
                        attributes: ['id', 'first_name', 'last_name', 'email', 'middle_name', 'company_name', 'picture']
                    },
                    {
                        model: db.user,
                        as: 'by',
                        attributes: ['id', 'first_name', 'last_name', 'email', 'middle_name', 'company_name', 'picture']
                    }
                ], where,
                limit: 10,
                order: [['createdAt', 'DESC']]
            }).then(logs => {

                logs.forEach(element => {
                    var log = element.dataValues;
                    log = transform(templates, log);
                });
                // console.log(logs)
                res.send(logs);
            }).catch(err => {
                // console.log(err)
                res.status(400).send({
                    status: false,
                    errors: `${err}`
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