/* eslint-disable no-unused-vars */
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const db = require("../models");
const { upload } = require("../commons/fileupload");

const { addActivityLog } = require("./activityLog");
const { timeFormat } = require("../commons/helper");
const { queueEmail } = require("../commons/jobs");

module.exports = {
  getCountryList(req, res, next) {
    db.country
      .findAll({
        where: { status: true },
      })
      .then((response) => {
        res.send(response);
      })
      .catch((err) => {
        res.status(500).send({
          error_code: 105,
          status: false,
          error: `${err}`,
        });
      });
  },
  getStateList(req, res, next) {
    let options = {};
    let params = req.params || {};
    if (req.query && req.query.country) {
      options.where = {
        country_id: req.query.country,
      };
    }
    if (params.country) {
      options.where = {
        country_id: params.country,
      };
    }
    db.state
      .findAll(options)
      .then((response) => {
        res.send(response);
      })
      .catch((err) => {
        res.status(500).send({
          error_code: 105,
          status: false,
          error: `${err}`,
        });
      });
  },

  searchCityList(req, res, next) {
    if (req.body.countryId) {
      let string = req.body.search || '';
      let countryId = req.body.countryId;
      let sql = `SELECT ct.name,ct.short_name,ct.code,ct.state_id,cn.id country_id FROM cities ct, states s, countries cn
                  WHERE ct.state_id = s.id AND s.country_id = cn.id AND cn.id = ${countryId}`;
      if (!!string) {
        sql += ` and (c.name like '%${string}%' or c.code like '%${string}%' or c.short_name like '%${string}%')`
      }
      db.sequelize
        .query(sql)
        .spread((data) => {
          res.send(data);
        })
        .catch((err) => {
          res.status(500).send({
            error_code: 105,
            status: false,
            error: err,
          });
        });
    } else {
      res.sendStatus(406);
    }
  },

  async getCountry(req, res, next) {
    let queryWhere = {};
    if (req.body.name) {
      queryWhere.name = {
        [Op.like]: "%" + req.body.name + "%",
      };
    }
    if (req.body.shortname) {
      queryWhere.shortname = req.body.shortname;
    }
    if (req.body.phonecode) {
      queryWhere.phonecode = req.body.phonecode;
    }

    db.country
      .findAll({ where: queryWhere })
      .then((resp) => {
        res.send(resp);
      })
      .catch((err) => {
        res.status(400).send({
          status: false,
          errors: err,
        });
      });
  },
  async getState(req, res, next) {
    let queryWhere = {};
    if (req.body.name) {
      queryWhere.name = {
        [Op.like]: "%" + req.body.name + "%",
      };
    }
    if (req.body.country_id) {
      queryWhere.country_id = req.body.country_id;
    }

    db.state
      .findAll({ where: queryWhere })
      .then((resp) => {
        res.send(resp);
      })
      .catch((err) => {
        res.status(400).send({
          status: false,
          errors: err,
        });
      });
  },
  async getCity(req, res, next) {
    let queryWhere = {};
    if (req.body.name) {
      queryWhere.name = {
        [Op.like]: "%" + req.body.name + "%",
      };
    }
    if (req.body.state_id) {
      queryWhere.state_id = req.body.state_id;
    }

    db.city
      .findAll({ where: queryWhere })
      .then((resp) => {
        res.send(resp);
      })
      .catch((err) => {
        res.status(400).send({
          status: false,
          errors: err,
        });
      });
  },

  roleList(req, res, next) {
    db.role
      .findAll({ where: { group: { [Op.lte]: 2 } } })
      .then((data) => {
        res.send(data);
      })
      .catch((error) => {
        res.status(500).send({
          error_code: 105,
          status: false,
          error: `${error}`,
        });
      });
  },
  async InsuranceProviders(req, res, next) {
    try {
      let where = { status: 1 };
      if (req.query && req.query.country_id) {
        where["country_id"] = req.query.country_id;
      }
      let providers = await db.insurence_provider.findAll({
        where: where,
        order: [["name", "asc"]],
      });
      res.send(providers);
    } catch (error) {
      res.status(500).send({
        error_code: 105,
        status: false,
        error: error,
      });
    }
  },
  async Banks(req, res, next) {
    try {
      let where = { status: 1 };
      if (req.query && req.query.country_id) {
        where["country_id"] = req.query.country_id;
      }
      let banks = await db.bank.findAll({ where: where });
      res.send(banks);
    } catch (error) {
      res.status(500).send({
        error_code: 105,
        status: false,
        error: error,
      });
    }
  },
  async InsuranceBenifits(req, res, next) {
    try {
      let benifits = await db.insurence_benifit.findAll();
      res.send(benifits);
    } catch (error) {
      res.status(500).send({
        error_code: 105,
        status: false,
        error: error,
      });
    }
  },
  async uploadDocs(req, res, next) {
    if (req.user && req.user.id) {
      upload(req, "documents", "file")
        .then(async (resp) => {
          addActivityLog({
            user_id: req.user.id,
            type: "Documents Shared",
            details: `${req.user.email} shared new documents`,
          });
          res.send({
            status: true,
            path: resp.path,
          });
        })
        .catch((err) => {
          res.status(404).json({
            error: true,
            status: false,
            errors: `${err}`,
          });
        });
    } else {
      res.status(406).json({
        error: true,
        status: false,
      });
    }
  },
  async uploadImage(req, res, next) {
    if (req.user && req.user.id) {
      upload(req, "image", "file").then(async (resp) => {
        res
          .send({
            status: true,
            path: resp.path,
          })
          .catch((err) => {
            res.status(404).json({
              error: true,
              status: false,
              errors: `${err}`,
            });
          });
      });
    } else {
      res.status(406).json({
        error: true,
        status: false,
      });
    }
  },
  async getCouncelingId(req, res, next) {
    if (req.body.patient_id && req.body.provider_id) {
      let ch = Date.now();
      let channel = ch.toString(16);
      db.councelling
        .findOrCreate({
          channel,
          ...req.body,
        })
        .then((resp) => {
          res.send(resp);
        })
        .catch((err) => {
          res.status(400).send({
            status: false,
            error: `${err}`,
          });
        });
    } else {
      res.status(500).send({
        status: false,
        error: "patient or provider",
      });
    }
  },

  /** Couselling Billing */
  async addCounsellingBilling(req, res, next) {
    let data = req.body;
    try {
      let resp = await db.billing.upsert(data);
      res.send({
        status: true,
        data: resp,
      });
      addActivityLog({
        user_id: req.user.id,
        type: "Any Bill Paid",
        details: `${req.user.email} created new billing`,
      });
    } catch (error) {
      res.status(400).send({
        status: false,
        errors: error,
      });
    }
  },
  async removeCounsellingBilling(req, res, next) {
    if (req.body.id) {
      try {
        let resp = await db.billing.destroy({ where: { id: req.body.id } });
        res.send({
          status: true,
          data: resp,
        });
      } catch (error) {
        res.status(400).send({
          status: false,
          errors: error,
        });
      }
    } else {
      res.sendStatus(406);
    }
  },
  async getCounsellingBilling(req, res, next) {
    if (req.body.cid) {
      try {
        let resp = await db.billing.findAll({ where: { cid: req.body.cid } });
        res.send({
          status: true,
          data: resp,
        });
      } catch (error) {
        res.status(400).send({
          status: false,
          errors: error,
        });
      }
    } else {
      res.sendStatus(406);
    }
  },

  /** Couselling Documents */
  async addCounsellingDocument(req, res, next) {
    let data = req.body;
    try {
      let resp = await db.counselling_document.upsert(data);
      res.send({
        status: true,
        data: resp,
      });
    } catch (error) {
      res.status(400).send({
        status: false,
        errors: error,
      });
    }
  },
  async removeCounsellingDocument(req, res, next) {
    if (req.body.id) {
      try {
        let resp = await db.counselling_document.destroy({
          where: { id: req.body.id },
        });
        res.send({
          status: true,
          data: resp,
        });
      } catch (error) {
        res.status(400).send({
          status: false,
          errors: error,
        });
      }
    } else {
      res.sendStatus(406);
    }
  },
  async getCounsellingDocument(req, res, next) {
    if (req.body.cid) {
      try {
        let resp = await db.counselling_document.findAll({
          where: { cid: req.body.cid },
        });
        res.send({
          status: true,
          data: resp,
        });
      } catch (error) {
        res.status(400).send({
          status: false,
          errors: error,
        });
      }
    } else {
      res.sendStatus(406);
    }
  },

  /** Departments */
  async getDepartments(req, res, next) {
    let where = { status: 1 };
    if (req.query.title) {
      where.title = {
        [Op.like]: "%" + req.query.title + "%",
      };
    }
    if (req.query.role_id) {
      where.role_id = req.query.role_id;
    }
    let attributes = ["id", "details", "title", "symbol", "status"];
    if (req.lang && req.lang == "es") {
      attributes = [
        "id",
        ["details_es", "details"],
        ["title_es", "title"],
        "symbol",
        "status",
      ];
    }

    try {
      let resp = await db.department.findAll({
        where: where,
        attributes: attributes,
        include: [
          {
            model: db.speciality,
            as: "specialities",
            // Filtering at Client Side ?
            attributes: attributes,
            where: {
              status: 1,
            },
          },
        ],
      });
      res.send(resp);
    } catch (error) {
      res.status(400).send({
        status: false,
        errors: error,
      });
    }
  },

  /** Specialities */
  async getSpecialities(req, res, next) {
    let where = { status: true };
    let query = req.query || {};
    let body = req.body || {};
    if (query.need_department) {
      query.need_department = eval(query.need_department);
    }

    if (query.title || query.search) {
      let search = query.title || query.search;
      let cond = [
        { title: { [Op.like]: `%${search}%` } },
        { title_es: { [Op.like]: `%${search}%` } },
        { tags: { [Op.like]: `%${search}%` } },
      ];
      if (query.need_department) {
        cond.push(
          { "$department.title$": { [Op.like]: `%${search}%` } },
          { "$department.title_es$": { [Op.like]: `%${search}%` } },
          { "$department.tags$": { [Op.like]: `%${search}%` } }
        );
      }
      where = {
        status: true,
        [Op.or]: cond,
      };
    }
    let attributes = [
      "id",
      "details",
      "title",
      "symbol",
      "status",
      "department_id",
      "role_id",
      "category",
      "tags",
      "isDefaultSeleted",
    ];
    if (req.lang && req.lang == "es") {
      attributes = [
        "id",
        ["details_es", "details"],
        ["title_es", "title"],
        "symbol",
        "status",
        "department_id",
        "role_id",
        "category",
        "tags",
        "isDefaultSeleted",
      ];
    }

    var include = [];
    if (query.need_department) {
      let attr = ["id", "details", "title", "symbol"];
      if (req.lang && req.lang == "es") {
        attr = [
          "id",
          ["details_es", "details"],
          ["title_es", "title"],
          "symbol",
        ];
      }
      include = [
        {
          model: db.department,
          attributes: attr,
          as: "department",
          where: { status: true },
        },
        {
          model: db.user_service,
          as: "user_service",
          attributes: ["id", "user_id", "service"],
          // attributes: []
          required: true,
        },
      ];
    }
    if (query.department_id) {
      where.department_id = query.department_id;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (!!!eval(query.categorise) && !!!eval(body.categorise)) {
      if (query.role_id) {
        where.role_id = query.role_id;
      }
      if (body.role_id) {
        where.role_id = body.role_id;
      }
    }
    if (!!query.search || !!body.search) {
    }

    try {
      // let resp = await db.speciality.findAll({ where: where, attributes });
      let resp = await db.speciality.findAll({
        where: where,
        include: include,
        attributes,
        order: [["isDefaultSeleted", "DESC"]],
      });
      let response = null;
      if (!!eval(query.categorise) || !!eval(body.categorise)) {
        response = {};
        resp.forEach((element) => {
          response[element.category] = response[element.category] || [];
          response[element.category].push(element);
        });
      } else {
        response = resp;
      }
      res.send({
        status: true,
        data: response,
      });
    } catch (error) {
      res.status(400).send({
        status: false,
        errors: error,
      });
    }
  },

  /** Counselling Types */
  async getCounsellingTypes(req, res, next) {
    let where = {};
    if (req.body.title) {
      where.title = {
        [Op.like]: "%" + req.body.title + "%",
      };
    }
    if (req.body.status) {
      where.status = req.body.status;
    }

    try {
      let resp = await db.counselling_type.findAll({ where: where });
      res.send({
        status: true,
        data: resp,
      });
    } catch (error) {
      res.status(400).send({
        status: false,
        errors: error,
      });
    }
  },

  /** Slots */
  async getSlots(req, res, next) {
    let where = {};
    if (req.body.counselling_type) {
      where.counselling_type = req.body.counselling_type;
    }
    if (req.body.status) {
      where.status = req.body.status;
    }

    try {
      let resp = await db.slot.findAll({ where: where });
      res.send({
        status: true,
        data: resp,
      });
    } catch (error) {
      res.status(400).send({
        status: false,
        errors: error,
      });
    }
  },

  /** Pricings */
  async getPricings(req, res, next) {
    let where = {};
    if (req.body.department_id) {
      where.department_id = req.body.department_id;
    }
    if (req.body.speciality_id) {
      where.speciality_id = req.body.speciality_id;
    }
    if (req.body.counselling_type) {
      where.counselling_type = req.body.counselling_type;
    }
    if (req.body.slot_id) {
      where.slot_id = req.body.slot_id;
    }
    if (req.body.cost) {
      where.cost = req.body.cost;
    }
    if (req.body.status) {
      where.status = req.body.status;
    }

    try {
      let resp = await db.pricing.findAll({ where: where });
      res.send({
        status: true,
        data: resp,
      });
    } catch (error) {
      res.status(400).send({
        status: false,
        errors: error,
      });
    }
  },
  getServicePrice: async (req, res, next) => {
    db.pricing
      .findOne({
        where: {
          speciality_id: req.body.speciality_id,
          counselling_type: req.body.counselling_type,
        },
      })
      .then((resp) => {
        res.send(resp);
      })
      .catch((err) => {
        res.send({
          status: false,
          errors: `${err}`,
        });
      });
  },
  getAllProviders(req, res, next) {
    db.user
      .findAll({
        where: { status: { [Op.ne]: 0 } },
        include: [
          "education",
          {
            model: db.user_role,
            as: "user_role",
            where: {
              role_id: { [Op.in]: [1, 5, 3] },
            },
          },
        ],
      })
      .then((resp) => res.send(resp))
      .catch((err) =>
        res.status(400).send({ status: false, errors: `${err}` })
      );
  },

  async addAllergy(req, res, next) {
    let data = req.body;
    try {
      let resp = await db.allergy.upsert(data);
      res.send({
        status: true,
        data: resp,
      });
    } catch (error) {
      res.status(400).send({
        status: false,
        errors: error,
      });
    }
  },
  async addSurgery(req, res, next) {
    let data = req.body;
    try {
      let resp = await db.surgery.upsert(data);
      res.send({
        status: true,
        data: resp,
      });
    } catch (error) {
      res.status(400).send({
        status: false,
        errors: error,
      });
    }
  },
  async addMedicalCondition(req, res, next) {
    let data = req.body;
    try {
      let resp = await db.medical_condition.upsert(data);
      res.send({
        status: true,
        data: resp,
      });
    } catch (error) {
      res.status(400).send({
        status: false,
        errors: error,
      });
    }
  },
  getAllergies(req, res, next) {
    db.allergy
      .findAll()
      .then((response) => {
        res.send(response);
      })
      .catch((err) => {
        res.status(500).send({
          error_code: 105,
          status: false,
          error: `${err}`,
        });
      });
  },
  getSurgeries(req, res, next) {
    db.surgery
      .findAll()
      .then((response) => {
        res.send(response);
      })
      .catch((err) => {
        res.status(500).send({
          error_code: 105,
          status: false,
          error: `${err}`,
        });
      });
  },
  getMedicalConditions(req, res, next) {
    db.medical_condition
      .findAll()
      .then((response) => {
        res.send(response);
      })
      .catch((err) => {
        res.status(500).send({
          error_code: 105,
          status: false,
          error: `${err}`,
        });
      });
  },
  async getTemplate(req, res) {
    let { id } = req.params;
    try {
      let result = await db.contract_template.findOne({
        include: ["contractType"],
        where: { id },
      });
      res.status(200).json({
        status: true,
        data: result,
      });
    } catch (error) {
      res.status(500).send({
        error_code: 105,
        status: false,
        error: `${error}`,
      });
    }
  },
  async getUserContractTemplate(req, res) {
    if (req.user && req.user.id) {
      try {
        var lang = req.lang || "en";

        var user_id = req.user.id;
        if (req.query && req.query.user_id) user_id = req.query.user_id;

        var user = await db.user.findOne({
          where: { id: user_id },
          include: [
            {
              model: db.user_role,
              as: "user_role",
              include: ["role_info"],
              required: false,
            },
            "address",
            {
              model: db.user_service,
              as: "services",
              include: ["department"],
              required: false,
            },
            "associatedTo",
          ],
        });

        var contractTypeName = "Individual Doctor Contract";

        if (user && user.user_role && user.user_role.role_id === 1) {
          contractTypeName = "Individual Doctor Contract";
          if (user && user.associatedTo && user.associatedTo.user) {
            contractTypeName = "Associated Doctor Contract";
          }
          if (user.speciality_type == 4)
            contractTypeName = `Non Medical ${contractTypeName}`;
        }
        if (user && user.user_role && user.user_role.role_id === 5) {
          contractTypeName = "Clinic Contract";
        }
        console.log(contractTypeName);
        let result = await db.contract_template.findOne({
          include: [
            {
              model: db.contractType,
              as: "contractType",
              required: true,
              where: { name: contractTypeName },
            },
          ],
          where: {
            isActive: true,
          },
        });

        if (result) {
          result = JSON.parse(JSON.stringify(result));
          var html = result.html || result.html_es;
          if (lang === "en" && result.html !== null && result.html.length)
            html = result.html;
          if (lang === "es" && result.html_es !== null && result.html_es.length)
            html = result.html_es;

          let creds =
            (await db.credential.findAll({
              where: {
                key: {
                  [Op.in]: [
                    "org_name",
                    "cc_nit",
                    "legal_representative",
                    "org_address",
                    "org_city",
                    "org_department",
                    "org_phone",
                    "org_Email",
                  ],
                },
              },
              attributes: ["key", "value"],
            })) || [];
          var data = {
            // credential
            org_name:
              (creds.find((e) => e.key.toLowerCase() == "org_name") || {})
                .value || "",
            CC_NIT:
              (creds.find((e) => e.key.toLowerCase() == "cc_nit") || {})
                .value || "",
            legal_representative:
              (
                creds.find(
                  (e) => e.key.toLowerCase() == "legal_representative"
                ) || {}
              ).value || "",
            org_address:
              (creds.find((e) => e.key.toLowerCase() == "org_address") || {})
                .value || "",
            org_city:
              (creds.find((e) => e.key.toLowerCase() == "org_city") || {})
                .value || "",
            org_department:
              (creds.find((e) => e.key.toLowerCase() == "org_department") || {})
                .value || "",
            Org_phone:
              (creds.find((e) => e.key.toLowerCase() == "org_phone") || {})
                .value || "",
            Org_Email:
              (creds.find((e) => e.key.toLowerCase() == "org_Email") || {})
                .value || "",

            user_role_type: "",
            user_full_name: "",
            user_id_Type: "",
            user_id_number: "",
            user_phone_number: "",
            user_email: "",
            todaydate: timeFormat(new Date()),
            user_signature: "",
            user_primary_address: "",
            user_city: "",
            user_department: "",
          };

          if (user) {
            var user_role_type = "";
            if (user.user_role && user.user_role.role_info)
              user_role_type = user_role_type = user.user_role.role_info.role;
            var fullName = user.fullName;
            if (
              user.user_role &&
              (user.user_role.role_id == 5 || user.user_role.role_id == 13)
            )
              fullName = user.company_name;

            data = {
              ...data,
              user_role_type: user_role_type,
              user_full_name: fullName,
              user_id_Type: user.id_proof_type,
              user_id_number: user.national_id,
              user_phone_number: user.phone_number,
              user_email: user.email,
              tp: user.tp,
              todaydate: timeFormat(new Date(), user.timezone_offset),
              user_signature: "",
              user_primary_address: "",
              user_city: "",
              user_department: "",
            };
            if (user.address) {
              data = {
                ...data,
                user_primary_address: user.address.address,
                user_city: user.address.city,
              };
            }
            if (user.services) {
              var user_department = user.services
                .filter((s) => s.department)
                .map((s) => s.department.title)
                .join(", ");
              data = { ...data, user_department: user_department };
            }
          }

          for (let key in data) {
            let str = "${" + key + "}";
            html = html.split(str).join(data[key] || ""); //replace All
          }

          result.html = html;
        }
        res.status(200).json({
          status: true,
          data: result,
        });
      } catch (error) {
        console.log(error);
        res.status(500).send({
          error_code: 105,
          status: false,
          error: `${error}`,
        });
      }
    } else {
      res.sendStatus(406);
    }
  },
  async checkNewUserContractTemplate(req, res) {
    if (req.user && req.user.id) {
      try {
        var lang = req.lang || "en";

        var user_id = req.user.id;
        if (req.query && req.query.user_id) user_id = req.query.user_id;

        var user = await db.user.findOne({
          where: { id: user_id },
          include: [
            {
              model: db.user_role,
              as: "user_role",
              include: ["role_info"],
              required: false,
            },
            "associatedTo",
            {
              model: db.signedContract,
              as: "contract",
              required: false,
              where: {
                status: 1,
                end: { [Op.or]: [{ [Op.eq]: null }, { [Op.gt]: new Date() }] },
              },
            },
          ],
        });

        if (user === null || user.contract === null) {
          res.status(200).json({
            status: false,
          });
          return;
        }
        var contractTypeName = "Individual Doctor Contract";

        if (user && user.user_role && user.user_role.role_id === 1) {
          contractTypeName = "Individual Doctor Contract";
          if (user && user.associatedTo && user.associatedTo.user) {
            contractTypeName = "Associated Doctor Contract";
          }
        }
        if (user && user.user_role && user.user_role.role_id === 5) {
          contractTypeName = "Clinic Contract";
        }

        let result = await db.contract_template.findOne({
          include: [
            {
              model: db.contractType,
              as: "contractType",
              required: true,
              where: { name: contractTypeName },
            },
          ],
          where: {
            isActive: true,
          },
        });

        if (result && result.version > (user.contract.version || 0)) {
          res.status(200).json({
            status: true,
            data: result,
            end: user.contract.end,
          });
        } else {
          res.status(200).json({
            status: false,
          });
        }
      } catch (error) {
        res.status(500).send({
          error_code: 105,
          status: false,
          error: `${error}`,
        });
      }
    } else {
      res.sendStatus(406);
    }
  },
  async contract_footer_template(req, res) {
    try {
      let result = await db.contract_template.findAll({
        where: { title: { [Op.like]: "%" + "contract_footer_" + "%" } },
      });
      res.status(200).json({
        status: true,
        data: result,
      });
    } catch (error) {
      res.status(500).send({
        error_code: 105,
        status: false,
        error: `${error}`,
      });
    }
  },

  async getStaticPage(req, res) {
    let lang = req.lang || "en";
    db.static_page_detail
      .findOne({
        where: { code: req.params.code, language: lang, isPublished: true },
      })
      .then((resp) => {
        if (!!resp) {
          res.send(resp);
        } else {
          let data = db.static_page_detail.build({
            code: req.params.code,
            name: req.params.code,
            content: null,
            language: lang,
            isPublished: true,
          });
          res.send(data);
        }
      })
      .catch((err) => {
        res.send({
          errors: `${err}`,
        });
      });
  },
  async getDropdowns(req, res) {
    let lang = req.lang || "en";
    let where = {};
    if (req.params && req.params.types) {
      let dropdowns = req.params.types.split(",");
      where["section"] = { [Op.in]: dropdowns };
    }
    if (req.query && req.query.types) {
      let dropdowns = req.query.types.split(",");
      where["section"] = { [Op.in]: dropdowns };
    }
    if (req.query && req.query.lang) {
      lang = req.query.lang;
    }
    db.translation
      .findAll({
        where: where,
        attributes: ["id", "keyword", "section", lang],
        // group: "type"
      })
      .then((resp) => {
        let data = {};
        resp.map((r) => {
          let key = r.section.toLowerCase();
          data[key] = data[key] || [];
          data[key].push({
            id: r.id,
            keyword: r["keyword"],
            text: r[lang] || r["keyword"],
          });
        });
        res.send(data);
      })
      .catch((err) => {
        res.send({
          errors: `${err}`,
        });
      });
  },
  async getEmailConversation(req, res, next) {
    let where = {};
    if (req.query.email) {
      where = {
        [Op.or]: [
          { from: { [Op.eq]: req.query.email } },
          { to: { [Op.eq]: req.query.email } },
        ],
      };
    }

    try {
      let resp = await db.email_conversation.findAll({ where: where });
      res.send(resp);
    } catch (error) {
      res.status(400).send({
        status: false,
        errors: error,
      });
    }
  },
  async send_Email(req, res) {
    var r = await db.email_conversation.upsert(req.body);
    res.send(r);
    queueEmail(req.body.to, req.body.subject, {
      html: req.body.message,
    });
  },

  /**get contract track */
  async getContrackTrack(req, res) {
    let { id } = req.params;
    try {
      let result = await db.contract_track.findOne({
        include: ["user", "template"],
        where: { id },
      });
      res.status(200).json({
        status: true,
        data: result,
      });
    } catch (error) {
      res.status(500).send({
        error_code: 105,
        status: false,
        error: `${error}`,
      });
    }
  },
  async updateContrackTrack(req, res) {
    try {
      let update = db.contract_track.update(req.body, {
        where: { id: req.params.id },
      });
      res.status(200).json({
        status: true,
        data: update,
      });
    } catch (error) {
      res.status(500).send({
        error_code: 105,
        status: false,
        error: `${error}`,
      });
    }
  },
};
