const Sequelize = require('sequelize');
const trans = require('./trans.json');
const Op = Sequelize.Op;
const db = require("../models");

var main = async () => {
    for (let t of trans) {
        console.log(t);
        let d = await db.translation.findOne({ where: { keyword: t.keyword, section: t.section } });
        if (!!!d) {
            await db.translation.create({ keyword: t.keyword, section: t.section, en: t.en, es: t.es });
        }
    }

}
main();