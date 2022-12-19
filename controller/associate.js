
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
var generator = require('generate-password');
const bcrypt = require('bcryptjs');

const db = require("../models");
const { crmTrigger, otpTrigger } = require('../commons/crmTrigger');
const { where } = require('sequelize');
const { findSuccessManager, userStatus } = require('../commons/helper');
const config = require(__dirname + '/../config/config.json');

async function updateAssociate(data) {

    var user = await db.user.findOne({ where: { email: data.email, id: { [Op.ne]: data.id } } });
    if (!!user && !!user.email) {
        throw 'EMAIL_UNAVALABLE';
    }
    user = await db.user.findOne({ where: { phone_number: data.phone_number, id: { [Op.ne]: data.id } } });
    if (!!user && !!user.phone_number) {
        throw 'PHONE_UNAVALABLE';
    }

    let check = await db.associate.findOne({ where: { user_id: data.user_id, associate: data.id } });
    // .then(r => r.update({ associate: data.id }));
    if (!!check) {
        return db.user.update(data, { where: { id: data.id } }).then(async res => {
            if (data.role) {
                await db.user_role.update({ role_id: data.role }, { where: { user_id: data.id } });
            }
            return res;
        })
    } else {
        throw new Error('unauthorised')
    }

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
    // addActivityLog({ user_id: req.user.id, type: 'Patient_Allowed_Access'});
    data.status = 0;
    data.email_verified = 1;
    let organization_logo = req.user.picture;
    let organization_name = req.user.company_name;
    data.need_password_reset = true;
    return db.user.create(data).then(async res => {
        crmTrigger('New_staff_Enrolled',
            {
                email: data.email,
                password: pwdObj.password,
                userName: data.first_name,
                organization_logo: organization_logo,
                organization_name: organization_name
            },
            req.lang)
        if (data.role) {
            await db.user_role.create({ user_id: res.id, role_id: data.role })
        }
        let user_address_id;
        // add user address
        try {
            if (data.location) {
                var location = data.location;
                location.user_id = res.id;
                // find country name
                if (location.country_id) {
                    var country = await db.country.findByPk(location.country_id)
                    if (country) location.country = country.name;
                }

                let address = await db.address.findOrCreate({ where: { user_id: res.id, family_id: location.family_id } });
                let resp = await address[0].update(location);
                user_address_id = address[0].id;
            }
        } catch (e) {
            console.log(e);
        }

        try {
            var admin = await findSuccessManager(user_address_id);
            if (admin && admin.id) {
                await db.user_profile_reviewer.upsert({ user_id: res.id, admin_id: admin.id });

                // ignore crmTrigger for automatic reviewer assign [https://doctyai.atlassian.net/browse/DBT-17]
                // crmTrigger('Reviewer_Assigned', { email: data.email, reviewer: admin.fullName, userName: data.first_name }, req.lang || 'en')
                // crmTrigger('New_Lead_Assigned', { email: admin.email, user: data.first_name, userName: admin.fullName, user_type: '' }, req.lang || 'en');
                // crmTrigger('staff_reviwer_assigned', {
                //     email: req.user.email, staff_name: data.first_name, staff_photo: data.picture, reviewer_name: admin.fullName, reviewer_photo: admin.picture, staff_email: data.email,
                //     company_name: req.user.company_name,
                //     staff_profile_link: `${config.domains.clinic}/my-staff/view/${res.id}`,
                // }, req.lang || 'en');

            }
        } catch (e) {
            console.log(e);
        }

        return await db.associate.create({ user_id: data.user_id, associate: res.id }).then(() => {
            return res
        }).catch(err => {
            throw err;
        })
    }).catch(err => {
        throw err;
    })
}

module.exports = {
    addAssociate: async (req, res, next) => {
        if (req.user && req.user.id) {
            try {
                let data = req.body;
                data['user_id'] = req.user.id;
                let resp;
                if (!!data.id) {
                    resp = updateAssociate(data)
                } else {
                    resp = createAssociate(data, req)
                }
                resp.then(response => {
                    res.send({ data: response, status: true })
                }).catch(err => {
                    console.log(err);
                    res.status(400).send({
                        status: false,
                        errors: `${err}`
                    })
                })
            } catch (err) {
                res.status(400).send({
                    status: false,
                    errors: `${err}`
                })
            }
        } else {
            res.sendStatus(406)
        }
    },
    getAssociates: async (req, res, next) => {
        db.user.findAll({
            include: [
                {
                    model: db.associate,
                    where: { user_id: req.user.id },
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
    },
    getAssociate: async (req, res, next) => {
        if (req.user && req.user.id) {
            try {
                let id = req.params.id;
                let check = await db.associate.findOne({ where: { user_id: req.user.id, associate: id } });
                if (!!!check) {
                    return res.status(403).send({
                        status: false,
                        errors: 'unauthorized'
                    })
                } else {
                    db.user.findByPk(id, { include: 'user_role' }).then(ress => {
                        res.send(ress)
                    }).catch(err => {
                        res.status(400).send({
                            status: false,
                            errors: `${err}`
                        })
                    })
                }

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
            let check = await db.associate.findOne({ where: { user_id: req.user.id, associate: data.user_id } });
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
            let check = await db.associate.findOne({ where: { user_id: req.user.id, associate: data.user_id } });
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
            let check = await db.associate.findOne({ where: { user_id: req.user.id, associate: data.user_id } });
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
            let check = await db.associate.findOne({ where: { user_id: req.user.id, associate: data.user_id } });
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
            let check = await db.associate.findOne({ where: { user_id: req.user.id, associate: data.user_id } });
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
    // staff list(doctor, nurse): who contains message log
    staffListContainsMessage: async (req, res, next) => {
        if (req.user && req.user.id) {

            let data = req.body;

            var roles_list = [1, 3];//doctor & nurse

            db.user.findAll({
                include: [
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
                        where: { user_id: req.user.id }
                    }
                ],
                where: { status: { [Op.gt]: 0 } }
            }).then(myStaff => {
                var staffIdList = [];
                if (myStaff) staffIdList = myStaff.map(item => item.id);

                db.message_log.findAll({ where: { [Op.or]: [{ sender: { [Op.in]: staffIdList } }, { receiver: { [Op.in]: staffIdList } }] }, order: [['createdAt', 'asc']], })
                    .then(messageList => {

                        var filteredStaffDictionary = {};
                        messageList.forEach(message => {
                            if (staffIdList.includes(message.sender)) filteredStaffDictionary[message.sender] = message
                            else if (staffIdList.includes(message.receiver)) filteredStaffDictionary[message.receiver] = message
                        });

                        var keys = Object.keys(filteredStaffDictionary);

                        var filteredUser = myStaff.filter(staff => keys.includes(staff.id + ''))
                        filteredUser = JSON.parse(JSON.stringify(filteredUser))
                        filteredUser.forEach(doc => {
                            doc.last_msg = filteredStaffDictionary[doc.id]
                        });

                        res.send(filteredUser)
                    })
                    .catch(err => {
                        res.status(400).status({
                            status: false,
                            errors: `${err}`
                        })
                    })

            }).catch(err => {
                res.status(400).status({
                    status: false,
                    errors: `${err}`
                })
            })

        } else {
            res.sendStatus(406)
        }
    },
    // staff list(doctor, nurse): who contains message log
    userListContainsMessageOfStaff: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            var staff_id = data.user_id;
            try {
                var sentMessageList = await db.message_log.findAll({ where: { sender: staff_id } })

                var filteredStaffDictionary = {};
                sentMessageList.forEach(message => {
                    filteredStaffDictionary[message.receiver] = message
                });
                var receivedMessageList = await db.message_log.findAll({ where: { receiver: staff_id } })
                receivedMessageList.forEach(message => {
                    filteredStaffDictionary[message.sender] = message
                });

                var userIdList = Object.keys(filteredStaffDictionary);

                var userList = await db.user.findAll({ where: { id: { [Op.in]: userIdList } } })
                res.send(userList);
            } catch (err) {
                res.status(400).status({
                    status: false,
                    errors: `${err}`
                })
            }
        } else {
            res.sendStatus(406)
        }
    },
    mystaff: async (req, res, next) => {
        if (req.user && req.user.id) {
            var user_id = req.user.id;
            if (req.query && req.query.user_id) {
                user_id = req.query.user_id;
            }
            let data = req.body;
            if (data.roles_list) {
                var where = {};
                if (data.status != null) {
                    where.status = data.status;
                }
                console.log(where)
                db.user.findAll({
                    include: [{
                        model: db.user_role,
                        as: 'user_role',
                        where: {
                            role_id: { [Op.in]: data.roles_list }
                        }
                    },
                    {
                        model: db.associate,
                        as: 'associate',
                        where: { user_id: user_id }
                    },
                    {
                        model: db.user_service,
                        as: 'services',
                        include: ['department', 'speciality']
                    },
                        'user_location',
                    {
                        model: db.location_open,
                        as: 'location_open',
                        include: ['times']
                    }
                    ],
                    where: where
                }).then(resp => {
                    res.send(resp)
                }).catch(err => {
                    console.log(err)
                    res.status(400).status({
                        status: false,
                        errors: `${err}`
                    })
                })
            } else {
                db.user.findAll({
                    include: [{
                        model: db.user_role,
                        as: 'user_role',
                        where: { role_id: data.role }
                    },
                    {
                        model: db.associate,
                        as: 'associate',
                        where: { user_id: user_id }
                    }
                    ]
                }).then(resp => {
                    res.send(resp)
                }).catch(err => {
                    res.status(400).status({
                        status: false,
                        errors: `${err}`
                    })
                })
            }
        } else {
            res.sendStatus(406)
        }
    },
    deleteSatff: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            let check = await db.associate.findOne({ where: { user_id: req.user.id, associate: data.id } });
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
        console.log(query)
        if (query.role == null || query.user_id == null) {
            res.status(404).send({
                status: false,
                errors: `Require user_id, role`
            })
            return;
        }

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

        if (query.status != null) {
            if (query.status == 1) where.status = query.status;
            else {
                where = {
                    ...where,
                    // [Op.or]: [
                    //     { status: 0 },
                    //     { status: null },
                    // ]
                };
            }
        }

        db.user.findAll({
            include: [{
                model: db.user_role,
                as: 'user_role',
                where: {
                    role_id: { [Op.in]: roles_list }
                }
            },
            {
                model: db.associate,
                as: 'associate',
                where: { user_id: parseInt(query.user_id) }
            }
            ],
            // where: where
        }).then(resp => {
            var user_list = JSON.parse(JSON.stringify(resp));
            res.setHeader('Content-disposition', 'attachment; filename=staff_list.csv');
            res.setHeader('Content-type', 'text/csv');
            res.charset = 'UTF-8';

            var csv = 'Full Name,Email,Gender,Phone Number,Account Status\n';
            for (var i = 0; i < user_list.length; i++) {
                var user = user_list[i];
                userStatus(user)
                csv += `${user.fullName},${user.email},${user.gender},${user.phone_number},${user.statusString}\n`
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
    async bulkUpdateUsersStatus(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body.users || [];
            try {

                var clinic = await db.user.findOne({ where: { id: req.user.id } });

                data.forEach(async user => {
                    await db.user.update({ status: user.status }, { where: { id: user.id } });
                    if (user.status == -1) {
                        db.approval_review.findOrCreate({ where: { section: 'suspended', user_id: user.id } }).then(async resp => resp[0].update({ remark: data.suspend_remarks, reviewer: req.user.id }));

                        crmTrigger('Clinic_Suspends_Staff_Account',
                            {
                                email: user.email,
                                user_name: user.fullName,
                                by_name: clinic.company_name,
                                suspend_remarks: data.suspend_remarks
                            },
                            user.lang || req.lang);
                    }

                });
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
        } else {
            res.sendStatus(406)
        }
    },
}