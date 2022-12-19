const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../../models");

var xlsx = require('node-xlsx');

module.exports = {
    async triggers(req, res, next) {
        if (req.user && req.user.id) {
            db.email_trigger.findAll({
                where: {
                    is_personalization: true,
                    status: true,
                    // name: { [Op.notIn]: ['Email_Header', 'Email_Footer'] }
                }
            }).then(resp => {
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
    async triggers_email(req, res, next) {
        if (req.user && req.user.id) {
            db.email_trigger.findAll({
                where: {
                    is_personalization: true,
                    status: true,
                    name: { [Op.notIn]: ['Email_Header', 'Email_Footer'] }
                },
                include: [
                    {
                        model: db.email_template,
                        as: 'template',
                        attributes: ['id', 'language', 'title', 'user_id'],
                        where: {
                            user_id: { [Op.in]: [0, req.user.id] }
                        },
                        required: false,
                        order: [['language', 'asc'], ['user_id', 'asc']]
                    }
                ]
            }).then(resp => {
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
    async triggers_email_global_setting(req, res, next) {
        if (req.user && req.user.id) {
            db.email_trigger.findAll({
                where: {
                    is_personalization: true,
                    status: true,
                    name: { [Op.in]: ['Email_Header', 'Email_Footer'] }
                },
                include: [
                    {
                        model: db.email_template,
                        as: 'template',
                        attributes: ['id', 'language', 'title', 'user_id'],
                        where: {
                            user_id: { [Op.in]: [0, req.user.id] }
                        },
                        required: false,
                        order: [['language', 'asc'], ['user_id', 'asc']]
                    }
                ]
            }).then(resp => {
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
    async triggers_push(req, res, next) {
        if (req.user && req.user.id) {
            db.email_trigger.findAll({
                include: [
                    {
                        model: db.email_trigger_notification,
                        as: 'notification',
                        required: true,
                    },
                ]
            }).then(resp => {
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
    async triggers_monitor_notification(req, res, next) {
        if (req.user && req.user.id) {
            db.email_trigger.findAll({
                include: [
                    {
                        model: db.email_trigger_monitor_notification,
                        as: 'monitor_notification',
                        required: true,
                    },
                ]
            }).then(resp => {
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
    async trigger(req, res, next) {
        if (req.user && req.user.id) {
            db.email_trigger.findByPk(req.params.id).then(resp => {
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
    async triggerExport(req, res, next) {
        res.setHeader('Content-disposition', 'attachment; filename=trigger.xlsx');
        res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.charset = 'UTF-8';

        var t = await db.email_trigger.findAll({ include: ['template'] });

        var totalData = [['Trigger', 'Mapped Template', 'Template URL', 'Description', 'Shortcodes']];
        for (var i = 0; i < t.length; i++) {
            var trigger = t[i];
            var template = trigger.template || [];

            var row = [trigger.name, template.map(t => `{{${t.title}}}`).join(), template.map(t => `{{https://cms.docty.ai/email-template/view/${t.id}}}`).join(), trigger.description, (trigger.shortcodes || []).join(',')];
            totalData.push(row);
        }
        var buffer = xlsx.build([{ name: "trigger", data: totalData }]);
        res.write(buffer);

        res.end();
        // var json = {
        //     foo: 'bar',
        //     qux: 'moo',
        //     poo: 123,
        //     stux: new Date()
        // }
        // // let json = t.map(e => {
        // //     var template = e.template || []
        // //     return {
        // //         Trigger: e.name,
        // //         'Mapped Template': template.map(t => t.title).join(),
        // //         'Template URL': `https://cms.docty.ai/email-template/view/${e.id}`,
        // //         Description: e.description
        // //     }
        // // })

        // var file = await json2xls(json);
        // // res.xls('data.xlsx', json);
        // await fs.writeFileSync('public/data.xlsx', file, 'binary');

        // const file1 = path.resolve(__dirname, `../../public/data.xlsx`);
        // //No need for special headers
        // res.download(file1);
        // // res.send(xls);
    }
};