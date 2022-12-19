const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { upload } = require('../../commons/fileupload');
const { generateToken } = require('../../commons/helper');

const { queueEmail } = require('../../commons/jobs');

const { messageTemplate } = require('../../templates/normal_message');

const NOTIFICATION_EMAIL = 'reviewer.docty@gmail.com';

var getUserIdList = async (isStaff) => {
    var associateUserIdWhere = 'AND associates.id IS NULL'//independent
    if (isStaff) {
        associateUserIdWhere = 'AND associates.id IS NOT NULL'//clinic
    }

    var sql =
        `
        SELECT user.id
        FROM users AS user
            INNER JOIN user_roles AS user_role ON user.id = user_role.user_id AND user_role.role_id in (1,3)
            LEFT OUTER JOIN associates AS associates ON user.id = associates.associate
        WHERE (
                user.deletedAt IS NULL
                ${associateUserIdWhere}
            );
        `;
    var queryResult = await db.queryRun(sql);
    var idList = queryResult.map(item => item.id);
    return idList;
}


var getClinicIdList = async () => {
    var role = 5;//Clinic

    var sql =
        `
        SELECT user.id
        FROM users AS user
            INNER JOIN user_roles AS user_role ON user.id = user_role.user_id AND user_role.role_id = ${role}
        WHERE (
                user.deletedAt IS NULL
            );
        `;
    var queryResult = await db.queryRun(sql);
    var idList = queryResult.map(item => item.id);
    return idList;
}


module.exports = {
    async addDepartment(req, res, next) {
        let data = req.body;
        try {
            let resp = await db.department.upsert(data);
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
    },
    async deleteDepartment(req, res, next) {
        let data = req.body;
        try {
            let resp = await db.department.destroy({ where: { id: data.id } });
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
    },
    async addSpeciality(req, res, next) {
        let data = req.body;
        try {
            let resp = await db.speciality.upsert(data);
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
    },
    async deleteSpeciality(req, res, next) {
        let data = req.body;
        try {
            await db.speciality.destroy({ where: { id: data.id } }).then(resp => {
                res.send({
                    status: true,
                    data: resp
                })
            }).catch(err => {
                res.send({
                    status: true,
                    data: `${err}`
                })
            })

        } catch (error) {
            res.status(400).send({
                status: false,
                errors: error
            })
        }
    },

    async addCounsellingType(req, res, next) {
        let data = req.body;
        try {
            let resp = await db.counselling_type.upsert(data);
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
    },
    async deleteCounsellingType(req, res, next) {
        let data = req.body;
        try {
            let resp = await db.counselling_type.destroy({ where: { id: data.id } });
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
    },


    async addSlot(req, res, next) {
        let data = req.body;
        try {
            let resp = await db.slot.upsert(data);
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
    },
    async addPricing(req, res, next) {
        let data = req.body;
        try {
            let resp = await db.pricing.upsert(data);
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
    },
    async deletePricing(req, res, next) {
        let data = req.body;
        try {
            let resp = await db.pricing.destroy({ where: { id: data.id } });
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
    },

    async getDepartments(req, res, next) {
        let where = {};
        if (req.query.title) {
            where.title = {
                [Op.like]: '%' + req.query.title + '%'
            }
        }
        if (req.query.status) {
            where.status = req.query.status;
        }

        try {
            let resp = await db.department.findAll({ where, include: ['specialities'] });
            res.send(resp)
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: error
            })
        }
    },
    async getSpecialities(req, res, next) {
        let where = {};
        if (req.query.title) {
            where.title = {
                [Op.like]: '%' + req.query.title + '%'
            }
        }
        if (req.query.department_id) {
            where.department_id = req.query.department_id;
        }
        if (req.query.status) {
            where.status = req.query.status;
        }

        try {
            let resp = await db.speciality.findAll({ where, include: ['department'] });
            res.send(resp)
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: error
            })
        }
    },
    async getCounsellingTypes(req, res, next) {
        let where = {};
        if (req.query.title) {
            where.title = {
                [Op.like]: '%' + req.query.title + '%'
            }
        }
        if (req.query.status) {
            where.status = req.query.status;
        }

        try {
            let resp = await db.counselling_type.findAll({ where: where });
            res.send(resp)
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: error
            })
        }
    },
    async getSlots(req, res, next) {
        let where = {};
        if (req.query.counselling_type) {
            where.counselling_type = req.query.counselling_type;
        }
        if (req.query.status) {
            where.status = req.query.status;
        }

        try {
            let resp = await db.slot.findAll({ where: where });
            res.send(resp)
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: error
            })
        }
    },
    async getPricings(req, res, next) {
        let query = `SELECT a.id, a.department_id, a.speciality_id,a.counselling_type,a.slot_id,a.cost,a.status,b.title AS department, c.title AS speciality,d.duration AS slot,e.title AS councelling
        FROM pricings a, departments b, specialities c, slots d, counselling_types e
        WHERE b.id = a.department_id AND c.id = a.speciality_id AND d.id = a.slot_id AND e.id = a.counselling_type`;

        if (req.query.department_id) {
            query = query + ' AND a.department_id = ' + req.query.department_id;
        }
        if (req.query.speciality_id) {
            query = query + ' AND a.speciality_id = ' + req.query.speciality_id;
        }
        if (req.query.counselling_type) {
            query = query + ' AND a.counselling_type = ' + req.query.counselling_type;
        }
        if (req.query.slot_id) {
            query = query + ' AND a.slot_id = ' + req.query.slot_id;
        }
        if (req.query.cost) {
            query = query + ' AND a.cost = ' + req.query.cost;
        }
        if (req.query.status) {
            query = query + ' AND a.status = ' + req.query.status;
        }

        try {
            let resp = await db.sequelize.query(query);
            res.send(resp[0])
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: error
            })
        }
    },
    async uploadSymbol(req, res, next) {
        upload(req, 'symbol', 'file').then(async (resp) => {
            res.send({
                status: true,
                path: resp.path
            }).catch(err => {
                res.status(404).json({
                    error: true,
                    status: false,
                    errors: `${err}`
                })
            })
        })
    },
    async addEmailConversation(req, res, next) {
        let data = req.body;
        try {
            queueEmail(data.user.email, data.subject, { html: messageTemplate(data.user.first_name, data.subject, data.message) })
                .then(resp => {
                    res.status(200).send({
                        error: false,
                        status: "Success",
                        message: 'Message is sent successfully'
                    })
                }).catch(err => {
                    console.log(err)
                    res.status(500).json({
                        errors: err,
                        status: false,
                        message: 'Something went wornd',
                    })
                })
        } catch (error) {
            console.log(error)
            res.status(400).send({
                status: false,
                errors: error
            })
        }
    },
    async addEmailNotification(req, res, next) {
        let data = req.body;
        try {
            queueEmail(NOTIFICATION_EMAIL, data.subject, { html: messageTemplate('Administrator', data.subject, data.message) })
                .then(resp => {
                    res.status(200).send({
                        error: false,
                        status: "Success",
                        message: 'Message is sent successfully'
                    })
                }).catch(err => {
                    res.status(500).json({
                        errors: err,
                        status: false,
                        message: 'Something went wornd',
                    })
                })
        } catch (error) {
            console.log(error)
            res.status(400).send({
                status: false,
                errors: error
            })
        }
    },
    async getEmailConversation(req, res, next) {
        let where = {};
        if (req.query.from) {
            where.from = req.query.from;
        }
        if (req.query.to) {
            where.to = req.query.to;
        }
        if (req.query.status) {
            where.status = req.query.status;
        }

        try {
            let resp = await db.email_conversation.findAll({ where: where });
            res.send(resp)
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: error
            })
        }
    },

    /**contracts */
    async getContractType(req, res) {
        try {
            var where = {};
            if (req.query && req.query.id) where.id = req.query.id;
            let result = await db.contractType.findAll({
                include: [{
                    model: db.contract_template,
                    as: 'contract_template',
                    where: { isActive: true },
                    required: false
                }],
                where: where
            });
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error}`
            })
        }
    },

    async addcontract(req, res) {
        try {
            let result = await db.contractType.create(req.body);
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error}`
            })
        }
    },

    async updatecontract(req, res) {
        try {
            const { id } = req.params;
            let result = await db.contractType.update(req.body, { where: { id } });
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error}`
            })
        }
    },
    async deletecontract(req, res) {
        try {
            const { id } = req.params;
            let result = await db.contractType.destroy({ where: { id } });
            res.status(200).json({
                status: true,
                data: []
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error}`
            })
        }
    },

    /** specialist */

    async updateSpecialist(req, res) {
        try {
            let update = await db.speciality.update(req.body, { where: { id: req.params.id } });
            res.status(200).json({
                status: true,
                data: update
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error}`
            })
        }
    },

    async deleteSpecialist(req, res) {
        try {
            let { id } = req.params;
            let deleted = await db.speciality.destroy({ where: { id } });
            res.status(200).json({
                status: true,
                data: deleted
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error}`
            })
        }
    },
    /**get contract template */
    async getTemplates(req, res) {
        try {
            var whereContractType = {};
            if (req.query && req.query.type_id) whereContractType.id = req.query.type_id;
            let result = await db.contract_template.findAll({
                include: [{
                    model: db.contractType,
                    as: 'contractType',
                    required: whereContractType.id !== null,
                    where: whereContractType
                },],
                order: [['type_id', 'ASC'], ['isActive', 'DESC'], ['version', 'DESC'], ['isPublished', 'DESC']]
            });
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error}`
            })
        }
    },

    async getTemplate(req, res) {
        let { id } = req.params;
        try {
            let result = await db.contract_template.findOne(
                {
                    include: ['contractType'],
                    where: { id }
                }
            );
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error}`
            })
        }
    },

    async getContractShortcodes(req, res) {
        try {
            let result = await db.contract_shortcode.findAll(
            );
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error}`
            })
        }
    },

    async updateContractShortcode(req, res) {
        try {
            let result = await db.contract_shortcode.upsert(req.body);
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error}`
            });
        }
    },

    async deleteContractShortcode(req, res) {
        try {
            let result = await db.contract_shortcode.destroy({ where: { id: req.body.id } });

            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error}`
            })
        }
    },

    async contract_footer_template(req, res) {
        try {
            let result = await db.contract_template.findAll(
                {
                    where: { title: { [Op.like]: '%' + 'contract_footer_' + '%' } }
                }
            );
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error}`
            })
        }
    },

    async addTemplates(req, res) {
        try {
            let result = await db.contract_template.create(req.body);
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error}`
            })
        }
    },

    async updateTemplates(req, res) {
        try {
            let update = db.contract_template.update(req.body, { where: { id: req.params.id } });
            res.status(200).json({
                status: true,
                data: update
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error}`
            })
        }
    },

    async publishTemplates(req, res) {
        try {
            var contract_template = await db.contract_template.findOne({ where: { id: req.params.id }, include: ['contractType'] });
            var version = 0;
            var prevContractTemplate = await db.contract_template.findOne({ where: { type_id: contract_template.type_id, isActive: 1 } });
            if (prevContractTemplate) version = prevContractTemplate.version || 0;


            await db.contract_template.update({ isActive: 0 }, { where: { type_id: contract_template.type_id } });

            let update = await db.contract_template.update({ isPublished: 1, isActive: 1, version: version + 1 }, { where: { id: req.params.id } });

            if (contract_template && contract_template.contractType) {
                var idList = [];
                switch (contract_template.contractType.name) {
                    case 'Individual Doctor Contract':
                        idList = await getUserIdList(false);
                        break;
                    case 'Associated Doctor Contract':
                        idList = await getUserIdList(true);
                        break;
                    case 'Clinic Contract':
                        idList = await getClinicIdList();
                        break;
                }
                if (contract_template.end) await db.signedContract.update({ end: contract_template.end }, { where: { user_id: { [Op.in]: idList }, status: 1 } });
                else {
                    await db.signedContract.update({ status: 0 }, { where: { user_id: { [Op.in]: idList }, status: 1 } });

                    var userList = await db.user.findAll({
                        where: {
                            isSigned: true,
                            id: { [Op.in]: idList },
                        },
                        include: [
                            {
                                model: db.signedContract,
                                as: 'contract',
                                required: true,
                                attributes: [],
                                where: {
                                    status: 1
                                }
                            },
                        ],
                        attributes: ['id']
                    });

                    var userIdList = userList.map(u => u.id);
                    await db.user.update({ isSigned: false }, {
                        where: { id: { [Op.in]: userIdList } }
                    });
                }
            }
            res.status(200).json({
                status: true,
                data: update
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error}`
            });
        }
    },

    async deleteTemplates(req, res) {
        try {
            let del = db.contract_template.destroy({ where: { id: req.params.id } });
            res.status(200).json({
                status: true,
                data: del
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async sendContract(req, res) {
        try {
            var data = req.body;

            var subject = data.subject;
            var email = data.email_id;
            var user = await db.user.findOne({ where: { email: email } });
            if (user == null) {
                res.status(500).json({
                    errors: true,
                    status: false,
                    message: 'Cannot find user with email ' + email,
                })
            }
            var track = await db.contract_track.create({
                user_id: user.id,
                template_id: req.body.templateId,
                status: 0,
                first_name: data.first_name,
                last_name: data.last_name,
                subject: data.subject
            });

            let contract_template = await db.contract_template.findOne({ where: { id: req.body.templateId } });
            let template = contract_template.html;
            data.trackId = track.id;

            for (let key in data) {
                let str = "${" + key + "}"
                template = template.split(str).join(data[key]) //replace All
            }

            queueEmail(email, subject, { html: template })
                .then(resp => {
                    res.status(200).send({
                        error: false,
                        status: "Success",
                        message: 'Message is sent successfully'
                    })
                }).catch(err => {
                    res.status(500).json({
                        errors: err,
                        status: false,
                        message: 'Something went wornd',
                    })
                });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    /**get contract track */
    async getContrackTracks(req, res) {
        try {
            let result = await db.contract_track.findAll({
                include: ['user', {
                    model: db.contract_template,
                    as: 'template',
                    include: ['contractType']
                },]
            });
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async getContrackTrack(req, res) {
        let { id } = req.params;
        try {
            let result = await db.contract_track.findOne(
                {
                    include: ['user', 'template'],
                    where: { id }
                }
            );
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async updateContrackTrack(req, res) {
        try {
            let update = db.contract_track.update(req.body, { where: { id: req.params.id } });
            res.status(200).json({
                status: true,
                data: update
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async deleteContrackTracks(req, res) {
        try {
            let del = db.contract_track.destroy({ where: { id: req.params.id } });
            res.status(200).json({
                status: true,
                data: del
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    /** alergies */
    async getAllergies(req, res) {
        try {
            let allergies = await db.allergy.findAll();
            res.status(200).json({
                status: true,
                data: allergies
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async addAllergies(req, res) {
        try {
            let result = await db.allergy.create(req.body);
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async updateAllergies(req, res) {
        try {
            const { id } = req.params;
            let result = await db.allergy.update(req.body, { where: { id } });
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async deleteAllergies(req, res) {
        try {
            const { id } = req.params;
            let result = await db.allergy.destroy({ where: { id } });
            res.status(200).json({
                status: true,
                data: []
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    /** Document type */
    async getDocumentType(req, res) {
        try {
            let result = await db.documentType.findAll();
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async addDocumentType(req, res) {
        try {
            let result = await db.documentType.create(req.body);
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async updateDocumentType(req, res) {
        try {
            const { id } = req.params;
            let result = await db.documentType.update(req.body, { where: { id } });
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async deleteDocumentType(req, res) {
        try {
            const { id } = req.params;
            let result = await db.documentType.destroy({ where: { id } });
            res.status(200).json({
                status: true,
                data: []
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },
    /** chronic_condition */
    async getChronicCondition(req, res) {
        try {
            let result = await db.chronic_condition.findAll();
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async addChronicCondition(req, res) {
        try {
            let result = await db.chronic_condition.create(req.body);
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async updateChronicCondition(req, res) {
        try {
            const { id } = req.params;
            let result = await db.chronic_condition.update(req.body, { where: { id } });
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async deleteChronicCondition(req, res) {
        try {
            const { id } = req.params;
            let result = await db.chronic_condition.destroy({ where: { id } });
            res.status(200).json({
                status: true,
                data: []
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    /** medical condition */
    async getMedicationCondition(req, res) {
        try {
            let result = await db.medication_type.findAll();
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async addMedicationCondition(req, res) {
        try {
            let result = await db.medication_type.create(req.body);
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async updateMedicationCondition(req, res) {
        try {
            const { id } = req.params;
            let result = await db.medication_type.update(req.body, { where: { id } });
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async deleteMedicationCondition(req, res) {
        try {
            const { id } = req.params;
            let result = await db.medication_type.destroy({ where: { id } });
            res.status(200).json({
                status: true,
                data: []
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },
    /** Education type */
    async getEducationType(req, res) {
        try {
            let result = await db.educationType.findAll();
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async addEducationType(req, res) {
        try {
            let result = await db.educationType.create(req.body);
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async updateEducationType(req, res) {
        try {
            const { id } = req.params;
            let result = await db.educationType.update(req.body, { where: { id } });
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async deleteEducationType(req, res) {
        try {
            const { id } = req.params;
            let result = await db.educationType.destroy({ where: { id } });
            res.status(200).json({
                status: true,
                data: []
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    /** surgeries type */
    async getSurgery(req, res) {
        try {
            let result = await db.surgery.findAll();
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async addSurgery(req, res) {
        try {
            let result = await db.surgery.create(req.body);
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async updateSurgery(req, res) {
        try {
            const { id } = req.params;
            let result = await db.surgery.update(req.body, { where: { id } });
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async deleteSurgery(req, res) {
        try {
            const { id } = req.params;
            let result = await db.surgery.destroy({ where: { id } });
            res.status(200).json({
                status: true,
                data: []
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },
    /** Ethinicity type */
    async getEthnicityType(req, res) {
        try {
            let result = await db.ethnicityType.findAll();
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async addEthnicityType(req, res) {
        try {
            let result = await db.ethnicityType.create(req.body);
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async updateEthnicityType(req, res) {
        try {
            const { id } = req.params;
            let result = await db.ethnicityType.update(req.body, { where: { id } });
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async deleteEthnicityType(req, res) {
        try {
            const { id } = req.params;
            let result = await db.ethnicityType.destroy({ where: { id } });
            res.status(200).json({
                status: true,
                data: []
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    /** Profession type */
    async getProfessionType(req, res) {
        try {
            let result = await db.professionType.findAll();
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async addProfessionType(req, res) {
        try {
            let result = await db.professionType.create(req.body);
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async updateProfessionType(req, res) {
        try {
            const { id } = req.params;
            let result = await db.professionType.update(req.body, { where: { id } });
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async deleteProfessionType(req, res) {
        try {
            const { id } = req.params;
            let result = await db.professionType.destroy({ where: { id } });
            res.status(200).json({
                status: true,
                data: []
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    /** Relationship type */
    async getRelationshipType(req, res) {
        try {
            let result = await db.relationshipType.findAll();
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async addRelationshipType(req, res) {
        try {
            let result = await db.relationshipType.create(req.body);
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async updateRelationshipType(req, res) {
        try {
            const { id } = req.params;
            let result = await db.relationshipType.update(req.body, { where: { id } });
            res.status(200).json({
                status: true,
                data: result
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },

    async deleteRelationshipType(req, res) {
        try {
            const { id } = req.params;
            let result = await db.relationshipType.destroy({ where: { id } });
            res.status(200).json({
                status: true,
                data: []
            });
        } catch (error) {
            res.status(500).send({
                error_code: 105,
                status: false,
                error: `${error} `
            })
        }
    },
}
