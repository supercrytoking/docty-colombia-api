const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
// const creds = require('../commons/creds.json');
const fs = require("fs");



module.exports = {
    async addCred(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            data.user_id = 0;
            try {
                let resp = await db.credential.findOrCreate({ where: { user_id: 0, key: data.key } }).then(ress => {
                    ress[0].update({ value: data.value });
                    let k = data.key
                    if (ress[0].user_id > 0) {
                        k += `_${ress[0].user_id}`
                    }
                    global.credentials[k] = ress[0].value;
                    fs.writeFile('./commons/creds.json', JSON.stringify(global.credentials), function (err) {
                        if (err) throw err;
                    });
                    return ress[0];
                })
                res.send({
                    status: true,
                    data: resp
                })
            } catch (error) {
                res.status(400).send({
                    status: false,
                    errors: error
                })
            }
        } else {
            res.sendStatus(406)
        }

    },
    async credentials(req, res, next) {
        if (req.user && req.user.id) {
            db.credential.findAll().then(resp => {
                res.send(resp)
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                })
            })

        }
        else {
            res.sendStatus(406)
        }
    }
}