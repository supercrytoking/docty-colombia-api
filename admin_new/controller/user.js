const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require("../../commons/paginator");
const { response, errorResponse } = require("../../commons/response");
const { crmTrigger } = require("../../commons/crmTrigger");
const { addActivityLog } = require("./user_audit_log");
const config = require("../../config/config.json");
const { sequelize } = require("../../models");
module.exports = {
  getUsers: async (req, res, next) => {
    let page = 1;
    let pageSize = 25;

    let orderKey = "createdAt";
    let order = "DESC";
    let search = "";
    let includes = [];
    if (req.query && req.query.page) {
      page = req.query.page;
    }
    if (req.body && req.body.page) {
      page = req.body.page;
    }
    if (req.body && req.body.pageSize) {
      pageSize = req.body.pageSize;
    }
    if (req.body && req.body.search) {
      search = req.body.search;
    }
    if (req.body && req.body.orderKey) {
      orderKey = req.body.orderKey;
    }
    if (req.body && req.body.order) {
      order = req.body.order;
    }
    if (req.body && req.body.includes) {
      includes = req.body.includes.split(",");
    }

    var where = {};
    if (search && search.length > 0) {
      search = (search || '').replace(/\s+/, '').trim();
      where = {
        ...where,
        [Op.or]: [
          Sequelize.where(Sequelize.fn("concat",
            Sequelize.fn("COALESCE", Sequelize.col("user.first_name"), ''),
            Sequelize.fn("COALESCE", Sequelize.col("user.middle_name"), ''),
            Sequelize.fn("COALESCE", Sequelize.col("user.last_name"), ''),
            Sequelize.fn("COALESCE", Sequelize.col("user.company_name"), ''),
            Sequelize.fn("COALESCE", Sequelize.col("user.email"), ''),
            Sequelize.fn("COALESCE", Sequelize.col("user.phone_number"), '')
          ), {
            [Op.like]: `%${search}%`
          })
        ]
      };
    }
    if (req.body.status != null) {
      where.status = req.body.status;
    }

    if (req.body.isSigned != null) {
      if (req.body.isSigned == false)
        where.isSigned = {
          [Op.or]: [{ [Op.eq]: false }, { [Op.eq]: null }],
        };
      else where.isSigned = req.body.isSigned;
    }

    if (req.body.department_id) {
      includes.push({
        model: db.user_service,
        as: "services",
        attributes: ["department_id"],
        where: {
          department_id: req.body.department_id,
        },
      });
    }
    if (req.body.role_list) {
      includes.push({
        model: db.user_role,
        as: "user_role",
        where: { role_id: { [Op.in]: req.body.role_list } },
      });
    } else {
      includes.push({
        model: db.user_role,
        as: "user_role",
        where: { role_id: req.params.role },
      });
    }

    where.email_verified = true;

    let Obj = {
      where: where,
      include: includes,
      order: [[orderKey, order]],
      limit: getLimitOffset(page, pageSize),
    };
    if (!!req.query && !!req.query.listAll) {
      delete Obj.limit;
    }
    return db.user
      .findAndCountAll(Obj)
      .then(async (resp) => {
        response(res, resp, resp.length);
      })
      .catch((err) => {
        errorResponse(res, err);
      });
  },
  getDoctors: async (req, res) => {
    try {
      let page = 1;
      let pageSize = 25;
      let orderKey = "createdAt";
      let order = "DESC";
      let search = "";

      if (req.query && req.query.page) {
        page = req.query.page;
      }
      if (req.query && req.query.pageSize) {
        pageSize = req.query.pageSize;
      }

      if (req.body && req.body.page) {
        page = req.body.page;
      }
      if (req.body && req.body.search) {
        search = req.body.search;
      }
      if (req.body && req.body.orderKey) {
        orderKey = req.body.orderKey;
      }
      if (req.body && req.body.order) {
        order = req.body.order;
      }
      var role = 1; //doctor
      if (req.body.role) role = req.body.role; //doctor or nurse [1 or 3]

      var userWhere = "";
      if (search && search.length > 0) {
        userWhere = `AND (user.first_name LIKE "%${search}%" OR user.last_name LIKE "%${search}%" OR user.middle_name LIKE "%${search}%" OR user.company_name LIKE "%${search}%" OR user.email LIKE "%${search}%" OR user.phone_number LIKE "%${search}%")`;
      }
      if (req.body.status != null) {
        userWhere += ` AND user.status=${req.body.status}`;
      }
      if (req.body.isAvailableStatus != null) {
        userWhere += ` AND user.isAvailableStatus=${!!req.body
          .isAvailableStatus}`;
        if (req.body.isAvailableStatus) {
          //online
          var idList = Object.keys(global.onlineSocket);
          idList = idList
            .filter((id) => id.includes("userid"))
            .map((id) => id.replace("userid", ""))
            .filter((id) => parseInt(id) > 0);
          if (idList.length == 0) {
            return response(res, { count: 0, rows: [] });
          }
          userWhere += ` AND user.id IN (${idList.join(",")})`;
        }
      }
      if (req.body.isSigned != null) {
        if (req.body.isSigned == false)
          userWhere += ` AND (user.isSigned=${0} OR user.isSigned IS NULL) `;
        else userWhere += ` AND user.isSigned=${req.body.isSigned} `;
      }
      userWhere += " AND user.email_verified = true";
      var associateUserIdWhere = "IS NULL"; //independent
      if (req.body && req.body.userOfClinic) {
        if (req.body.clinic_id)
          associateUserIdWhere = ` = ${req.body.clinic_id}`;
        else associateUserIdWhere = "IS NOT NULL"; //clinic
      }
      var associateSql = "";
      if (req.body && req.body.userOfClinic != null)
        associateSql = `AND associates.user_id ${associateUserIdWhere}`;

      var sql = `
                SELECT user.id
                FROM users AS user
                    INNER JOIN user_roles AS user_role ON user.id = user_role.user_id AND user_role.role_id = ${role}
                    LEFT OUTER JOIN associates AS associates ON user.id = associates.associate
                WHERE (
                        user.deletedAt IS NULL
                        ${associateSql}
                        ${userWhere}
                    )
                ORDER BY user.${orderKey} ${order};
                `;
      if (req.body.department_id) {
        sql = `
                SELECT user.id
                FROM users AS user
                    INNER JOIN user_roles AS user_role ON user.id = user_role.user_id AND user_role.role_id = ${role}
                    LEFT OUTER JOIN associates AS associates ON user.id = associates.associate
                    LEFT OUTER JOIN user_services ON user_services.user_id = user.id
                WHERE (
                        user.deletedAt IS NULL
                        AND associates.user_id ${associateUserIdWhere}
                        AND user_services.department_id = ${req.body.department_id}
                        ${userWhere}
                    )
                ORDER BY user.${orderKey} ${order};
                `;
      }

      var queryResult = await db.queryRun(sql);
      var idList = queryResult.map((item) => item.id);
      var limitObject = getLimitOffset(page, pageSize);
      idList = idList.slice(limitObject[0], limitObject[0] + limitObject[1]); //paginate
      let where = { id: { [Op.in]: idList } };

      let includes = ["reviewer"];

      includes.push({
        model: db.associate,
        as: "associatedTo",
        include: ["user"],
        required: false,
      });
      var attr = ["id", "title", 'role_id'];
      if (req.lang == "es") attr = [["title_es", "title"], "id", 'role_id'];
      includes.push({
        model: db.user_service,
        as: "services",
        include: [
          {
            model: db.speciality,
            as: "speciality",
            attributes: attr,
            required: true,
          },
          {
            model: db.department,
            as: "department",
            attributes: attr,
            required: true,
          },
        ],
        required: false,
      });
      if (req.body.todayBooking) {
        includes.push({
          model: db.booking,
          as: "provider_bookings",
          where: {
            status: { [Op.in]: [0, 5, 1, 3] },
            payment_status: 1,
          },
          include: [
            {
              model: db.schedule,
              as: "schedule",
              attributes: ["start", "end", "id"],
              where: {
                start: { [Op.gte]: req.body.startTime },
                end: { [Op.lte]: req.body.endTime },
              },
              required: true,
            },
          ],
          required: false,
        });
      }
      db.user
        .findAll({
          where: where,
          include: includes,
          order: [[orderKey, order]],
        })
        .then((resp) => {
          let users = JSON.parse(JSON.stringify(resp));
          users.forEach(u => {
            u.services = u.services || [];
            u.services = u.services
              .filter((s) => {
                return !!s.speciality && s.speciality.role_id == u.speciality_type
              });
          })

          response(res, { count: queryResult.length, rows: users });
        })
        .catch((err) => errorResponse(res, err));
    } catch (err) {
      errorResponse(res, err);
    }
  },

  getAllPatients: async (req, res, next) => {
    let page = 1;
    let pageSize = 25;

    let orderKey = "first_name";
    let order = "DESC";
    let search = "";
    let offset = 0;
    if (req.query && req.query.page) {
      page = req.query.page;
    }

    let data = req.body || {};
    if (data.page) {
      page = data.page;
    }
    if (data.pageSize) {
      pageSize = data.pageSize;
    }
    offset = (page - 1) * pageSize;

    if (data.search) {
      search = data.search;
    }
    if (data.orderKey) {
      orderKey = data.orderKey;
    }
    if (data.order) {
      order = data.order;
    }
    let sql = "";
    let userWhere = " where u.deletedAt IS NULL AND ";
    let selection = `SELECT u.id,u.first_name, u.last_name,u.middle_name,u.gender,u.email,u.phone_number,u.createdAt,u.suspend_remarks,u.isd_code,JSON_EXTRACT(sa.tirage,'$.triage_level') AS triage_level,sa.id as analysis_id,sa.conditions`;

    if (!!eval(data.userOfClinic) || !!eval(data.userOfCoperate)) {
      selection += ",us.company_name";
      sql = `FROM users u
            JOIN customers c ON u.id = c.customer
            JOIN users us on us.id = c.user_id
            JOIN user_roles ur ON ur.user_id = c.user_id
            LEFT JOIN view_symptom_analysis sa ON sa.user_id = u.id`;
      userWhere += ` ur.role_id =${!!eval(data.userOfClinic) ? 5 : 13}`;
      if (data.clinic_id) {
        userWhere += ` and c.user_id = ${data.clinic_id}`;
      }
    } else {
      sql = `FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        left join customers c on u.id = c.customer
        LEFT JOIN view_symptom_analysis sa ON sa.user_id = u.id`;
      userWhere += ` ur.role_id = 2 AND c.id is null`;
    }
    if (data.triage) {
      userWhere += ` AND JSON_EXTRACT(sa.tirage,'$.triage_level') LIKE "%${data.triage}%"`;
    }
    userWhere += ` AND (
      u.first_name LIKE "%${search}%" 
     OR u.last_name LIKE "%${search}%" 
     OR u.middle_name LIKE "%${search}%" 
     OR u.company_name LIKE "%${search}%" 
     OR u.email LIKE "%${search}%" 
     OR u.phone_number LIKE "%${search}%")`;
    if (data.isAvailableStatus != null) {
      userWhere += ` AND user.isAvailableStatus=${!!data.isAvailableStatus}`;
    }
    if (data.status != null) {
      userWhere += ` AND user.status=${data.status}`;
    }
    db.sequelize
      .query(
        `${selection} ${sql} ${userWhere} GROUP BY u.id ORDER BY ${orderKey} ${order} limit ${offset}, ${pageSize}`
      )
      .spread(async (resp, e) => {
        let users = JSON.parse(JSON.stringify(resp));
        let ids = users.map((e) => e.id);
        let idsStr = ids.join(",");
        let OneYearAgo = new Date(
          new Date().setFullYear(new Date().getFullYear() - 1)
        ).toISOString();
        let t1 = `SELECT  JSON_OBJECT("platform", platform, "createdAt", created_at) AS lastLogin, user_id FROM tokens t 
      WHERE id IN(SELECT MAX(id) AS id FROM tokens WHERE user_id IN(${idsStr}) GROUP BY user_id)
      GROUP BY user_id`;
        let t2 = `SELECT  JSON_OBJECT("response", response, "updatedAt", updatedAt) medical_conditions, user_id FROM user_medical_conditions umc
      where id in (SELECT MAX(id) id WHERE user_id IN(${idsStr}) AND deleted_at IS NULL GROUP BY user_id)
      GROUP BY user_id`;
        let t3 = `SELECT COUNT(id) AS bookingCounts, patient_id FROM bookings 
      WHERE patient_id IN (${idsStr}) AND DATE(createdAt) > DATE("${OneYearAgo}")
      GROUP BY patient_id`;
        let t4 = `SELECT COUNT(id) familyCount, user_id FROM user_families WHERE user_id IN (${idsStr}) GROUP BY user_id`;
        let queries = await Promise.all([
          db.sequelize
            .query(t1)
            .spread((resp, r) => {
              let d = {};
              resp.forEach((e) => {
                d[e.user_id] = e.lastLogin;
              });
              return d;
            })
            .catch((e) => { }),
          db.sequelize
            .query(t2)
            .spread((resp, r) => {
              let d = {};
              resp.forEach((e) => {
                d[e.user_id] = e.medical_conditions;
              });
              return d;
            })
            .catch((e) => { }),
          db.sequelize
            .query(t3)
            .spread((resp, r) => {
              let d = {};
              resp.forEach((e) => {
                d[e.patient_id] = e.bookingCounts;
              });
              return d;
            })
            .catch((e) => { }),
          db.sequelize
            .query(t4)
            .spread((resp, r) => {
              let d = {};
              resp.forEach((e) => {
                d[e.user_id] = e.familyCount;
              });
              return d;
            })
            .catch((e) => { }),
          db.sequelize
            .query(`SELECT COUNT(u.id) total ${sql} ${userWhere}  GROUP BY u.id`)
            .spread((resp, r) => {
              return resp.length;
            })
            .catch((e) => { }),
        ]);
        if (queries && queries.length) {
          users.forEach((r) => {
            r.lastLogin = queries[0][r.id] || {};
            r.medical_conditions = queries[1][r.id] || {};
            r.bookings_in_year = queries[2][r.id] || 0;
            r.familyCount = queries[3][r.id] || 0;
          });
        }
        response(res, { rows: users, count: queries[4] });
      })
      .catch((err) => errorResponse(res, err));
  },

  getPatients: async (req, res) => {
    try {
      let page = 1;
      let pageSize = 25;

      let orderKey = "createdAt";
      let order = "DESC";
      let search = "";

      if (req.query && req.query.page) {
        page = req.query.page;
      }

      let data = req.body || {};
      if (data.page) {
        page = data.page;
      }
      if (data.pageSize) {
        pageSize = data.pageSize;
      }

      if (data.search) {
        search = data.search;
      }
      if (data.orderKey) {
        orderKey = data.orderKey;
      }
      if (data.order) {
        order = data.order;
      }

      var userWhere = "";
      if (search && search.length > 0) {
        userWhere = `AND (user.first_name LIKE "%${search}%" OR user.last_name LIKE "%${search}%" OR user.middle_name LIKE "%${search}%" OR user.company_name LIKE "%${search}%" OR user.email LIKE "%${search}%" OR user.phone_number LIKE "%${search}%")`;
      }
      if (data.status != null) {
        userWhere += ` AND user.status=${data.status}`;
      }
      if (data.isAvailableStatus != null) {
        userWhere += ` AND user.isAvailableStatus=${!!data.isAvailableStatus}`;
        try {
          var idList = Object.keys(global.onlineSocket);
          idList = idList
            .filter((id) => id.includes("userid"))
            .map((id) => id.replace("userid", ""))
            .filter((id) => parseInt(id) > 0);
          if (idList.length == 0) {
            return response(res, { count: 0, rows: [] });
          }
          userWhere += ` AND user.id IN (${idList.join(",")})`;
        } catch (e) { }
      }
      userWhere += " AND user.email_verified = true";

      var extrJoinSql = "";

      if (!!eval(data.userOfClinic) || !!eval(data.userOfCoperate)) {
        extrJoinSql = ` LEFT OUTER JOIN users AS company ON company.id = customers.user_id
                LEFT OUTER JOIN user_roles AS company_user_role ON company.id = company_user_role.user_id`;
      }

      var customerUserIdWhere = "IS NULL";
      if (data.userOfClinic || data.userOfCoperate) {
        if (data.clinic_id) customerUserIdWhere = ` = ${data.clinic_id}`;
        else {
          customerUserIdWhere = "IS NOT NULL";
          if (!!eval(data.userOfClinic))
            customerUserIdWhere = `${customerUserIdWhere} AND company_user_role.role_id = 5`;
          if (!!eval(data.userOfCoperate))
            customerUserIdWhere = `${customerUserIdWhere} AND company_user_role.role_id = 13`;
        }
      }

      var customerSql = "";
      if (data.userOfClinic != null) {
        customerSql = `AND customers.user_id ${customerUserIdWhere}`;
      }

      var sql = `
                SELECT user.id
                FROM users AS user
                    LEFT OUTER JOIN customers AS customers ON user.id = customers.customer
                    ${extrJoinSql}
                    
                    INNER JOIN user_roles AS user_role ON user.id = user_role.user_id AND user_role.role_id = 2
                WHERE (
                        user.deletedAt IS NULL
                        ${customerSql}
                        ${userWhere}
                    )
                ORDER BY user.${orderKey} ${order};
                `;

      if (req.body.triage) {
        sql = `
                SELECT user.id
                FROM users AS user
                    INNER JOIN user_roles AS user_role ON user.id = user_role.user_id AND user_role.role_id = 2
                    LEFT OUTER JOIN customers AS customers ON user.id = customers.customer
                    ${extrJoinSql}
                    LEFT OUTER JOIN symptom_analysis ON symptom_analysis.user_id = user.id
                WHERE (
                        user.deletedAt IS NULL
                        AND customers.user_id ${customerUserIdWhere}
                        
                        AND JSON_VALUE(tirage, '$.triage_level') = '${req.body.triage}'
                        ${userWhere}
                    )
                ORDER BY user.${orderKey} ${order};
                `;
      }

      var queryResult = await db.queryRun(sql);
      var idList = queryResult.map((item) => item.id);
      var limitObject = getLimitOffset(page, pageSize);
      idList = idList.slice(limitObject[0], limitObject[0] + limitObject[1]); //paginate
      let where = { id: { [Op.in]: idList } };
      let OneYearAgo = new Date(
        new Date().setFullYear(new Date().getFullYear() - 1)
      );
      let includes = [
        {
          model: db.booking,
          as: "patient_bookings",
          separate: true,
          require: false,
          where: {
            createdAt: {
              [Op.gte]: OneYearAgo,
            },
          },
          attributes: [
            "id",
            [Sequelize.fn("COUNT", "patient_bookings.id"), "bookings_in_year"],
          ],
          group: ["patient_id"],
        },
      ];

      includes.push({
        model: db.customer,
        as: "customeredTo",
        include: [
          {
            model: db.user,
            as: "user",
            required: true,
            attributes: ["company_name"],
          },
        ],
        required: false,
      });
      var symptomWhere = {};
      if (req.body.triage) {
        symptomWhere = {
          [Op.and]: [
            Sequelize.where(
              Sequelize.fn(
                "JSON_VALUE",
                Sequelize.col("tirage"),
                "$.triage_level"
              ),
              req.body.triage
            ),
          ],
        };
      }
      includes.push({
        model: db.symptom_analysis,
        as: "symptom_analysis",
        include: [],
        where: symptomWhere,
        required: false,
      });

      if (req.body.todayBooking) {
        includes.push({
          model: db.booking,
          as: "patient_bookings",
          where: {
            status: { [Op.in]: [0, 5, 1, 3] },
            payment_status: 1,
          },
          include: [
            {
              model: db.schedule,
              as: "schedule",
              attributes: ["start", "end", "id"],
              where: {
                start: { [Op.gte]: req.body.startTime },
                end: { [Op.lte]: req.body.endTime },
              },
              required: true,
            },
          ],
          required: false,
        });
      }
      if (req.body.last_symptom) {
        includes.push({
          model: db.symptom_analysis,
          as: "symptom_analysis",
          separate: true,
          limit: 1,
          order: [["id", "DESC"]],
          include: ["userInfo", "changed_admin", "changed_user"],
        });
      }

      includes.push({
        model: db.activity_log,
        as: "activity_log",
        limit: 1,
        order: [["createdAt", "DESC"]],
        required: false,
        attributes: ["createdAt", "data"],
        where: {
          type: { [Op.like]: "Login" },
        },
      });

      includes.push({
        model: db.user_family,
        as: "family",
        attributes: [
          "id",
          "picture",
          "first_name",
          "middle_name",
          "last_name",
          "fullName",
        ],
      });
      includes.push("user_medical");
      includes.push("medical_conditions");
      db.user
        .findAll({
          where: where,
          include: includes,
          order: [[orderKey, order]],
          attributes: [
            "id",
            "first_name",
            "last_name",
            "middle_name",
            "gender",
            "fullName",
            "email",
            "phone_number",
            "createdAt",
            "suspend_remarks",
            "isd_code",
          ],
        })
        .then((resp) => {
          response(res, { count: queryResult.length, rows: resp });
        })
        .catch((err) => {
          errorResponse(res, err);
        });
    } catch (err) {
      errorResponse(res, err);
    }
  },
  approveUser: async (req, res, next) => {
    if (req.user && req.user.id) {
      db.user
        .update({ status: 1 }, { where: { id: req.body.id } })
        .then(async (resp) => {
          db.approval_review
            .findOrCreate({
              where: { section: "activated", user_id: req.body.id },
            })
            .then(async (resp) =>
              resp[0].update({
                remark: req.body.suspend_remarks,
                reviewer: req.user.id,
              })
            );
          let user = await db.user.findOne({
            where: { id: req.body.id },
            include: ["user_role", "associatedTo"],
          });
          var trigger = "Reviewer_Activated_Account";
          if (user && user.user_role && user.user_role.role_id) {
            switch (user.user_role.role_id) {
              case 1:
                trigger = "Reviewer_Activated_Account_Doctor";
                break;
              // case 2: trigger = 'Reviewer_Activated_Account_Patient'; break;
              case 3:
                trigger = "Reviewer_Activated_Account_Nurse";
                break;
              case 4:
                trigger = "Reviewer_Activated_Account_Lab";
                break;
              case 5:
                trigger = "Reviewer_Activated_Account_Clinic";
                break;
              case 6:
                trigger = "Reviewer_Activated_Account_Pharmacy";
                break;
            }
          }
          if (user.user_role.role_id != 2) {
            //ignore patient
            crmTrigger(
              trigger,
              {
                email: user.email,
                userName: user.fullName,
                company_name: user.company_name,
                reviewer: `${req.user.first_name} ${req.user.last_name}`,
                remarks: req.body.remarks,
              },
              user.lang || req.lang || "es"
            );
            if (user.associatedTo && user.associatedTo.user) {
              var clinic = user.associatedTo.user;
              crmTrigger(
                "staff_reviewer_approved_profile",
                {
                  email: clinic.email,
                  Staff_name: user.fullName,
                  staff_photo: user.picture,
                  reviewer_name: `${req.user.first_name} ${req.user.last_name}`,
                  reviewer_photo: `${req.user.picture}`,
                  staff_email: user.email,
                  staff_profile_link: `${config.domains.clinic}/my-staff/view/${user.id}`,
                },
                clinic.lang || req.lang || "es"
              );
            }
          }
          addActivityLog({
            user_id: user.id,
            by_id: req.user.id,
            type: "User_Approved",
            data: {
              reviewer: `${req.user.first_name} ${req.user.last_name}`,
              action: "approved",
            },
          });
          return response(res, resp, "MESSAGE.USER_APPROVED");
        })
        .catch((err) => errorResponse(res, err));
    } else {
      res.sendStatus(406);
    }
  },
  disapproveUser: async (req, res, next) => {
    db.user
      .update({ status: 0 }, { where: { id: req.body.id } })
      .then(async (resp) => {
        let user = await db.user.findByPk(req.body.id);
        addActivityLog({
          user_id: user.id,
          by_id: req.user.id,
          type: "User_Dis_Approved",
          data: {
            reviewer: `${req.user.first_name} ${req.user.last_name}`,
            action: "disapproved",
          },
        });
        return response(res, resp, "MESSAGE.USER_APPROVED");
      })
      .catch((err) => errorResponse(res, err));
  },
  getAllUnapprovedUser: async (req, res, next) => {
    var where = {
      [Op.or]: [{ status: 0 }, { status: { [Op.eq]: null } }],
      email_verified: 1,
      isSigned: true,
    };
    let search = "";
    let page = 1;
    let pageSize = 25;
    let orderKey = "id";
    let order = "asc";

    if (req.body) {
      let data = req.body;
      search = data.search || "";
      orderKey = data.orderKey || "id";
      order = data.order || "asc";
      page = data.page || 1;
      pageSize = data.pageSize || 25;
    }

    var isReviewerRequired = false;
    if (search && search.length) {
      isReviewerRequired = true;
      where = {
        ...where,
        [Op.or]: [
          { first_name: { [Op.like]: `%${search}%` } },
          { middle_name: { [Op.like]: `%${search}%` } },
          { last_name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { company_name: { [Op.like]: `%${search}%` } },
          { phone_number: { [Op.like]: `%${search}%` } },

          // { '$reviewer.admin.first_name$': { [Op.like]: `%${search}%` } },
          // { '$reviewer.admin.last_name$': { [Op.like]: `%${search}%` } },
        ],
      };
    }

    db.user
      .findAndCountAll({
        where: where,
        order: [[orderKey, order]],
        distinct: true,
        limit: getLimitOffset(page, pageSize),
        include: [
          {
            model: db.user_role,
            as: "user_role",
            where: { role_id: { [Op.ne]: 2 } },
            left: true,
          },
          {
            model: db.associate,
            as: "associate",
            include: ["admin", "user"],
          },
          {
            model: db.user_profile_reviewer,
            as: "reviewer",
            include: [
              {
                model: db.admin,
                as: "admin",
                required: isReviewerRequired,
              },
            ],
          },
        ],
      })
      .then((rsp) => response(res, rsp))
      .catch((err) => errorResponse(res, err));
  },
  getAllPendingUser: async (req, res, next) => {
    var where = {
      [Op.or]: [{ status: 0 }, { status: { [Op.eq]: null } }],
      email_verified: 1,
      [Op.or]: [{ isSigned: false }, { isSigned: { [Op.eq]: null } }],
    };

    let search = "";
    let page = 1;
    let pageSize = 25;
    let orderKey = "id";
    let order = "asc";

    if (req.body) {
      let data = req.body;
      search = data.search || "";
      orderKey = data.orderKey || "id";
      order = data.order || "asc";
      page = data.page || 1;
      pageSize = data.pageSize || 25;
    }
    var isReviewerRequired = false;

    if (search && search.length) {
      isReviewerRequired = true;
      where = {
        ...where,
        [Op.or]: [
          { first_name: { [Op.like]: `%${search}%` } },
          { middle_name: { [Op.like]: `%${search}%` } },
          { last_name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { company_name: { [Op.like]: `%${search}%` } },
          { phone_number: { [Op.like]: `%${search}%` } },

          // { '$reviewer.admin.first_name$': { [Op.like]: `%${search}%` } },
          // { '$reviewer.admin.last_name$': { [Op.like]: `%${search}%` } },
        ],
      };
    }
    db.user
      .findAndCountAll({
        where: where,
        order: [[orderKey, order]],
        distinct: true,
        limit: getLimitOffset(page, pageSize),
        include: [
          {
            model: db.user_role,
            as: "user_role",
            where: { role_id: { [Op.ne]: 2 } },
            left: true,
          },
          {
            model: db.associate,
            as: "associate",
            include: ["admin", "user"],
          },
          {
            model: db.user_profile_reviewer,
            as: "reviewer",
            include: [
              {
                model: db.admin,
                as: "admin",
                required: isReviewerRequired,
              },
            ],
          },
        ],
      })
      .then((rsp) => response(res, rsp))
      .catch((err) => {
        errorResponse(res, err);
      });
  },
  approveDisapproveSections: async (req, res, next) => {
    let data = req.body;
    data.reviewer = req.user.id || null;

    let inst = db.approval_review
      .findOrCreate({
        where: {
          section: data.section,
          section_id: data.section_id,
        },
      })
      .then(async (resp) => {
        resp[0].update(data);

        var user = await db.user.findOne({
          where: { id: data.user_id },
          include: ["associatedTo"],
        });
        var reviewerAdmin = await db.admin.findByPk(req.user.id);

        var reviewList = await db.approval_review.findAll({
          where: { user_id: data.user_id },
        });
        var crmData = {
          email: user.email,
          userName: user.fullName,
          remarks: data.remark,
          reviewerEmail: reviewerAdmin.email,
          reviewerName: req.user.first_name,
          reviewer_picture: reviewerAdmin.picture,

          national_id_status: " - ",
          license_status: " - ",
          practice_status: " - ",
          service_status: " - ",

          section_name: data.section,
        };
        reviewList.forEach((review) => {
          crmData[`${review.section}_status`] = review.status
            ? "Approved"
            : "Disapproved";
        });

        await crmTrigger("Reviewer_Checked_Profile", crmData);
        if (user.associatedTo && user.associatedTo.user) {
          var clinic = user.associatedTo.user;
          var clinicCrmData = JSON.parse(JSON.stringify(crmData));
          clinicCrmData.email = clinic.email;
          clinicCrmData.company_name = clinic.company_name;

          crmTrigger(
            "staff_reviewer_checked_profile",
            clinicCrmData,
            req.lang || "en"
          );
        }

        let type =
          resp[0].status > 0 ? "User_Info_Approved" : "User_Info_Dis_Approved";
        addActivityLog({
          user_id: user.id,
          by_id: req.user.id,
          type: type,
          data: {
            section: data.section,
            title: data.title,
            reviewer: `${req.user.first_name} ${req.user.last_name}`,
            remark: resp[0].remark,
            file: resp[0].file,
          },
        });
        return response(res, resp[0]);
      })
      .catch((err) => {
        errorResponse(res, err);
      });
  },
  getApprovalReviewData: async (req, res) => {
    let data = req.body;
    db.approval_review
      .findOne({
        where: {
          section: data.section,
          section_id: data.section_id,
        },
      })
      .then((resp) => {
        return response(res, resp);
      })
      .catch((err) => errorResponse(res, err));
  },
  getApprovalReviews: async (req, res) => {
    let data = req.params;
    db.approval_review
      .findAll({
        where: {
          user_id: data.user_id,
        },
        include: [
          {
            model: db.admin,
            as: "review_manager",
            attributes: ["first_name", "last_name", "fullName"],
          },
        ],
      })
      .then((resp) => response(res, resp))
      .catch((err) => errorResponse(res, err));
  },

  quickTrack: async (req, res, next) => {
    let sql = `
        SELECT u.createdAt joiningDate, t.created_at lastLogin, b.createdAt lastBooked, 
        b.id bookingId, sa.id analysisId, sa.createdAt lastanalysisDate,t.platform loginPlatform,
        u.device_type registerDevice, um.createdAt welcomeMailRead 
        FROM users u
        LEFT JOIN tokens t ON t.user_id = u.id
        LEFT JOIN bookings b ON b.patient_id = u.id
        LEFT JOIN symptom_analysis sa ON sa.user_id = u.id
        LEFT JOIN usermeta um ON um.user_id = u.id
        WHERE u.id = ${req.params.user_id}
        ORDER BY lastLogin DESC, lastBooked DESC,lastanalysisDate DESC
        LIMIT 1
        `;
    db.sequelize
      .query(sql)
      .spread((resp) => response(res, resp[0]))
      .catch((e) => errorResponse(res, e));
  },

  userFinder: async (req, res, next) => {
    let sql = `
    SELECT
    CASE
    WHEN ur.role_id < 4 THEN CONCAT(
    COALESCE(u.first_name, ''), ' ',
    COALESCE(u.middle_name, ''), ' ',
    COALESCE(u.last_name, ''), ' ',
    COALESCE(u.last_name_2, '')
    )
    ELSE u.company_name
    END AS fullName,
    u.email,u.phone_number,
    u.createdAt,r.role,ur.role_id,u.id
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN roles r ON r.id = ur.role_id
    where (u.email like '%${req.params.search}%'
    OR  u.phone_number like '%${req.params.search}%'
    OR  u.telephone_1 like '%${req.params.search}%'
    OR  u.telephone_1 like '%${req.params.search}%'
    OR CONCAT(
    COALESCE(u.first_name, ''), 
    COALESCE(u.middle_name, ''), 
    COALESCE(u.last_name, ''), 
    COALESCE(u.last_name_2, ''))
    LIKE '%${req.params.search}%')
    `;
    if (req.query && req.query.role) {
      let role = req.query.role;
      sql += ` AND ur.role_id = ${role}`;
    }
    db.sequelize.query(sql).spread((resp, m) => {
      res.send(resp)
    }).catch(e => res.status(400).send({ error: `${e}` }))
  }
};
