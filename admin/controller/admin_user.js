
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const db = require("../../models");
const { crmTrigger } = require('../../commons/crmTrigger');
const { getNewPassword } = require('../../commons/helper');

const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');
const bcrypt = require('bcryptjs');
const { Parser, parse } = require('json2csv');

async function updateAdmin(data) {
    if (data.email || data.phone_number) {
        var admin = await db.admin.findOne({ where: { email: data.email, id: { [Op.ne]: data.id } } });
        if (admin) {
            throw 'EMAIL_UNAVALABLE';
        }
        admin = await db.admin.findOne({ where: { phone_number: data.phone_number, id: { [Op.ne]: data.id } } });
        if (admin) {
            throw 'PHONE_UNAVALABLE';
        }
    }
    return db.admin.update(data, { where: { id: data.id } }).then(async res => {
        return res;
    });
}


async function createAdmin(data, req) {

    var admin = await db.admin.findOne({ where: { email: data.email } });
    if (admin) {
        throw 'EMAIL_UNAVALABLE';
    }
    admin = await db.admin.findOne({ where: { phone_number: data.phone_number } });
    if (admin) {
        throw 'PHONE_UNAVALABLE';
    }

    var pwdObj = await getNewPassword();
    data.password = pwdObj.hashPassword;
    data.status = 0;
    data.email_verified = 1;
    // addActivityLog({ user_id: req.user.id, type: 'Patient_Allowed_Access'});
    return db.admin.create(data).then(async res => {
        crmTrigger('Associate_New_Admin', { email: data.email, subject: 'Docty Health Care: portal Access', password: pwdObj.password, byname: req.user.first_name }, req.lang);
        return await db.associate.create({ admin_id: data.user_id, associate: res.id }).then(() => {
            return res;
        }).catch(err => {
            throw err;
        });
    }).catch(err => {
        throw err;
    });
}

module.exports = {
    addAdmin: async (req, res, next) => {
        try {
            if (req.user && req.user.id) {
                let data = req.body;

                let resp;

                if (!!data.id) {
                    resp = updateAdmin(data);
                } else {
                    resp = createAdmin(data, req);
                }
                resp.then(response => {
                    res.send({ data: response, status: true });
                }).catch(err => {
                    console.log(err);
                    res.status(400).send({
                        status: false,
                        errors: `${err}`
                    });
                });

            } else {
                res.sendStatus(406);
            }
        } catch (e) {
            console.log(e);
        }
    },
    adminUsers: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            var where = {};
            if (data.id) where.id = data.id;
            if (data.status) where.status = data.status;
            db.admin.findAll({
                include: ['admin_role',
                    {
                        model: db.associate,
                        as: 'associate',
                        include: ['admin']
                    },
                ],
                where: where
            }).then(resp => {
                res.send(resp);
            }).catch(err => {
                console.log(err);
                res.status(400).send({
                    status: false,
                    errors: `${err}`
                });
            });
        } else {
            res.sendStatus(406);
        }
    },
    reviewerAdminUsers: async (req, res, next) => {
        if (req.user && req.user.id) {
            try {
                var adminList = await db.admin.findAll({
                    where: {
                        status: true,
                        isSuper: {
                            [Op.or]: [{ [Op.eq]: false }, { [Op.eq]: null }]
                        }
                    },
                    include: ['user_profile_reviewer',
                        {
                            model: db.role,
                            as: 'admin_role',
                            required: true,
                            include: [
                                {
                                    model: db.role_permission,
                                    as: 'role_permissions',
                                    required: true,
                                    include: [{
                                        required: true,
                                        model: db.permission,
                                        as: 'permission',
                                        where: {
                                            url: { [Op.like]: `%/profile-review%` }
                                        }
                                    }]
                                }
                            ]
                        }
                    ]
                });
                // var supperList = await db.admin.findAll({ where: { status: true, isSuper: true }, include: ['user_profile_reviewer'] });
                // adminList = adminList.concat(supperList);
                res.send(adminList);
            } catch (err) {
                res.status(400).send({
                    status: false,
                    errors: `${err}`
                });
            }
        } else {
            res.sendStatus(406);
        }
    },
    changePassword: async (req, res) => {
        if (req.user && req.user.id) {
            var password = req.body.password;

            bcrypt.genSalt(10, function (err, salt) {
                if (err) {
                    res.status(400).send({
                        status: false,
                        errors: `${err}`
                    });
                    return;
                }
                bcrypt.hash(password, salt, function (err, hashPassword) {
                    if (err) {
                        res.status(400).send({
                            status: false,
                            errors: `${err}`
                        });
                        return;
                    }

                    return db.admin.update({ password: hashPassword }, { where: { id: req.body.id } }).then(async resp => {
                        res.send(resp);
                    });
                });
            });

        } else {
            res.sendStatus(406);
        }
    },
    deleteAdmin: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;

            db.admin.destroy({
                where: {
                    id: data.id,
                    isSuper: {
                        [Op.or]:
                            [{ [Op.eq]: false }, { [Op.eq]: null }]
                    }
                }
            }).then(async resp => {
                res.send({
                    status: true,
                    message: 'deleted successfuly'
                });
            }).catch(err => {
                console.log(err);
                res.status(400).send({
                    status: false,
                    errors: `${err}`
                });
            });

        } else {
            res.sendStatus(406);
        }
    },
    async downloadCSV(req, res, next) {
        var query = req.query;
        if (query.status == null || query.role == null || query.user_id == null) {
            res.status(404).send({
                status: false,
                errors: `require status,role,user_id`
            });
            return;
        }
        var status = 0;
        if (query.status) status = parseInt(query.status);

        var where = {};
        var roles_list = [];

        if (query.role == 'doctor_and_nurse') {
            roles_list = [1, 3];
        } else {
            roles_list = [parseInt(query.role)];
        }

        if (query.from) {
            where['createdAt'] = { [Op.gte]: (new Date(query.from)) };
        }
        if (query.to) {
            where['createdAt'] = { [Op.lte]: (new Date(query.to)) };
        }

        if (query.from && query.to) {
            where['createdAt'] = { [Op.and]: [{ [Op.gte]: (new Date(query.from)) }, { [Op.lte]: (new Date(query.to)) }] };
        }
        where['status'] = status;
        console.log(roles_list);

        db.admin.findAll({
            include: ['admin_role',
                {
                    model: db.associate,
                    as: 'associate'
                }
            ],
            where: where
        }).then(resp => {
            var user_list = JSON.parse(JSON.stringify(resp));
            res.setHeader('Content-disposition', 'attachment; filename=user_list.csv');
            res.setHeader('Content-type', 'text/csv');
            res.charset = 'UTF-8';

            // var csv = 'First Name,Mid Name,Last Name,Email,Gender,Phone Number\n';
            const fields = ['first_name', 'middle_name', 'last_name', 'gender', 'email', 'phone_number'];
            const opts = { fields };
            const csv = parse(user_list, opts);
            // console.log(user_list);
            // for (var i = 0; i < user_list.length; i++) {
            //     var user = user_list[i];

            //     csv += `${user.first_name},${user.middle_name},${user.last_name},${user.email},${user.gender},${user.phone_number}\n`;
            // }

            res.write(csv);
            res.end();
        }).catch(err => {
            console.log(err);
            res.status(400).send({
                status: false,
                errors: `${err}`
            });
        });
    },
    addPermission(req, res, next) {
        if (req.user && req.user.id) {
            var data = req.body;
            db.permission.upsert(data).then(resp => {
                res.send(resp);
            }).catch(error => {
                res.status(500).send({
                    error_code: 105,
                    status: false,
                    error: `${error}`
                });
            });
        } else {
            res.sendStatus(406);
        }
    },
    permissionList(req, res, next) {
        if (req.user && req.user.id) {
            db.permission.findAll({ where: {} }).then(data => {
                res.send(data);
            }).catch(error => {
                res.status(500).send({
                    error_code: 105,
                    status: false,
                    error: `${error}`
                });
            });
        } else {
            res.sendStatus(406);
        }
    },
    permissionListPagination: async (req, res, next) => {
        if (req.user && req.user.id) {
            let search = "";
            let page = 1;
            let orderKey = "name";
            let order = "asc";
            if (req.body) {
                let data = req.body;
                search = data.search || "";
                orderKey = data.orderKey || "name";
                order = data.order || "asc";
                page = data.page || 1;
            }
            var where = {
                [Op.or]: [
                    { name: { [Op.like]: `%${search}%` } },
                    { url: { [Op.like]: `%${search}%` } },
                ]
            };

            db.permission.findAndCountAll({
                where: where,
                order: [[orderKey, order]],
                limit: getLimitOffset(page)
            }).then(resp => {
                return response(res, resp);
            }).catch(err => {
                return errorResponse(res, err);
            });
        } else {
            res.sendStatus(406);
        }
    },
    async deletePermission(req, res, next) {
        if (req.user && req.user.id && req.body.id) {
            try {
                let resp = await db.permission.destroy({ where: { id: req.body.id } });
                res.send({
                    status: true,
                    data: resp
                });
            } catch (error) {
                res.status(400).send({
                    status: false,
                    errors: error
                });
            }
        }
        else {
            res.sendStatus(406);
        }
    },
    async addRole(req, res, next) {
        if (req.user && req.user.id) {
            try {
                var data = req.body;

                data.group = 3;

                var resp;
                if (data.id) resp = await db.role.upsert(data);
                else resp = await db.role.create(data);

                if (data.id) resp = { id: data.id };

                await db.role_permission.destroy({ where: { role_id: resp.id } });

                if (data.permissions) {
                    data.permissions.forEach(async permission => {
                        let role_permission = await db.role_permission.findOrCreate({ where: { role_id: resp.id, permission_id: permission.id } });
                        await role_permission[0].update(permission);
                    });
                }

                res.send(resp);
            }
            catch (error) {
                res.status(500).send({
                    error_code: 105,
                    status: false,
                    error: `${error}`
                });
            }
        } else {
            res.sendStatus(406);
        }
    },
    async deleteRole(req, res, next) {
        if (req.user && req.user.id && req.body.id) {
            try {
                let resp = await db.role.destroy({ where: { id: req.body.id } });
                res.send({
                    status: true,
                    data: resp
                });
            } catch (error) {
                res.status(400).send({
                    status: false,
                    errors: error
                });
            }
        }
        else {
            res.sendStatus(406);
        }
    },
    roleList(req, res, next) {
        if (req.user && req.user.id) {
            db.role.findAll({ where: { group: 3 } }).then(data => {
                res.send(data);
            }).catch(error => {
                res.status(500).send({
                    error_code: 105,
                    status: false,
                    error: `${error}`
                });
            });
        }
        else {
            res.sendStatus(406);
        }
    },
    roleListPagination: async (req, res, next) => {
        if (req.user && req.user.id) {
            let search = "";
            let page = 1;
            let orderKey = "role";
            let order = "asc";
            if (req.body) {
                let data = req.body;
                search = data.search || "";
                orderKey = data.orderKey || "role";
                order = data.order || "asc";
                page = data.page || 1;
            }
            var where = {
                role: { [Op.like]: `%${search}%` },
                group: 3
            };

            db.role.findAndCountAll({
                where: where,
                order: [[orderKey, order]],
                limit: getLimitOffset(page),
                include: [
                    {
                        model: db.role_permission,
                        as: 'role_permissions',
                        include: ['permission']
                    },

                ]
            }).then(resp => {
                return response(res, resp);
            }).catch(err => {
                return errorResponse(res, err);
            });
        }
        else {
            res.sendStatus(406);
        }
    },
};