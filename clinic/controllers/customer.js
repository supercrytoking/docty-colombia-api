/* eslint-disable no-prototype-builtins */
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const db = require("../../models");
const {
    response,
    errorResponse,
    responseObject,
} = require("../../commons/response");

module.exports.myCustomers = async (req, res, next) => {
    let path = (req.path || '').replace(/\//g, '');
    let params = req.params;
    let search = "";
    let page = 1;
    let orderKey = "createdAt";
    let order = "desc";
    let pageSize = 25;
    let where = { status: true };
    let offset = 0;
    let data = {};
    if (req.body) {
        data = req.body;
        search = data.search || "";
        orderKey = data.orderKey || "createdAt";
        order = data.order || "desc";
        page = data.page || 1;
        pageSize = data.pageSize || 25;
    }
    if (data.hasOwnProperty('limit')) {
        pageSize = data.limit;
    }
    if (!!pageSize && !!page) {
        offset = (page - 1) * pageSize;
    }
    var ids = [];
    try {
        ids = Object.keys(global.onlineSocket);
        ids = ids
            .filter((id) => id.includes("userid"))
            .map((id) => id.replace("userid", ""))
            .filter((id) => parseInt(id) > 0);
        // sql += ` AND u.id IN (${idList.join(",")})`;
    } catch (e) { }
    if (!!!ids.length) {
        ids = [0];
    }

    let typeQuery = "";
    if (data.customerType == "corporate") {
        typeQuery = " AND c.type IS NOT NULL"
    }
    if (data.customerType == "clinic") {
        typeQuery = " AND c.type IS NULL"
    }
    if (data.corporate_id) {
        typeQuery = ` AND c.type = 'corporate::${data.corporate_id}'`;
    }

    let sqlCount = "";
    let sql = ``
    let select = `
          SELECT  DISTINCT(u.id),u.first_name, u.last_name, u.middle_name, u.gender, u.dob, u.picture, u.isd_code,u.parent,
          u.phone_number, u.email, u.createdAt, um.bmi,um.blood_group, vsa.conditions,vsa.id analysis_id,
          JSON_EXTRACT(vsa.tirage,'$.triage_level') triage_level,
          ROUND(DATEDIFF(CURRENT_DATE(),u.dob) / 365.25) AS age,
          ll.lastLogin, ll.platform,
          cc.response chronic_condition,c.tags,
          c.type,c.user_id clinicId,
          IF(ha.id IS NOT NULL,true,false) isPrimary
          FROM user_family_view u `;
    switch (path) {
        case 'my-customers':
            sql += `        
        JOIN customers c ON c.customer = u.parent ${typeQuery}
        LEFT JOIN user_medicals um ON um.user_id = u.id AND um.deleted_at IS NULL
        LEFT JOIN view_symptom_analysis vsa ON vsa.user_id = u.id #AND family_id = 0
        LEFT JOIN recent_cronic_condition_view cc ON cc.user_id = u.id
        LEFT JOIN userLastLogins ll ON ll.user_id = u.id
        LEFT JOIN customers ha on ha.customer = u.id AND ha.user_id =  ${req.user.id}
        WHERE (c.customer = u.id or c.family_access = 1 or ha.id is not null) and c.user_id `;
            break;
        // case 'my-corporate-customers':
        //     sql += `        
        //   JOIN customers c ON c.customer = u.parent and c.type is not null
        //   LEFT JOIN user_medicals um ON um.user_id = u.id AND um.deleted_at IS NULL
        //   LEFT JOIN view_symptom_analysis vsa ON vsa.user_id = u.id
        //  LEFT JOIN(
        //     SELECT CAST(CONCAT('[', GROUP_CONCAT(CONCAT(JSON_EXTRACT(response,'$.cronic_condition'))), ']') AS JSON) AS chronic_condition,user_id FROM user_medical_histories
        //     WHERE 
        //     #family_id = 0 AND 
        //     deletedAt IS NULL AND class = 'cronic_condition' GROUP BY user_id
        //   ) cc ON cc.user_id = u.id
        //   LEFT JOIN userLastLogins ll ON ll.user_id = u.id
        //   LEFT JOIN customers ha on ha.customer = u.id AND ha.user_id =  ${req.user.id}
        //   WHERE (c.customer = u.id or c.family_access = 1 or ha.id is not null) and c.user_id `;
        //     break;
        case 'my_favorittens':
            sql += `
        JOIN my_favorites mf ON mf.user_id = u.id AND mf.provider_id  = ${req.user.id}
        LEFT JOIN customers c ON c.customer = u.id AND c.user_id = ${req.user.id}
        LEFT JOIN user_medicals um ON um.user_id = u.id AND um.deleted_at IS NULL
        LEFT JOIN view_symptom_analysis vsa ON vsa.user_id = u.id #AND family_id = 0
        LEFT JOIN recent_cronic_condition_view cc ON cc.user_id = u.id
        LEFT JOIN userLastLogins ll ON ll.user_id = u.id
        LEFT JOIN customers ha on ha.customer = u.id AND ha.user_id =  ${req.user.id}
        WHERE mf.provider_id `;
            break;
        default:
    }
    sql += ` = ${req.user.id}
  AND u.deletedAt IS NULL
  AND (u.status = 1 OR u.id != u.parent)`;
    if (!!search) {
        search = search.replace(/\s/g, '')
        sql += ` AND REPLACE(CONCAT(COALESCE(u.first_name,''), COALESCE(u.middle_name,''), COALESCE(u.last_name,''), COALESCE(u.phone_number,''), COALESCE(u.email,''),COALESCE(u.last_name_2,'')),' ','') LIKE "%${search}%"`;
    }
    if (!!data.name) {
        data.name = data.name.replace(/\s/g, '')
        sql += ` AND REPLACE(CONCAT(COALESCE(u.first_name,''), COALESCE(u.middle_name,''), COALESCE(u.last_name,''),COALESCE(u.last_name_2,'')),' ','') LIKE "%${data.name}%"`;
    }

    if (!!data.location_id) {
        sql += ` AND c.location_id = ${data.location_id}`;
    }
    if (!!data.dobMax) {
        sql += ` AND DATE(u.dob) <= DATE('${data.dobMax}')`;
    }
    if (!!data.dobMin) {
        sql += ` AND DATE(u.dob) >= DATE('${data.dobMin}')`;
    }

    if (!!data.ageMin) {
        sql += ` AND ROUND(DATEDIFF(CURRENT_DATE(),u.dob) / 365.25) >= ${data.ageMin}`;
    }
    if (!!data.ageMax) {
        sql += ` AND ROUND(DATEDIFF(CURRENT_DATE(),u.dob) / 365.25) <= ${data.ageMax}`;
    }

    if (!!data.gender) {
        sql += ` AND u.gender = '${data.gender}'`;
    }
    if (!!data.email) {
        sql += ` AND u.email LIKE '%${data.email}%'`;
    }
    if (!!data.phone_number) {
        sql += ` AND u.phone_number LIKE '%${data.phone_number}%'`;
    }

    if (!!data.tags && !!data.tags.length) {
        let tags = [];
        data.tags.forEach(r => {
            tags.push(`c.tags LIKE '%${r}%'`)
        })
        if (!!tags.length) {
            let t = tags.join(' OR ')
            sql += ` AND (${t})`
        }
    }

    if (!!data.bmi && !!data.bmi.length) {
        let arr1 = [];
        if (data.bmi.includes('BMI_UNDER_WEIGHT')) {
            arr1.push('um.bmi < 18.5')
        }
        if (data.bmi.includes('BMI_FIT')) {
            arr1.push('um.bmi >= 18.5 AND um.bmi < 25')
        }
        if (data.bmi.includes('BMI_OVER_WEIGHT')) {
            arr1.push('um.bmi >= 25 AND um.bmi <= 30')
        }
        if (data.bmi.includes('BMI_OBESE')) {
            arr1.push('um.bmi > 30')
        }

        if (!!arr1.length) {
            let q1 = arr1.join(' OR ')
            sql += ` AND (${q1})`
        }
    }

    if (!!data.conditions && !!data.conditions.length) {
        let arr = [];
        data.conditions.forEach(element => {
            arr.push(`vsa.conditions LIKE "%${element}%"`)
        });
        if (!!arr.length) {
            let q = arr.join(' OR ')
            sql += ` AND (${q})`
        }
    }

    if (!!data.triage && !!data.triage.length) {
        let arr2 = [];
        data.triage.forEach(element => {
            arr2.push(`JSON_EXTRACT(vsa.tirage,'$.triage_level') LIKE '%${element.toLowerCase()}%'`)
        });
        if (!!arr2.length) {
            let q2 = arr2.join(' OR ')
            sql += ` AND (${q2})`
        }
    }

    if (!!data.blood_groups && !!data.blood_groups.length) {
        data.blood_groups = data.blood_groups.map(e => `'${e}'`)
        sql += ` AND um.blood_group in (${data.blood_groups.join(',')})`
    }
    if (!!data.createdAt) {
        sql += ` AND DATE(u.createdAt) >= DATE('${data.createdAt}')`;
    }
    if (!!data.isAvailableStatus) {
        try {
            var idList = Object.keys(global.onlineSocket);
            idList = idList
                .filter((id) => id.includes("userid"))
                .map((id) => id.replace("userid", ""))
                .filter((id) => parseInt(id) > 0);
            if (!!idList.length)
                sql += ` AND u.id IN (${idList.join(",")})`;
        } catch (e) { }
    }

    // sql += `  GROUP BY u.id `;
    if (!!data.cronic_conditions && !!data.cronic_conditions.length) {
        let arr23 = [];
        data.cronic_conditions.forEach(element => {
            arr23.push(`cc.response LIKE "%${element}%"`)
        });
        if (!!arr23.length) {
            let q23 = arr23.join(' OR ')
            sql += ` AND (${q23})`
        }
    }
    sqlCount = `select count(u.id) as total from user_family_view u ${sql}`;

    let sql2 = `${select} ${sql}  ORDER BY ${orderKey} ${order} `;
    if (!!pageSize) {
        sql2 += ` LIMIT ${offset}, ${pageSize}`;
    }
    console.log(sql2);
    db.sequelize
        .query(sql2)
        .spread(async (resp) => {
            let users = JSON.parse(JSON.stringify(resp));
            let ids = users.map((e) => e.id);
            let idsStr = ids.join(",");
            let OneYearAgo = new Date(
                new Date().setFullYear(new Date().getFullYear() - 1)
            ).toISOString();
            if (!!req.query && !!req.query.todayBookingCount && !!eval(req.query.todayBookingCount)) {
                OneYearAgo = new Date(
                    new Date(new Date().setHours(0)).setMinutes(0)
                ).toISOString();
            }

            let t1 = `SELECT COUNT(id) AS bookingCounts, patient_id FROM bookings 
      WHERE patient_id IN (${idsStr}) AND DATE(createdAt) > DATE("${OneYearAgo}")
      GROUP BY patient_id`;
            let t2 = `SELECT COUNT(DISTINCT(uf.id)) familyCount, user_id FROM user_kindreds uf
        JOIN health_advisors ha ON ha.patient_id = uf.user_id AND approved = 1 AND family_access = 1
        WHERE uf.deletedAt IS NULL AND user_id IN (${idsStr}) GROUP BY uf.user_id`;
            let t3 = `SELECT COUNT(DISTINCT(uf.id)) familyCount, member_id FROM user_kindreds uf
        JOIN health_advisors ha ON ha.patient_id = uf.user_id AND approved = 1 AND family_access = 1
        WHERE uf.deletedAt IS NULL AND member_id IN (${idsStr}) GROUP BY uf.member_id`;
            let queries = await Promise.all([
                db.sequelize.query(t1).spread((resp, r) => {
                    let d = {};
                    resp.forEach(e => { d[e.patient_id] = e.bookingCounts; });
                    return d;
                }).catch(e => { }),
                db.sequelize.query(t2).spread((resp, r) => {
                    let d = {};
                    resp.forEach(e => { d[e.user_id] = e.familyCount; });
                    return d;
                }).catch(e => { }),
                db.sequelize.query(t3).spread((resp, r) => {
                    let d = {};
                    resp.forEach(e => { d[e.member_id] = e.familyCount; });
                    return d;
                }).catch(e => { }),
                db.sequelize.query(sqlCount).spread((resp, r) => {
                    return resp[0].total;
                }).catch(e => { })
            ]);
            if (queries && queries.length) {
                users.forEach((r) => {
                    r.bookings_in_year = queries[0][r.id] || 0;
                    r.familyCount = (queries[1][r.id] || 0) + (queries[2][r.id] || 0);
                });
            }
            let g = pageSize || users.length;
            let ct = !!pageSize ? queries[3] : g;
            response(res, { rows: users, count: ct }, null, g);
        })
        .catch((e) => {
            errorResponse(res, e);
        });
};

module.exports.failedUpload = async (req, res, next) => {
    let search = "";
    let page = 1;
    let orderKey = "createdAt";
    let order = "desc";
    let pageSize = 25;
    let where = { status: true };
    let offset = 0;
    if (req.body) {
        let data = req.body;
        search = data.search || "";
        orderKey = data.orderKey || "createdAt";
        order = data.order || "desc";
        page = data.page || 1;
        pageSize = data.pageSize || 25;
    }
    if (!!pageSize && !!page) {
        offset = (page - 1) * pageSize;
    }

    let sql = `SELECT u.first_name,u.last_name,u.middle_name,u.gender,u.dob,u.company_name,u.picture,u.id,u.isd_code,
                u.phone_number,u.email,u.createdAt,u.status,br.errors,
                JSON_OBJECT("height",um.height,"weight",um.weight,"waist",um.waist,"blood_group",um.blood_group,
                "height_unit",um.height_unit,"weight_unit",um.weight_unit,"waist_unit",um.waist_unit ) user_medical
        FROM users u
        LEFT JOIN user_medicals um ON um.user_id = u.id
        LEFT JOIN bulk_upload_user_errors br ON br.patient_id = u.id AND br.clinic_id = ${req.user.id}
        LEFT JOIN customers c ON c.customer = u.id AND c.user_id =  ${req.user.id}
        WHERE (c.id IS NOT NULL OR br.id IS NOT NULL) AND u.status = 0 AND u.deletedAt IS NULL
        AND CONCAT_WS('',u.first_name,u.middle_name,u.last_name,u.last_name_2,u.email,u.phone_number) LIKE "%${search}%"
        ORDER BY ${orderKey} ${order} LIMIT ${offset},${pageSize}`;
    let ct = `
  SELECT count(u.id) total
        FROM users u
        LEFT JOIN user_medicals um ON um.user_id = u.id
        LEFT JOIN bulk_upload_user_errors br ON br.patient_id = u.id AND br.clinic_id = ${req.user.id}
        LEFT JOIN customers c ON c.customer = u.id AND c.user_id =  ${req.user.id}
        WHERE (c.id IS NOT NULL OR br.id IS NOT NULL) AND u.status != 1 AND u.deletedAt IS NULL
        AND CONCAT_WS('',u.first_name,u.middle_name,u.last_name,u.last_name_2,u.email,u.phone_number) LIKE "%${search}%"
  `
    let total = await db.sequelize.query(ct).spread((r, m) => r[0]).catch(e => null)
    db.sequelize.query(sql)
        .spread((rows, m) => {
            response(res, { rows, count: total.total })
        })
        .catch((ee) => errorResponse(res, ee));
};

module.exports.families = async (req, res, next) => {
    db.user.findOne({
        where: { id: req.params.user_id },
        include: [
            'family',
            {
                model: db.customer,
                as: 'customer',
                where: {
                    user_id: req.user.id
                }
            }
        ]
    }).then(async (resp) => {
        resp = JSON.parse(JSON.stringify(resp))
        let family = resp.family
        let parents = await db.user_kindred.findOne({ where: { member_id: req.params.user_id }, include: ['parent'] });
        if (!!parents && !!parents.parent) {
            let parent = JSON.parse(JSON.stringify(parents.parent));
            try {
                parent['relation'] = static.reverseRelation[req.user.gender][parents.relation]
            } catch (error) {
                parent['relation'] = null
            }
            family.push(parent)
        }
        response(res, family)
    })
        .catch(e => errorResponse(res, e));
};

module.exports.heatmapData = async (req, res, next) => {
    let filter = req.body || {};

    let sql = `SELECT CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.middle_name,''), ' ', COALESCE(u.last_name,''),' ', COALESCE(u.last_name_2,'')) AS fullName,u.gender,
  NULL  AS primaryUser,NULL relation,
    a.latitude,a.longitude,sa.conditions,JSON_EXTRACT(sa.tirage,'$.triage_level') triage,sa.id analysis_id,c.location_id,um.bmi,um.blood_group,
    ROUND(DATEDIFF(CURRENT_DATE(),u.dob) / 365.25) AS age,u.id user_id,null family_id,
    (SELECT CAST(CONCAT('[', GROUP_CONCAT(CONCAT(JSON_EXTRACT(response,'$.cronic_condition'))), ']') AS JSON) AS cronic_cindition FROM user_medical_histories
    WHERE user_id = u.id AND family_id = 0 AND deletedAt IS NULL AND class = 'cronic_condition') chronic_condition
    #JSON_EXTRACT(umc.response, '$[*].inputs[*]') cronic_condition
    FROM user_family_view u
    JOIN customers c ON c.customer = u.parent
    JOIN addresses a ON a.user_id = u.id AND a.family_id = 0
    LEFT JOIN user_medicals um ON um.user_id = u.id AND um.deleted_at IS NULL
    LEFT JOIN (
      SELECT vsa.*,b.id bid,b.dignosis_id dignosis_id
      FROM view_symptom_analysis vsa
      LEFT JOIN bookings  b ON vsa.id = b.dignosis_id AND payment_status = 1
      WHERE b.dignosis_id IS NULL AND vsa.changed_admin_id IS NULL AND vsa.changed_user_id IS NULL
    ) sa ON sa.user_id = u.id
    #LEFT JOIN user_medical_conditions umc on umc.user_id = u.id  AND umc.deleted_at IS NULL
    WHERE u.deletedAt IS NULL AND c.user_id = ${req.user.id}
    #AND (a.latitude BETWEEN ${filter.lats.join(' AND ')}) AND (a.longitude BETWEEN ${filter.lngs.join(' AND ')})
    AND a.latitude IS NOT NULL`;

    let cond = ''

    if (!!filter.minAge) {
        cond += ` AND age >= ${filter.minAge}`
    }
    if (!!filter.maxAge) {
        cond += ` AND age <= ${filter.maxAge}`
    }

    if (!!filter.gender) {
        cond += ` AND gender = '${filter.gender}'`
    }

    if (!!filter.location_id) {
        cond += ` AND c.location_id = ${filter.location_id}`
    }

    if (!!filter.bmi && !!filter.bmi.length) {
        let arr1 = [];
        if (filter.bmi.includes('BMI_UNDER_WEIGHT')) {
            arr1.push('um.bmi < 18.5')
        }
        if (filter.bmi.includes('BMI_FIT')) {
            arr1.push('um.bmi >= 18.5 AND um.bmi < 25')
        }
        if (filter.bmi.includes('BMI_OVER_WEIGHT')) {
            arr1.push('um.bmi >= 25 AND um.bmi <= 30')
        }
        if (filter.bmi.includes('BMI_OBESE')) {
            arr1.push('um.bmi > 30')
        }

        if (!!arr1.length) {
            let q1 = arr1.join(' OR ')
            cond += ` AND (${q1})`
        }
    }

    if (!!filter.conditions && !!filter.conditions.length) {
        let arr = [];
        filter.conditions.forEach(element => {
            arr.push(`sa.conditions LIKE "%${element}%"`)
        });
        if (!!arr.length) {
            let q = arr.join(' OR ')
            cond += ` AND (${q})`
        }
    }

    if (!!filter.triage && !!filter.triage.length) {
        let arr2 = [];
        filter.triage.forEach(element => {
            arr2.push(`JSON_EXTRACT(sa.tirage,'$.triage_level') LIKE '%${element.toLowerCase()}%'`)
        });
        if (!!arr2.length) {
            let q2 = arr2.join(' OR ')
            cond += ` AND (${q2})`
        }
    }
    if (!!filter.blood_groups && !!filter.blood_groups.length) {
        filter.blood_groups = filter.blood_groups.map(e => `'${e}'`);
        cond += ` AND um.blood_group IN (${filter.blood_groups.join(',')})`
    }
    if (!!filter.cronic_conditions && !!filter.cronic_conditions.length) {
        let arr2 = [];
        filter.cronic_conditions.forEach(element => {
            arr2.push(`chronic_condition Like "%${element}%"`)
        });
        if (!!arr2.length) {
            let q2 = arr2.join(' OR ')
            cond += ` HAVING (${q2})`
        }
    }
    //sql += ' ORDER BY sa.createdAt ASC'
    sql += ` ${cond}`;
    db.sequelize.query(`${sql}`)
        .spread((result, mets) => res.send(result))
        .catch(e => res.status(400).send({ status: false, error: `${e}`, e }))

}

module.exports.secondaryUsers = async (req, res, next) => {
    let search = "";
    let page = 1;
    let orderKey = "createdAt";
    let order = "desc";
    let pageSize = 25;
    let offset = 0;
    let data = {};
    if (req.body) {
        data = req.body;
        search = data.search || "";
        orderKey = data.orderKey || "createdAt";
        order = data.order || "desc";
        page = data.page || 1;
        pageSize = data.pageSize || 25;
    }
    if (data.hasOwnProperty('limit')) {
        pageSize = data.limit;
    }
    if (!!pageSize && !!page) {
        offset = (page - 1) * pageSize;
    }

    let sqlCount = `SELECT COUNT(uf.id) total `;

    let select = `SELECT  uf.id,uf.first_name, uf.last_name, uf.middle_name, uf.gender, uf.dob, uf.image picture,
            u.isd_code, uf.relation,uf.user_id,
            uf.phone phone_number, uf.email, uf.createdAt, um.bmi,um.blood_group, vsa.conditions,vsa.id analysis_id,
            CONCAT_WS(' ',u.first_name,NULLIF(u.middle_name,''),NULLIF(u.last_name,''),u.last_name_2) relatedTo,
            JSON_EXTRACT(vsa.tirage,'$.triage_level') triage_level,
            ROUND(DATEDIFF(CURRENT_DATE(),u.dob) / 365.25) AS age,
            cc.chronic_condition ,
	          (SELECT COUNT(id) FROM bookings WHERE createdAt >= (NOW() + INTERVAL -365 DAY) AND family_member_id = uf.id) bookingCounts`

    let sql = `
    FROM users u
    JOIN customers c ON c.customer = u.id
    JOIN user_families uf ON uf.user_id = u.id AND uf.deletedAt IS NULL
    LEFT JOIN family_medicals um ON um.user_id = uf.id AND um.deleted_at IS NULL
    LEFT JOIN view_symptom_analysis vsa ON vsa.family_id = uf.id
     LEFT JOIN(
          SELECT CAST(CONCAT('[', GROUP_CONCAT(CONCAT(JSON_EXTRACT(response,'$.cronic_condition'))), ']') AS JSON) AS chronic_condition,family_id FROM user_medical_histories
          WHERE family_id > 0 AND deletedAt IS NULL AND class = 'cronic_condition' GROUP BY family_id
        ) cc ON cc.family_id = uf.id
    WHERE c.user_id = ${req.user.id} AND u.deletedAt IS NULL`;
    if (!!search) {
        search = search.replace(/\s/g, '')
        sql += ` AND REPLACE(CONCAT(COALESCE(uf.first_name,''), COALESCE(uf.middle_name,''), COALESCE(uf.last_name,''), COALESCE(uf.phone,''), COALESCE(u.email,'')),' ','') LIKE "%${search}%"`;
    }
    if (!!data.name) {
        data.name = data.name.replace(/\s/g, '')
        sql += ` AND REPLACE(CONCAT(COALESCE(uf.first_name,''), COALESCE(uf.middle_name,''), COALESCE(uf.last_name,'')),' ','') LIKE "%${data.name}%"`;
    }

    if (!!data.location_id) {
        sql += ` AND c.location_id = ${data.location_id}`;
    }
    if (!!data.dobMax) {
        sql += ` AND DATE(uf.dob) <= DATE('${data.dobMax}')`;
    }
    if (!!data.dobMin) {
        sql += ` AND DATE(uf.dob) >= DATE('${data.dobMin}')`;
    }

    if (!!data.ageMin) {
        sql += ` AND ROUND(DATEDIFF(CURRENT_DATE(),uf.dob) / 365.25) >= ${data.ageMin}`;
    }
    if (!!data.ageMax) {
        sql += ` AND ROUND(DATEDIFF(CURRENT_DATE(),uf.dob) / 365.25) <= ${data.ageMax}`;
    }

    if (!!data.gender) {
        sql += ` AND uf.gender = '${data.gender}'`;
    }
    if (!!data.email) {
        sql += ` AND uf.email LIKE '%${data.email}%'`;
    }
    if (!!data.phone_number) {
        sql += ` AND uf.phone LIKE '%${data.phone_number}%'`;
    }

    if (!!data.bmi && !!data.bmi.length) {
        let arr1 = [];
        if (data.bmi.includes('BMI_UNDER_WEIGHT')) {
            arr1.push('um.bmi < 18.5')
        }
        if (data.bmi.includes('BMI_FIT')) {
            arr1.push('um.bmi >= 18.5 AND um.bmi < 25')
        }
        if (data.bmi.includes('BMI_OVER_WEIGHT')) {
            arr1.push('um.bmi >= 25 AND um.bmi <= 30')
        }
        if (data.bmi.includes('BMI_OBESE')) {
            arr1.push('um.bmi > 30')
        }

        if (!!arr1.length) {
            let q1 = arr1.join(' OR ')
            sql += ` AND (${q1})`
        }
    }

    if (!!data.conditions && !!data.conditions.length) {
        let arr = [];
        data.conditions.forEach(element => {
            arr.push(`vsa.conditions LIKE "%${element}%"`)
        });
        if (!!arr.length) {
            let q = arr.join(' OR ')
            sql += ` AND (${q})`
        }
    }

    if (!!data.triage && !!data.triage.length) {
        let arr2 = [];
        data.triage.forEach(element => {
            arr2.push(`JSON_EXTRACT(vsa.tirage,'$.triage_level') LIKE '%${element.toLowerCase()}%'`)
        });
        if (!!arr2.length) {
            let q2 = arr2.join(' OR ')
            sql += ` AND (${q2})`
        }
    }

    if (!!data.blood_groups && !!data.blood_groups.length) {
        data.blood_groups = data.blood_groups.map(e => `'${e}'`)
        sql += ` AND um.blood_group in (${data.blood_groups.join(',')})`
    }
    if (!!data.createdAt) {
        sql += ` AND DATE(uf.createdAt) >= DATE('${data.createdAt}')`;
    }
    if (!!data.isAvailableStatus) {
        try {
            var idList = Object.keys(global.onlineSocket);
            idList = idList
                .filter((id) => id.includes("userid"))
                .map((id) => id.replace("userid", ""))
                .filter((id) => parseInt(id) > 0);
            sql += ` AND uf.id IN (${idList.join(",")})`;
        } catch (e) { }
    }

    // sql += `  GROUP BY uf.id `;
    if (!!data.cronic_conditions && !!data.cronic_conditions.length) {
        let arr23 = [];
        data.cronic_conditions.forEach(element => {
            arr23.push(`chronic_condition LIKE "%${element}%"`)
        });
        if (!!arr23.length) {
            let q23 = arr23.join(' OR ')
            sql += ` AND (${q23})`
        }
    }
    sqlCount = `${sqlCount} ${sql}`;
    sql += `  ORDER BY ${orderKey} ${order} `;
    if (!!pageSize) {
        sql += ` LIMIT ${offset}, ${pageSize}`;
    }
    let count = await db.sequelize.query(sqlCount).spread((resp, r) => {
        return resp[0].total;
    }).catch(e => 0)
    db.sequelize.query(`${select} ${sql}`).spread((r, m) => {
        let g = pageSize || r.length;
        let ct = !!pageSize ? count : g;
        response(res, { rows: r, count: ct }, null, g);
    }).catch(e => errorResponse(res, e))
}
module.exports.corporates = async (req, res) => {
    try {
        let query = req.query | {};
        let sql = `
        SELECT u.id,u.company_name,u.picture,cca.createdAt,cca.associated,cca.synced FROM clinic_corporate_associations cca, users u 
        WHERE cca.corporate_id = u.id AND cca.clinic_id = ${req.user.id}
        `
        if (query.corporate_id) {
            sql += ` AND cca.corporate_id = ${query.corporate_id}`
        }
        let cp = await db.sequelize.query(sql).spread(async (r, m) => {
            return JSON.parse(JSON.stringify(r));
        });
        cp = JSON.parse(JSON.stringify(cp));
        let cts = null;
        if (cp && cp.length) {
            let ids = cp.map(e => e.id);
            ids.push(0);
            console.log(ids)
            let sq = `SELECT COUNT(customer) employeeCount, user_id FROM customers c, users u
        WHERE c.customer = u.id AND u.deletedAt IS NULL AND u.status = 1 AND c.user_id IN (${ids.join(',')})
        GROUP BY c.user_id`;
            console.log(sq)
            cts = await db.sequelize.query(sq).spread((r, m) => {
                let obj = {};
                r.forEach(e => {
                    obj[e.user_id] = e.employeeCount;
                })
                return obj;
            });
        }

        console.log(cts)


        if (cts) {
            cp.forEach(e => {
                e.employeeCount = cts[`${e.id}`];
                console.log(e);
            })
        }
        res.send(cp);

    } catch (error) {
        res.status(400).send({ success: false, error: error })
    }
}