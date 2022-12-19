const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');
const { capitalize } = require('../../commons/helper');

module.exports = {
    async getNetworkEnv(req, res, next) {
        let obj = {
            patientCloseEnvironment: false,
            statffCloseEnvironment: false,
            wellnessPermission: false,
            user_id: req.params.userId
        }
        let data = await db.userMeta.findOne({
            where: {
                user_id: obj.user_id,
                key: 'networkVisibility'
            }
        })
        if (!!data && !!data.json_data) {
            let json = data.json_data || {}
            obj.patientCloseEnvironment = !!json.patientCloseEnvironment
            obj.statffCloseEnvironment = !!json.statffCloseEnvironment
            obj.wellnessPermission = !!json.wellnessPermission
        }
        res.send(obj)
    },
    async setNetworkEnv(req, res, next) {
        let data = req.body || {}
        if (!!!data.user_id) {
            return res.status(400).send({ status: false, error: 'INVALID_USERID' })
        }
        await db.userMeta.findOrCreate({
            where: {
                user_id: data.user_id, key: 'networkVisibility'
            },
            defaults: {
                json_data: {
                    patientCloseEnvironment: data.patientCloseEnvironment,
                    statffCloseEnvironment: data.statffCloseEnvironment,
                    wellnessPermission: data.wellnessPermission
                }
            }
        }).then(async (r) => {
            if (!!r && !!r[0].json_data && r[0].json_data.statffCloseEnvironment != data.statffCloseEnvironment)
                await db.associate.update({ inNetworks: data.statffCloseEnvironment }, { where: { user_id: data.user_id } });
            return r[0].update({
                json_data: {
                    patientCloseEnvironment: data.patientCloseEnvironment,
                    statffCloseEnvironment: data.statffCloseEnvironment,
                    wellnessPermission: data.wellnessPermission
                }
            })
        }
        )
        res.send({ status: true })
    }
};
