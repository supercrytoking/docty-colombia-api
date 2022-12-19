const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");


module.exports = {
    pageData: async (req, res) => {
        let name = req.params.name;
        let tk = name.split('-');
        let id = tk.pop();
        let obj = {};


        let pcData = await db.company_staic_page.findAll({
            where: { user_id: id, type: { [Op.in]: ['privacy', 'tnc'] } },
            attributes: ['content', 'type'],
        }).then(r => JSON.parse(JSON.stringify(r)));
        console.log(pcData);
        pcData.forEach(e => {
            obj[e.type] = e.content;
        })

        db.userMeta.findAll({
            where: { user_id: id, key: { [Op.in]: ['clinic_banner', 'clinic_links', 'clinic_scripts'] } }
        }).then(resp => {
            console.log(resp)
            resp.forEach(element => {
                obj[element.key] = element.json_data
            });
            return res.send(obj);
        }).catch(error => res.status(400).send({ success: false, error: `${error}` }))
    },
    pageDataSave: async (req, res) => {
        let data = req.body || {};
        db.userMeta.findOrCreate({
            where: {
                user_id: req.user.id,
                key: req.params.key
            }
        }).then(r => {
            r[0].update(data);
            res.send(r[0])
        }).catch(e => res.status(400).send({ error: e, status: false }))
    },
    saveStaticPage: async (req, res) => {
        let type = req.params.type;
        let data = req.body || {};

        db.company_staic_page.findOrCreate({
            where: {
                user_id: req.user.id,
                type: type
            }
        }).then(r => {
            r[0].update(data);
            res.send(r[0])
        }).catch(e => res.status(400).send({ error: e, status: false }))
    },
    getStaticPage: async (req, res) => {
        let slug = req.params.slug;
        let tk = slug.split("-");
        let id = tk.pop();
        db.company_staic_page.findAll({
            where: {
                user_id: id,
            }
        })
            .then(e => {
                let respp = {};
                e.forEach(a => {
                    respp[e.type] = a.content
                })
                res.send(respp);
            })
            .catch(e => res.status(400).send({ error: e, message: "inalid" }))
    }
}