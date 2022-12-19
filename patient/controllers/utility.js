const Sequelize = require('sequelize');
const config = require('../../config/config.json');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');
const request = require('request');
var rp = require('request-promise');
var infermedicHeaders = config.infermedicHeaders;


module.exports = {
    infermediacaInterview: async (req, res, next) => {
        // let header = infermedicHeaders;
        let header = JSON.parse(JSON.stringify(infermedicHeaders));
        // if (req.lang)
        //   header.Model = `infermedica-${req.lang}`;
        let evidence = req.body.evidence || [];
        let queryArr = evidence.map(e => e.id);
        let options1 = {
            uri: 'https://api.infermedica.com/v3/recommend_specialist',
            headers: header,
            json: true
        };
        let options2 = {
            uri: `https://api.infermedica.com/v3/concepts?ids=${queryArr.join(',')}`,
            headers: header,
            json: true
        };
        Promise.all([
            rp(options1),
            rp(options2)
        ]).then(data => {
            const rf = data[0] || {};
            const symptoms = data[1] || [];
            let praparedData = {
                present: [], absent: [], unknown: [], symptoms: []
            };
            evidence.forEach(element => {
                let symptom = symptoms.find(e => e.id == element.id);
                if (symptom) {
                    if (!!element.initial || (!!element.source && element.source == "initial"))
                        praparedData.symptoms = praparedData.symptoms || [];
                    praparedData.symptoms.push(symptom);
                } else {
                    if (element.choice_id == 'present') {
                        praparedData.present = praparedData.present || [];
                        praparedData.present.push(symptom);
                    }
                    if (element.choice_id == 'absent') {
                        praparedData.absent = praparedData.absent || [];
                        praparedData.absent.push(symptom);
                    }
                    if (element.choice_id == 'unknown') {
                        praparedData.unknown = praparedData.unknown || [];
                        praparedData.unknown.push(symptom);
                    }
                }
            });
            res.send(praparedData);
        }).catch(e => res.send(e));
    },
    servicePricing: async (req, res, next) => {
        try {
            let user_id = req.params.id;
            let services = await db.user_service.findAll({ where: { user_id } });
            let associate = await db.associate.findOne({ where: { associate: req.params.id } });
            if (!!associate) {
                user_id = associate.user_id;
                let ids = services.map(r => r.speciality_id);
                return db.user_service.findAll({
                    where: {
                        user_id,
                        price: { [Op.gt]: 0 },
                        speciality_id: { [Op.in]: ids }
                    }
                })
                    .then(resp => response(res, resp))
                    .catch(err => errorResponse(res, err));
            } else {
                return response(res, services);
            }

        } catch (error) {
            return errorResponse(res, error);
        }
    },
    specialityList: async (req, res, next) => {
        if (req.user && req.user.id) {
            let title_kay = "title";
            let detail_kay = "details";
            if (req.lang == 'es') {
                title_kay = "title_es";
                detail_kay = "details_es";
            }
            try {
                var data = req.body;
                var user_id = data.user_id || req.user.id;

                var dated = null;
                let endDate = null;
                if (data.dated) {
                    dated = new Date(data.dated);

                    if (data.date_to) {
                        endDate = new Date(data.date_to);
                    } else {
                        endDate = new Date(data.dated);
                        endDate.setHours(0);
                        endDate.setMinutes(0);
                        endDate.setSeconds(0);
                        endDate.setDate(endDate.getDate() + 1);
                    }

                }
                let idList = [];
                for (let key in global.onlineSocket) {
                    try {
                        if (key && key.includes('userid')) {
                            let id = key.replace('userid', '');
                            if (!!(+id)) {
                                idList.push(+id);
                            }
                        }
                    } catch (error) {

                    }
                }
                if (idList.length == 0 && !!!req.body.showAlsoOffline) {
                    return res.send([]);
                }
                var userWhere = ` "user_service->user"."isAvailableStatus" = true  AND "user_service->user"."id" IN (${idList.join(',')}) AND `;
                if (req.body.showAlsoOffline) {
                    userWhere = '';
                }

                var patient_user_insurance_id = null;
                var patient_user_insurance = await db.user_insurance.findOne({ where: { user_id: user_id } });
                if (patient_user_insurance) patient_user_insurance_id = patient_user_insurance.company;
                var type_code = 'video_call' || data.type_code;
                var sql_company = '';//associated 
                var sql_independent = '';// independent

                var slot_query = '';
                if (dated) {
                    slot_query = `
                INNER JOIN "schedules" AS "user_service->user->schedule" ON "user_service->user"."id" = "user_service->user->schedule"."user_id"
                    AND "user_service->user->schedule"."start" >= '${dated.toISOString()}'
                    AND "user_service->user->schedule"."end" <= '${endDate.toISOString()}'
                    AND "user_service->user->schedule"."calendarId" IN (4)
                    AND "user_service->user->schedule"."state" != 'Busy'  `;
                }

                sql_company =
                    `
                        SELECT "speciality"."id",
                    COUNT(DISTINCT "user_service"."id") AS doctor_number,
                    "speciality"."role_id",
                    "speciality"."department_id",
                    "speciality"."${title_kay}" as "title",
                    "speciality"."${detail_kay}" as "details",
                    "speciality"."symbol",
                    "speciality"."deleted_at",
                    "speciality"."status",
                    "user_service"."id" AS "user_service.id"
                FROM "specialities" AS "speciality"
                    INNER JOIN "user_services" AS "user_service" ON "speciality"."id" = "user_service"."speciality_id"
                    INNER JOIN "users" AS "user_service->user" ON "user_service"."user_id" = "user_service->user"."id"
                    AND ("user_service->user"."deletedAt" IS NULL)
                    ${slot_query}
                    LEFT OUTER JOIN (
                        "associates" AS "user_service->associatedTo"
                        INNER JOIN "company_services" AS "user_service->associatedTo->company_service" ON "user_service->associatedTo"."user_id" = "user_service->associatedTo->company_service"."user_id"
                        AND "user_service->associatedTo->company_service"."copay" > 0
                        AND "user_service->associatedTo->company_service"."type_code" = '${type_code}'
                        AND (
                            "user_service->associatedTo->company_service"."insurance_provider_id" = '${patient_user_insurance_id}'
                            OR "user_service->associatedTo->company_service"."insurance_provider_id" IS NULL
                        )
                        LEFT OUTER JOIN "user_specialities" AS "user_service->associatedTo->company_service->user_speciality" ON "user_service->associatedTo->company_service"."user_speciality_id" = "user_service->associatedTo->company_service->user_speciality"."id"
                    ) ON "user_service"."user_id" = "user_service->associatedTo"."associate"
                WHERE  ${userWhere} (
                        ("user_service"."price" > 0)
                        OR (
                            "user_service->associatedTo->company_service"."copay" > 0
                            AND "user_service->associatedTo->company_service->user_speciality"."speciality_id" = "speciality"."id"
                            AND "user_service->user"."expertise_level" = "user_service->associatedTo->company_service"."expertise_level"
                        )
                    )
                GROUP BY "speciality"."id"
                `;
                sql_independent =
                    `
                    SELECT "speciality"."id",
                COUNT(DISTINCT "user_service"."id") AS doctor_number,
                "speciality"."role_id",
                "speciality"."department_id",
                "speciality"."${title_kay}" as "title",
                "speciality"."${detail_kay}" as "details",
                "speciality"."symbol",
                "speciality"."deleted_at",
                "speciality"."status",
                "user_service"."id" AS "user_service.id"
            FROM "specialities" AS "speciality"
                INNER JOIN "user_services" AS "user_service" ON "speciality"."id" = "user_service"."speciality_id" AND "user_service"."price" > 0 
                INNER JOIN "users" AS "user_service->user" ON "user_service"."user_id" = "user_service->user"."id"
                AND ("user_service->user"."deletedAt" IS NULL)
                ${slot_query}
                LEFT OUTER JOIN (
                    "associates" AS "user_service->associatedTo"
                ) ON "user_service"."user_id" = "user_service->associatedTo"."associate"
            WHERE ${userWhere} (
                    ("user_service->associatedTo"."user_id" IS NULL)
                )
            GROUP BY "speciality"."id"
        `;


                var sql = `(${sql_company}) UNION (${sql_independent})`;

                // Replace " with `
                sql = sql.replace(/\"/gi, "`");

                console.log(sql);
                db.sequelize.query(sql).spread(resp => {
                    res.send(resp);
                }).catch(error => errorResponse(res, error));
            } catch (error) {
                console.log(error);
                return errorResponse(res, error);
            }
        } else {
            res.sendStatus(406);
        }
    }
};