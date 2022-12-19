const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

module.exports = {
    async registerDevice(req, res, next) {
        let data = req.body;
        try {
            data.platform = 'web';
            await db.notification_subscription.findOrCreate({ where: { user_id: data.user_id, platform: data.platform } });
            await db.notification_subscription.update(data, { where: { user_id: data.user_id, platform: data.platform } });
            res.send({
                status: true
            })
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: `${error}`
            })
        }

    },
    async registerFcmToken(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            console.log('registerFcmToken', data);
            try {
                let notification_subscription = await db.notification_subscription.findOrCreate({ where: { user_id: req.user.id, platform: data.platform } });
                await notification_subscription[0].update({ subscription: { fcm_token: data.fcm_token } });
                res.send({
                    status: true
                })
            } catch (error) {
                console.log(error)
                res.status(400).send({
                    status: false,
                    errors: `${error}`
                })
            }
        } else {
            res.sendStatus(406)
        }

    },
}