
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
var generator = require('generate-password');
const bcrypt = require('bcryptjs');
const { capitalize, findSuccessManager } = require('../../commons/helper');
const db = require("../../models");

const { crmTrigger } = require('../../commons/crmTrigger');
const { addActivityLog } = require('../../admin_new/controller/user_audit_log');
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');

async function updateAssociate(data) {

    var user = await db.user.findOne({ where: { email: data.email, id: { [Op.ne]: data.id } } });
    if (!!user && !!user.email) {
        throw 'EMAIL_UNAVALABLE';
    }
    user = await db.user.findOne({ where: { phone_number: data.phone_number, id: { [Op.ne]: data.id } } });
    if (!!user && !!user.phone_number) {
        throw 'PHONE_UNAVALABLE';
    }

    return db.user.update(data, { where: { id: data.id } }).then(async res => {
        if (data.role) {
            await db.user_role.update({ role_id: data.role }, { where: { user_id: data.id } });
        }
        return res;
    })
}

function getNewPassword() {

    return new Promise((resolve, reject) => {
        var password = generator.generate({ length: 10, numbers: true });
        bcrypt.genSalt(10, function (err, salt) {
            if (err) {
                reject(err)
                return
            }
            bcrypt.hash(password, salt, function (err, hashPassword) {
                if (err) {
                    reject(err)
                    return
                }
                resolve({ hashPassword: hashPassword, password: password });
            })
        });
    })
}

async function createAssociate(data, req) {
    var user = await db.user.findOne({ where: { email: data.email } });
    if (!!user && !!user.email) {
        throw 'EMAIL_UNAVALABLE';
    }
    user = await db.user.findOne({ where: { phone_number: data.phone_number } });
    if (!!user && !!user.phone_number) {
        throw 'PHONE_UNAVALABLE';
    }
    var pwdObj = await getNewPassword();
    data.password = pwdObj.hashPassword;
    data.status = 0;
    data.email_verified = 1;
    data.need_password_reset = true;
    if (data.role == 13) {
        data.status = 1;
    }
    // addActivityLog({ user_id: req.user.id, type: 'Patient_Allowed_Access'});
    return db.user.create(data).then(async res => {
        crmTrigger('Associate_New_Admin', { email: data.email, subject: 'Docty Health Care: portal Access', password: pwdObj.password, byname: req.user.first_name }, req.lang)
        addActivityLog({ user_id: res.id, by_id: req.user.id, type: 'User_Added', data: { panelType: 'monitor', panelName: req.user.first_name } })
        if (data.role) {
            await db.user_role.create({ user_id: res.id, role_id: data.role })
        }

        try {
            if (data.role != 13) { // ignore coporate user
                var admin = await findSuccessManager();
                if (admin && admin.id) {
                    await db.user_profile_reviewer.upsert({ user_id: res.id, admin_id: admin.id });
                    crmTrigger('Reviewer_Assigned', { email: data.email, reviewer: admin.fullName, userName: data.first_name, user: user.fullName }, req.lang || 'en')
                    crmTrigger('New_Lead_Assigned', { email: admin.email, user: data.first_name, userName: admin.fullName, user_type: '' }, admin.lang || req.lang || 'en');
                }
            }
        } catch (e) {
            console.log(e);
        }
        return await db.associate.create({ admin_id: data.user_id, associate: res.id }).then(() => {

            return res
        }).catch(err => {
            throw err;
        })
    }).catch(err => {
        throw err;
    })
}

async function updateOrgContacts(data) {
    return db.org_contacts.findOrCreate({ where: { user_id: data.user_id, type: data.type } }).then(resp => {
        resp[0].update(data)
        return resp[0];
    })
}

module.exports = {
    addAssociate: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;

            data['user_id'] = req.user.id;
            let resp;
            if (!!data.id) {
                if (!!!data.email) data.email = null;
                if (!!!data.phone_number) data.phone_number = null;
                data.status = 1;
                data.email_verified = 1;
                resp = updateAssociate(data)
            } else {
                resp = createAssociate(data, req)
            }
            resp.then(async response => {
                if (!!data.manager) {
                    await updateOrgContacts({ ...data.manager, type: 'manager', user_id: (response.id || data.id) })
                }
                if (!!data.support) {
                    await updateOrgContacts({ ...data.support, type: 'support', user_id: (response.id || data.id) })
                }
                res.send({ data: response, status: true })
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: `${err}`
                })
            })

        } else {
            res.sendStatus(406)
        }
    },
    getAssociates: async (req, res, next) => {
        if (req.user && req.user.id) {
            db.user.findAll({
                include: [
                    {
                        model: db.associate,
                        where: { admin_id: req.user.id },
                        as: "associatiation"
                    }
                ]
            }).then(resp => {
                res.send(resp)
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: `${err}`
                })
            })
        } else {
            res.sendStatus(406)
        }
    },
    getAssociate: async (req, res, next) => {
        if (req.user && req.user.id) {
            try {
                let id = req.params.id;

                db.user.findByPk(id, { include: 'user_role' }).then(async ress => {
                    let repss = JSON.parse(JSON.stringify(ress));
                    let contacts = await db.org_contacts.findAll({ where: { user_id: repss.id } });
                    if (!!contacts && !!contacts.length) {
                        contacts.forEach(element => {
                            repss[element.type] = { full_name: element.full_name, phone: element.phone, email: element.email }
                        });
                    }
                    res.send(repss)
                }).catch(err => {
                    res.status(400).send({
                        status: false,
                        errors: `${err}`
                    })
                })

            } catch (error) {
                res.status(400).send({
                    status: false,
                    errors: `${error}`
                })
            }


        } else {
            res.sendStatus(406)
        }
    },
    deleteAssociate: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            let check = await db.associate.findOne({ where: { admin_id: req.user.id, associate: data.user_id } });
            if (!!check) {
                let model = req.params.model;
                let inst = null;
                switch (model) {
                    case 'education':
                        inst = db.user_education.destroy({ where: { id: data.id, user_id: data.user_id } });
                        break;
                    case 'practice':
                        inst = db.user_practice.destroy({ where: { id: data.id, user_id: data.user_id } });
                        break;
                    case 'license':
                        inst = db.user_license.destroy({ where: { id: data.id, user_id: data.user_id } });
                        break;
                    case 'skill':
                        inst = db.user_service.destroy({ where: { id: data.id } });
                        break;
                    default:
                        inst = Promise.resolve();
                }
                inst.then(async resp => {
                    res.send({
                        status: true,
                        message: 'deleted successfully'
                    })
                }).catch(err => {
                    res.status(400).send({
                        status: false,
                        errors: `${err}`
                    })
                })
            } else {
                res.status(400).send({
                    status: false, errors: 'unauthorised', data: [req.user.id, data.id]
                })
            }
        } else {
            res.sendStatus(406)
        }
    },
    addEducation: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            let check = await db.associate.findOne({ where: { admin_id: req.user.id, associate: data.user_id } });
            if (!!check) {
                db.user_education.upsert(data).then(async resp => {
                    res.send(resp)
                }).catch(err => {
                    res.status(400).send({
                        status: false,
                        errors: `${err}`
                    })
                })
            } else {
                res.status(400).send({
                    status: false, errors: 'unauthorised', data: [req.user.id, data.id]
                })
            }
        } else {
            res.sendStatus(406)
        }
    },
    addPractice: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            let check = await db.associate.findOne({ where: { admin_id: req.user.id, associate: data.user_id } });
            if (!!check) {
                db.user_practice.upsert(data).then(async resp => {
                    res.send(resp)
                }).catch(err => {
                    res.status(400).send({
                        status: false,
                        errors: `${err}`
                    })
                })
            } else {
                res.status(400).send({
                    status: false, errors: 'unauthorised', data: [req.user.id, data.id]
                })
            }
        } else {
            res.sendStatus(406)
        }
    }
    , addLicense: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            let check = await db.associate.findOne({ where: { admin_id: req.user.id, associate: data.user_id } });
            if (!!check) {
                db.user_license.upsert(data).then(async resp => {
                    res.send(resp)
                }).catch(err => {
                    res.status(400).send({
                        status: false,
                        errors: `${err}`
                    })
                })
            } else {
                res.status(400).send({
                    status: false, errors: 'unauthorised', data: [req.user.id, data.id]
                })
            }
        } else {
            res.sendStatus(406)
        }
    }
    , addSkill: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            let check = await db.associate.findOne({ where: { admin_id: req.user.id, associate: data.user_id } });
            if (!!check) {

                db.user_service.upsert(data).then(async resp => {
                    res.send(resp)
                }).catch(err => {
                    res.status(400).send({
                        status: false,
                        errors: `${err}`
                    })
                })
                try {
                    if (data.department.title + ''.toLowerCase().includes('covid')) {
                        var user = await db.user.findOne({ where: { id: data.user_id } });
                        user = JSON.parse(JSON.stringify(user));
                        if (!user) return;

                        var password = generator.generate({ length: 10, numbers: true });

                        bcrypt.genSalt(10, async function (err, salt) {
                            bcrypt.hash(password, salt, async function (err, hashPassword) {
                                if (err) return;
                                await db.user.update({ password: hashPassword, status: 1 }, { where: { id: data.user_id } });
                                crmTrigger('Covid19_New_User_Email', { email: user.email, subject: 'Docty Health Care: portal Access', password: password, byname: req.user.first_name }, user.lang || req.lang)
                            });
                        })
                    }
                } catch (e) { console.log(e) }
            } else {
                res.status(400).send({
                    status: false, errors: 'unauthorised', data: [req.user.id, data.id]
                })
            }
        } else {
            res.sendStatus(406)
        }
    },

    //deprecated
    mystaff: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            var status = 0;
            if (data.status) status = data.status;
            let include = [
                {
                    model: db.user_role,
                    as: 'user_role',
                    where: {
                        role_id: { [Op.in]: data.roles_list }
                    }
                },
                {
                    model: db.associate,
                    as: 'associate',
                    where: { admin_id: req.user.id },
                    include: ['admin']
                },
                'services',
                'user_location',
                {
                    model: db.location_open,
                    as: 'location_open',
                    include: ['times']
                }
            ]

            if (data.roles_list) {
                db.user.findAll({
                    include: include,
                    where: {
                        status: status
                    }
                }).then(resp => {
                    res.send(resp)
                }).catch(err => {
                    console.log(err)
                    res.status(400).status({
                        status: false,
                        errors: `${err}`
                    })
                })
            }
            else if (req.body.need_location_time) {
                db.user.findAll({
                    include: [{
                        model: db.user_role,
                        as: 'user_role',
                        where: { role_id: data.role }
                    },
                    {
                        model: db.associate,
                        as: 'associate',
                        where: { admin_id: req.user.id },
                        include: ['admin']
                    },
                        'services',
                        'user_location',
                    {
                        model: db.location_open,
                        as: 'location_open',
                        include: ['times']
                    }
                    ],
                    where: {
                        status: status
                    }
                }).then(resp => {
                    res.send(resp)
                }).catch(err => {
                    console.log(err)
                    res.status(400).status({
                        status: false,
                        errors: `${err}`
                    })
                })
            }
            else {

                db.user.findAll({
                    include: [{
                        model: db.user_role,
                        as: 'user_role',
                        where: { role_id: data.role }
                    },
                    {
                        model: db.associate,
                        as: 'associate',
                        where: { admin_id: req.user.id },
                        include: ['admin']
                    },
                        'services',
                    ],
                    where: { status: status }
                }).then(resp => {
                    res.send(resp)
                }).catch(err => {
                    console.log(err)
                    res.status(400).send({
                        status: false,
                        errors: `${err}`
                    })
                })
            }

        } else {
            res.sendStatus(406)
        }
    },
    mystaff_Ex: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;

            let search = data.search || "";
            let page = data.page || 1;
            let pageSize = data.pageSize || 25;
            let orderKey = data.orderKey || "id";
            let order = data.order || "asc";

            let where = {};
            var status = 0;
            if (data.status) status = data.status;
            where.status = status;

            if (search && search.length) {
                where = {
                    ...where,
                    [Op.or]: [
                        { 'first_name': { [Op.like]: `%${search}%` } },
                        { 'middle_name': { [Op.like]: `%${search}%` } },
                        { 'last_name': { [Op.like]: `%${search}%` } },
                        { 'email': { [Op.like]: `%${search}%` } },
                        { 'company_name': { [Op.like]: `%${search}%` } },
                        { 'phone_number': { [Op.like]: `%${search}%` } },
                    ]
                }
            }

            var roles_list = data.roles_list || [1]//doctor
            let include = [
                {
                    model: db.user_role,
                    as: 'user_role',
                    where: {
                        role_id: { [Op.in]: roles_list }
                    }
                },
                {
                    model: db.associate,
                    as: 'associate',
                    where: { admin_id: req.user.id },
                    include: ['admin']
                },
                'services',
                'user_location',
                {
                    model: db.location_open,
                    as: 'location_open',
                    include: ['times'],
                    required: false
                }
            ]

            db.user.findAndCountAll({
                include: include,
                order: [[orderKey, order]],
                distinct: true,
                limit: getLimitOffset(page, pageSize),
                where: where
            }).then(resp => {
                response(res, resp);
            }).catch(err => {
                console.log(err)
                res.status(400).status({
                    status: false,
                    errors: `${err}`
                })
            })

        } else {
            res.sendStatus(406)
        }
    },
    deleteSatff: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            let check = await db.associate.findOne({ where: { admin_id: req.user.id, associate: data.id } });
            if (!!check) {
                db.user.destroy({ where: { id: data.id } }).then(async resp => {
                    res.send({
                        status: true,
                        message: 'deleted successfuly'
                    })
                }).catch(err => {
                    res.status(400).send({
                        status: false,
                        errors: `${err}`
                    })
                })
            } else {
                res.status(400).send({
                    status: false, errors: 'unauthorised', data: [req.user.id, data.id]
                })
            }
        } else {
            res.sendStatus(406)
        }
    },
    async downloadCSV(req, res, next) {
        var query = req.query;
        if (query.status == null || query.role == null || query.user_id == null) {
            res.status(404).send({
                status: false,
                errors: `require status, role, user_id`
            })
            return;
        }
        var status = 0;
        if (query.status) status = parseInt(query.status);

        var where = {};
        var roles_list = []

        if (query.role == 'doctor_and_nurse') {
            roles_list = [1, 3];
        } else {
            roles_list = [parseInt(query.role)];
        }

        if (query.from) {
            where['createdAt'] = { [Op.gte]: (new Date(query.from)) }
        }
        if (query.to) {
            where['createdAt'] = { [Op.lte]: (new Date(query.to)) }
        }

        if (query.from && query.to) {
            where['createdAt'] = { [Op.and]: [{ [Op.gte]: (new Date(query.from)) }, { [Op.lte]: (new Date(query.to)) }] }
        }
        where['status'] = status;
        console.log(roles_list)

        var attributes = [];
        if (query.includes) {
            attributes = query.includes.split(',');
        }

        var include = [{
            model: db.user_role,
            as: 'user_role',
            include: ['role_info'],
            where: {
                role_id: { [Op.in]: roles_list }
            }
        },
        {
            model: db.associate,
            as: 'associate',
            include: ['admin'],
            where: { admin_id: parseInt(query.user_id) }
        }
        ];

        if (attributes.indexOf('speciality') > 0) {
            include.push('services');
        }

        db.user.findAll({
            include: include,
            where: where
        }).then(resp => {
            var user_list = JSON.parse(JSON.stringify(resp));
            res.setHeader('Content-disposition', 'attachment; filename=user_list.csv');
            res.setHeader('Content-type', 'text/csv');
            res.charset = 'UTF-8';

            var csv = 'First Name,Mid Name,Last Name,Email,Gender,Phone Number\n';
            if (attributes && attributes.length > 0) {
                csv = attributes.map(item => capitalize(item)).join(',') + '\n';
            }
            console.log(user_list)
            for (var i = 0; i < user_list.length; i++) {
                var user = user_list[i];
                if (user && user.user_role && user.user_role.role_info) {
                    user.user_type = user.user_role.role_info.role;
                }
                if (user.services) {
                    user['speciality'] = (user.services || []).map(item => `(${item.service})`).join(' ');
                }

                if (user.associate != null && user.associate[0] != null && user.associate[0] && user.associate[0].admin != null)
                    user.associate = user.associate[0].admin.fullName;

                if (attributes && attributes.length > 0) {
                    csv += attributes.map(includeColumn => user[includeColumn] || '').join(',') + '\n';
                } else {
                    csv += `${user.first_name},${user.middle_name},${user.last_name},${user.email},${user.gender},${user.phone_number}\n`
                }
            }

            res.write(csv);
            res.end();
        }).catch(err => {
            console.log(err)
            res.status(400).send({
                status: false,
                errors: `${err}`
            })
        })
    },
}