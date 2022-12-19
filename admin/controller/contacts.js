const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { user, family } = require("../../models");


module.exports = {
    mycontacts(req, res, next) {
        if (req.user && req.user.id) {
            user.findByPk(req.query.user_id, {

            }).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.send({
                    status: false,
                    errors: err
                })
            })
        } else {
            res.sendStatus(406)
        }
    },
    async contactPerticulars(req, res, next) {
        let id = req.user.id;
        let include = [
            'charges',
            'availability', 'practice',
            'services', 'education', 'user_role',
            'user_location', 'rating_summary'
        ];
        if (req.user && req.user.id) {
            if (req.query && req.query.id) {
                id = req.query.id;
            }
            if (req.query && req.query.includes) {
                include = req.query.includes.split(',');
            }
            let address = await db.address.findOne({ where: { user_id: id, family_id: 0 } });
            let insurance = await db.user_insurance.findOne({ where: { user_id: id, member_id: 0 } });
            let career_snap = await module.exports.getCArrierSnap(id);
            let favorite = await db.my_favorite.findOne({ where: { user_id: req.user.id, provider_id: id } })
            user.findByPk(id, {
                include: include
            }).then(resp => {
                let json = JSON.parse(JSON.stringify(resp))
                res.send({ ...json, career_snap, address, insurance, favorite: (!!favorite) });
            }).catch(err => {
                res.send({
                    status: false,
                    errors: `{err}`
                })
            })
        } else {
            res.sendStatus(406)
        }
    },
    async getCArrierSnap(id) {

        return db.user_practice.findAll({ where: { user_id: id } }).then(practice => {
            if (practice.length) {
                practice.sort((a, b) => {
                    let first = new Date((a.from || ''));
                    let second = new Date((b.from || ''));
                    return (first - second)
                })
                let firstPractice = practice[0];
                let lastPractice = practice.pop();
                let experience = ((Date.now() - new Date(firstPractice.from || '').getTime()) / (365 * 24 * 60 * 60 * 1000)).toFixed();
                return { experience, field: lastPractice.field, title: lastPractice.title }
            }
            return {};
        })
    },
    async myProviders(req, res, next) {
        if (req.user && req.user.id) {
            db.user.findAll({
                where: { status: { [Op.gt]: 0 } },
                include: [
                    {
                        model: db.address,
                        // where: { family_id: 0 },
                        as: 'address'
                    },
                    {
                        model: db.user_role,
                        where: { role_id: { [Op.in]: [4, 5, 6] } },
                        as: "user_role"
                    }
                ]
            }).then(resp => {
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