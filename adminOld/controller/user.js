const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const bcrypt = require('bcryptjs');
const { addActivityLog } = require('./activityLog');
const { crmTrigger } = require('../../commons/crmTrigger');

async function getUsers(req, res, next) {
    let where = {};
    if (req.body.id) {
        where.id = req.body.id
    }
    if (req.body.name) {
        where.first_name = {
            [Op.like]: '%' + req.body.name + '%'
        }
    }
    if (req.body.email) {
        where.email = req.body.email
    }
    if (req.body.national_id) {
        where.national_id = req.body.national_id
    }
    if (req.body.phone_number) {
        where.phone_number = req.body.phone_number
    }
    if (req.body.status) {
        where.status = req.body.status
    }
    if (req.body.website) {
        where.website = req.body.website
    }
    if (req.body.company_name) {
        where.company_name = {
            [Op.like]: '%' + req.body.company_name + '%'
        }
    }

    if (req.body.dob) {
        where.dob = req.body.dob
    }

    let page = 1;
    let order = [];
    if (req.query && req.query.page) {
        page = req.query.page
    } else if (req.body.page) {
        page = req.body.page
    }
    if (req.query && req.query.order) {
        order.push(req.query.order);
    } else if (req.body.order) {
        order.push(req.body.order);
    }
    if (req.query && req.query.order_by) {
        order.push(req.query.order_by);
    } else if (req.body.order_by) {
        order.push(req.body.order_by);
    }
    let include = [
        'country', 'state', 'address', 'associatedTo',
        'user_medical', 'insurance', 'licence',
        'family', 'charges', 'availability',
        'practice', 'services', 'education',
        'user_location', 'contract', 'documents',
        'skills', 'user_speciality', 'rating_summary', 'reviewer'
    ];
    if ((req.query && req.query.role) || req.body.role) {
        let role_id = req.query.role || req.body.role;
        include.push({
            model: db.user_role,
            where: { role_id }
        });
    } else {
        include.push('user_role');
    }

    // let options = {
    //     page: page,
    //     paginate: 25,
    //     order: order,
    //     where: where,
    //     include: include,
    //     attributes: { include: ['status'] },
    // }

    db.user.findAll({ where: where, include: include }).then(resp => {
        res.send(resp)
    }).catch(err => {

        res.status(400).send({
            status: false,
            errors: `${err}`
        })
    })
}

async function updateUserInfo(req, res, next) {
    if (req.user && req.user.id) {
        let data = req.body;
        var oldUser = await db.user.findByPk(data.user_id);

        data.status = data.status ? 1 : 0;// boolean -> integer

        if (oldUser.status != data.status && data.status) {
            crmTrigger('Reviewer_Activated_Account', { email: oldUser.email, userName: oldUser.fullName, reviewer: req.user.first_name }, oldUser.lang || req.lang);
        }
        db.user.update(data, { where: { id: req.body.user_id } }).then(r => {
            res.send({
                status: true,
                user: r
            })
        }).catch(errors => {
            res.status(400).send({
                'error_code': 101,
                'status': false,
                'errors': `${errors}`
            })
        })
    }
    else {
        res.sendStatus(406)
    }
}

async function updateStatus(req, res) {
    if (req.user && req.user.id) {
        let data = req.body;
        try {
            var admin = await db.admin.findOne({ where: { id: req.user.id } });

            var updateData = { status: data.status };
            if (data.status === -1) { // if suspend account, contract must be termisated
                updateData = { status: data.status, isSigned: false };
                await db.signedContract.update({ status: 0 }, { where: { user_id: data.id } });
            }
            await db.user.update(updateData, { where: { id: data.id } });
            if (data.status === -1) {
                db.approval_review.findOrCreate({ where: { section: 'suspended', user_id: data.id } }).then(async resp => resp[0].update({ remark: data.suspend_remarks, reviewer: req.user.id }));

                var user = await db.user.findOne({
                    where: { id: data.id }, include: [{ model: db.user_role, as: 'user_role' }]
                });
                crmTrigger('Support_Suspends_Provider_Account',
                    {
                        email: user.email,
                        user_name: user.fullName,
                        by_name: admin.fullName,
                        suspend_remarks: data.suspend_remarks
                    },
                    user.lang || req.lang);
                if (user.user_role && (user.user_role.role_id === 5 || user.user_role.role_id === 13)) {//clinic/corperation is suspended, then, susppend their staff

                    db.user.findAll({
                        include: [{
                            model: db.associate,
                            as: 'associatedTo',
                            where: { user_id: data.id }
                        }],
                        where: { status: { [Op.gt]: 0 } }
                    }).then(async staffList => {
                        staffList.forEach(async _staffUser => {
                            await _staffUser.update({ status: -1, isSigned: false });
                            await db.signedContract.update({ status: 0 }, { where: { user_id: _staffUser.id } });
                            crmTrigger('Support_Suspends_Provider_Account',
                                {
                                    email: _staffUser.email,
                                    user_name: _staffUser.fullName,
                                    by_name: admin.fullName,
                                    suspend_remarks: data.suspend_remarks
                                }, _staffUser.lang || req.lang);
                        });
                    });


                }
            }

            res.send({
                status: true,
                data: true
            })
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: error
            })
        }
    }
    else {
        res.sendStatus(406)
    }
}

async function getUserAvailability(req, res, next) {
    if (req.user && req.user.id) {
        db.user_availability.findAll({ where: { user_id: req.body.user_id, location_id: req.body.id } }).then(data => {
            res.send(data);
        }).catch(err => {
            res.status(404).json({
                error: true,
                status: false,
                errors: `${err}`
            })
        })
    }
    else {
        res.sendStatus(406)
    }
}

async function addUser(req, res, next) {
    try {
        var user = await db.user.findOne({
            where: {
                email_verified: 1,
                [Op.or]: [
                    { email: req.body.email },
                    { phone_number: req.body.phone_number }
                ]
            }
        });
        if (user) {
            if (user.email == req.body.email) {
                return res.status(409).json({
                    'error_code': 102,
                    'status': false,
                    'errors': 'SERVER_MESSAGE.EMAIL_UNAVALABLE',
                    // data: user
                })
            }
            if (user.phone_number == req.body.phone_number) {
                return res.status(409).json({
                    'error_code': 103,
                    'status': false,
                    'errors': 'SERVER_MESSAGE.PHONE_UNAVALABLE'
                })
            }
        }
        req.body.status = 1;

        bcrypt.genSalt(10, async function (err, salt) {
            bcrypt.hash(req.body.password, salt, async function (err, hash) {
                if (err)
                    throw err;
                req.body.password = hash;
                var role_id = req.body.role;
                if (req.body.role_id)
                    delete (req.body.role_id);
                let u = await db.user.findOrCreate({ where: { email: req.body.email } });
                var result = u[0];
                if (result) {
                    var role_data = await db.user_role.findOrCreate({ where: { user_id: result.id, role_id: role_id } });
                    role_data[0].update({ role_id: role_id });
                    let responce = await db.pin.create({ user_id: result.id, pin: 0, status: 0 });
                    return res.status(200).send({
                        error: false,
                        status: "Success",
                        message: 'User account is successfully created.',
                        data: { user_id: result.id }
                    })
                } else {
                    return res.status(500).json({
                        'error_code': 109,
                        'status': false,
                        'errors': 'User account not created. Please try again'
                    })
                }
            })
        })

    } catch (error) {
        return res.status(500).json(
            {
                error_code: 101,
                status: false,
                errors: `${error}`
            }
        )
    }
}

async function deleteUser(req, res, next) {
    if (req.body.id) {
        try {
            let data = req.body;
            var user = await db.user.findOne({
                where: { id: data.id }, include: [{ model: db.user_role, as: 'user_role', }]
            });

            let resp = await db.user.destroy({ where: { id: req.body.id } });
            let response = await db.user_role.destroy({ where: { user_id: req.body.id } });
            let respons = await db.pin.destroy({ where: { user_id: req.body.id } });

            if (user.user_role && (user.user_role.role_id === 5 || user.user_role.role_id === 13)) {//clinic/corperation is deleted, then, susppend their staff

                db.user.findAll({
                    include: [{
                        model: db.associate,
                        as: 'associatedTo',
                        where: { user_id: data.id }
                    }],
                    where: { status: { [Op.gt]: 0 } }
                }).then(async staffList => {
                    staffList.forEach(async _staffUser => {
                        await _staffUser.update({ status: -1 });
                        crmTrigger('Support_Suspends_Provider_Account',
                            {
                                email: _staffUser.email,
                                user_name: _staffUser.fullName,
                                by_name: req.user.first_name,
                                suspend_remarks: 'Associated Clinic Deleted by support team'
                            }, staffList.lang || req.lang);
                    });
                });
            }

            res.send({
                status: true,
                data: resp
            })
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: `${error}`
            })
        }
    }
    else {
        res.sendStatus(406)
    }
}

/*====User Insurance API============*/

async function addInsurance(req, res, next) {
    if (req.body.user_id) {
        let data = req.body;
        data['user_id'] = req.body.user_id;
        if (!!data.is_no_insurance) {
            return db.user_insurance.destroy({ where: { user_id: data.user_id, member_id: 0 } }).then(resp => {
                return res.send({
                    status: true,
                    data: resp
                })
            })
        }
        try {
            let resp = await db.user_insurance.upsert(data);
            res.send({
                status: true,
                data: resp
            });
            addActivityLog({ user_id: req.body.user_id, type: 'Insurance Changes', details: `` });
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: error
            })
        }
    } else {
        res.sendStatus(406)
    }

}

async function removeInsurance(req, res, next) {
    if (req.body.id) {
        try {
            let resp = await db.user_insurance.destroy({ where: { id: req.body.id } });
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
    }
    else {
        res.sendStatus(406)
    }
}

async function insurances(req, res, next) {
    if (req.body.user_id) {
        let where = { user_id: req.body.user_id }
        if (req.query && req.query.member_id) {
            where['member_id'] = req.query.member_id;
        }
        db.user_insurance.findOne({ where }).then(resp => {
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

async function insurance(req, res, next) {
    if (req.body.id) {
        db.user_insurance.findByPk(req.body.id).then(resp => {
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
async function getMemberInsurance(req, res, next) {
    if (req.body.user_id) {
        db.user_insurance.findOne({
            where: {
                user_id: req.body.user_id,
                member_id: req.body.member_id
            }
        }).then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: req.body
            })
        })
    }
    else {
        res.sendStatus(406)
    }
}


/*====User Medical API============*/

async function addMedical(req, res, next) {
    let data = req.body;
    if (req.body.user_id) {
        data['user_id'] = req.body.user_id;
        try {
            let resp = await db.user_medical.upsert(data);
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

}

async function medicals(req, res, next) {
    if (req.body.user_id) {
        db.user_medical.findAll({ where: { user_id: req.body.user_id } }).then(resp => {
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


module.exports = { getUsers, updateUserInfo, updateStatus, getUserAvailability, addUser, deleteUser, addInsurance, removeInsurance, insurances, insurance, addMedical, medicals, getMemberInsurance }
