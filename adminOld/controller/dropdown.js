const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");


// get dropdown types
async function getDropdownType(req, res) {
    try {
        let typeLists = await db.dropdown_types.findAll();
        res.send({
            status: true,
            message: 'success',
            data: typeLists
        });
    } catch (error) {
        res.status(400).send({
            errors: `${error}`,
            status: false
        });
    }
}

// add dropdown type
async function saveDropdownType(req, res) {
    try {
        let data = req.body;
        if (!!!data.code) {
            data['code'] = data.name
        }
        let resp = await db.dropdown_types.upsert(data);
        res.send({
            status: true,
            message: 'success',
        });
    } catch (error) {
        res.status(400).send({
            errors: `${error}`,
            status: false
        });
    }
}

// update dropdown type

// delete dropdown type
async function deleteDropdownType(req, res) {
    let { id } = req.params;
    db.dropdown_types.destroy({ where: { id } }).then(resp => {
        res.send({
            status: true,
            message: 'success',
            data: []
        });
    })
        .catch(e => console.log(e));

}


async function getDropdowns(req, res) { // dropType
    try {
        var where = {};
        if (req.query && req.query.type) {
            where['type'] = req.query.type;
        }
        if (req.query && req.query.lang) {
            where['language'] = req.query.lang;
        }
        let dropdownList = await db.dropdown.findAll({ where: where });
        res.send({
            status: true,
            message: 'success',
            data: dropdownList
        });
    } catch (error) {
        res.status(400).send({
            errors: `${error}`,
            status: false
        });
    }
}

async function saveDropdown(req, res) {
    try {
        let data = req.body;
        let resp;
        if (data.id) {
            await db.dropdown.update(data, { where: { id: data.id } });
            resp = await db.dropdown.findOne({ where: { id: data.id } });
        } else {
            resp = await db.dropdown.create(data);
        }
        res.send({
            status: true,
            message: 'success',
            data: resp
        });
    } catch (error) {
        res.status(400).send({
            errors: `${error}`,
            status: false
        });
    }
}

module.exports = {
    getDropdownType,
    saveDropdownType,
    deleteDropdownType,
    getDropdowns,
    saveDropdown
}