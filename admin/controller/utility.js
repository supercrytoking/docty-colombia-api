const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { upload } = require('../../commons/fileupload');

const { addActivityLog } = require('./activityLog');
const { sendEmail, capitalize } = require('../../commons/helper');
const { response, errorResponse } = require('../../commons/response');
const { getLimitOffset } = require('../../commons/paginator')

var jobController = require('../../jobs/jobController');
var xlsx = require('node-xlsx');
var fs = require('fs');

module.exports = {
  getCountryList(req, res, next) {
    db.country.findAll({ order: [['status', 'desc']] }).then(response => {
      res.send(response)
    }).catch(err => {
      res.status(500).send({
        error_code: 105,
        status: false,
        error: `${err}`
      })
    })
  },
  addCountry: async (req, res, next) => {
    let data = req.body;
    if (req.user && req.user.id) {
      try {
        let resp = await db.country.upsert(data);
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
  },
  addState: async (req, res, next) => {
    let data = req.body;
    if (req.user && req.user.id) {
      try {
        let resp = await db.state.upsert(data);
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
  },
  addCity: async (req, res, next) => {
    let data = req.body;
    if (req.user && req.user.id) {
      try {
        let resp = await db.city.upsert(data);
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
  },
  deleteCountry: async (req, res, next) => {
    let data = req.body;
    if (req.user && req.user.id) {
      try {
        let resp = await db.country.destroy({ where: { id: data.id } });
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
  },
  deleteCity: async (req, res, next) => {
    let data = req.body;
    if (req.user && req.user.id) {
      try {
        let resp = await db.city.destroy({ where: { id: data.id } });
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
  },
  deleteState: async (req, res, next) => {
    let data = req.body;
    if (req.user && req.user.id) {
      try {
        let resp = await db.state.destroy({ where: { id: data.id } });
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
  },
  async bulkUpdateCountryStatus(req, res, next) {
    if (req.user && req.user.id) {
      let data = req.body;
      try {
        data.forEach(async country => {
          await db.country.update({ status: country.status }, { where: { id: country.id } });
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
  getStateList(req, res, next) {
    let options = {
      attributes: { include: [[db.sequelize.col('country.shortname'), 'countryCode']] },
      include: [{
        model: db.country,
        attributes: [],
        as: 'country'
      }]
    };
    let params = req.params || {};
    if (req.query && req.query.country) {
      options.where = {
        [Op.or]: [
          { country_id: req.query.country },
          { '$country.shortname$': req.query.country }
        ]
      };
    }
    if (params.country) {
      options.where = {
        [Op.or]: [
          { country_id: params.country },
          { '$country.shortname$': params.country }
        ]
      };
    }
    db.state.findAll(options).then(response => {
      res.send(response)
    }).catch(err => {
      res.status(500).send({
        error_code: 105,
        status: false,
        error: `${err}`
      })
    })
  },

  searchCityList(req, res, next) {
    if (req.body.search && req.body.countryId) {
      let string = req.body.search;
      let countryId = req.body.countryId;
      db.sequelize.query(`SELECT c.id, c.city_name, c.state_id FROM cities c, states s, countries cn
            where c.state_id = s.id and s.country_id = cn.id and c.city_name like '%${string}%' and c.id = ${countryId}`).spread(data => {
        res.send(data)
      }).catch(err => {
        res.status(500).send({
          error_code: 105,
          status: false,
          error: err
        })
      })
    }
    else {
      res.sendStatus(406)
    }
  },

  async getCountry(req, res, next) {
    let queryWhere = {};
    if (req.body.name) {
      queryWhere.name = {
        [Op.like]: '%' + req.body.name + '%'
      }
    }
    if (req.body.shortname) {
      queryWhere.shortname = req.body.shortname
    }
    if (req.body.phonecode) {
      queryWhere.phonecode = req.body.phonecode
    }

    db.country.findAll({ where: queryWhere }).then(resp => {
      res.send(resp)
    }).catch(err => {
      res.status(400).send({
        status: false,
        errors: err
      })
    })
  },
  async getState(req, res, next) {
    let queryWhere = {};
    if (req.body.name) {
      queryWhere.name = {
        [Op.like]: '%' + req.body.name + '%'
      }
    }
    if (req.body.country_id) {
      queryWhere.country_id = req.body.country_id
    }

    db.state.findAll({ where: queryWhere }).then(resp => {
      res.send(resp)
    }).catch(err => {
      res.status(400).send({
        status: false,
        errors: err
      })
    })
  },
  async getCity(req, res, next) {
    let queryWhere = {};
    if (req.body.name) {
      queryWhere.name = {
        [Op.like]: '%' + req.body.name + '%'
      }
    }
    if (req.body.state_id) {
      queryWhere = {
        ...queryWhere,
        [Op.or]: [
          { state_id: req.body.state_id },
          { '$state.short_name$': req.body.state_id },
        ]
      }
    }

    db.city.findAll({
      where: queryWhere,
      attributes: { include: [[db.sequelize.col('state.short_name'), 'stateCode']] },
      include: [{
        model: db.state,
        attributes: [],
        as: 'state'
      }]
    }).then(resp => {
      res.send(resp)
    }).catch(err => {
      res.status(400).send({
        status: false,
        errors: err
      })
    })
  },

  async InsuranceProviders(req, res, next) {
    try {
      let where = {}
      if (req.query && req.query.country_id) {
        where['country_id'] = req.query.country_id;
      }
      console.log(where)
      let providers = await db.insurence_provider.findAll({ where: where });
      res.send(providers)
    } catch (error) {
      res.status(500).send({
        error_code: 105,
        status: false,
        error: error
      })
    }
  },
  async InsuranceBenifits(req, res, next) {
    try {
      let benifits = await db.insurence_benifit.findAll();
      res.send(benifits)
    } catch (error) {
      res.status(500).send({
        error_code: 105,
        status: false,
        error: error
      })
    }
  },
  async uploadDocs(req, res, next) {
    if (req.user && req.user.id) {
      upload(req, 'documents', 'file').then(async (resp) => {
        addActivityLog({ user_id: req.user.id, type: 'Documents Shared', details: `${req.user.email} shared new documents` });
        res.send({
          status: true,
          path: resp.path
        })
      })
        .catch(err => {
          res.status(404).json({
            error: true,
            status: false,
            errors: `${err}`
          })
        })
    } else {
      res.status(406).json({
        error: true,
        status: false,
      })
    }
  },
  async uploadImage(req, res, next) {
    if (req.user && req.user.id) {
      upload(req, 'image', 'file').then(async (resp) => {
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
    } else {
      res.status(406).json({
        error: true,
        status: false,
      })
    }
  },
  async getCouncelingId(req, res, next) {
    if (req.body.patient_id && req.body.provider_id) {
      let ch = Date.now();
      let channel = ch.toString(16);
      db.councelling.findOrCreate({
        channel, ...req.body
      }).then(resp => {
        res.send(resp)
      }).catch(err => {
        res.status(400).send({
          status: false,
          error: `${err}`
        })
      })
    } else {
      res.status(500).send({
        status: false,
        error: 'patient or provider'
      })
    }
  },

  /** Couselling Billing */
  async addCounsellingBilling(req, res, next) {
    let data = req.body;
    try {
      let resp = await db.billing.upsert(data);
      res.send({
        status: true,
        data: resp
      });
      addActivityLog({ user_id: req.user.id, type: 'Any Bill Paid', details: `${req.user.email} created new billing` });
    } catch (error) {
      res.status(400).send({
        status: false,
        errors: error
      })
    }
  },
  async removeCounsellingBilling(req, res, next) {
    if (req.body.id) {
      try {
        let resp = await db.billing.destroy({ where: { id: req.body.id } });
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
  },
  async getCounsellingBilling(req, res, next) {
    if (req.body.cid) {
      try {
        let resp = await db.billing.findAll({ where: { cid: req.body.cid } });
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
  },

  /** Couselling Documents */
  async addCounsellingDocument(req, res, next) {
    let data = req.body;
    try {
      let resp = await db.counselling_document.upsert(data);
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
  async removeCounsellingDocument(req, res, next) {
    if (req.body.id) {
      try {
        let resp = await db.counselling_document.destroy({ where: { id: req.body.id } });
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
  },
  async getCounsellingDocument(req, res, next) {
    if (req.body.cid) {
      try {
        let resp = await db.counselling_document.findAll({ where: { cid: req.body.cid } });
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
  },

  /** Departments */
  async addDepartment(req, res, next) {
    let data = req.body;
    try {
      let resp = await db.department.upsert(data);
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
  async bulkUpdateDepartment(req, res, next) {
    let data = req.body;
    try {
      data.forEach(async department => {
        await db.department.upsert(department, { where: { id: department.id } });
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
  },
  async downloadCSVDepartment(req, res, next) {
    var query = req.query;
    var attributes = [];
    if (query.includes) {
      attributes = query.includes.split(',');
    }
    db.department.findAll({
      where: {}, include: ['user_service']
    }).then(resp => {
      var department_list = JSON.parse(JSON.stringify(resp));
      res.setHeader('Content-disposition', 'attachment; filename=department_list_csv.csv');
      res.setHeader('Content-type', 'text/csv');
      res.charset = 'UTF-8';

      var csv = 'id,title,title_es,details,details_es,symbol,status\n';
      if (attributes && attributes.length > 0) {
        csv = attributes.map(item => capitalize(item)).join(',') + '\n';
      }
      for (var i = 0; i < department_list.length; i++) {
        var department = department_list[i];
        department.no_of_user = (department.user_service || []).length;
        if (attributes && attributes.length > 0) {
          csv += attributes.map(includeColumn => department[includeColumn] || '').join(',') + '\n';
        } else {
          csv += `${department.id},${department.title},${department.details},${department.details_es},${department.symbol},${department.status}\n`
        }
      }

      res.write(csv);
      res.end();
    }).catch(err => {
      res.status(400).send({
        status: false,
        errors: `${err}`
      })
    })
  },
  async bulkAddDepartment(req, res) {
    try {

      if (req.file == null) {
        res.status(400).send({
          status: false,
          errors: `require file`
        })
      }

      var excel_path = req.file.path;

      if (!excel_path.endsWith('xlsx') && !excel_path.endsWith('csv')) {
        return res.status(400).send({
          status: false,
          errors: `Unsupported file format, must xlsx, csv file`
        })
      }
      var obj = xlsx.parse(excel_path); // parses a file

      if (obj.length == 0) {
        return res.status(400).send({
          status: false,
          errors: `Cannot parse xlsx`
        })
      }

      var sheetDataList = obj[0].data;
      var count = 0;

      for (var i = 0; i < sheetDataList.length; i++) {
        var row = sheetDataList[i];

        try {
          var department = {
            title: row[0],
            title_es: row[1],
            details: row[2],
            details_es: row[3],
          }
          await db.department.create(department);
          count++;
          console.log('count', count)
        } catch (e) {
          console.log(e)
        }
      }
      try { fs.unlinkSync(excel_path); } catch (e) { }

      res.status(200).send({
        status: true,
        count: count
      })

    } catch (error) {
      res.status(400).send({
        status: false,
        errors: `${error}`
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
    if (req.query.role_id) {
      where.role_id = req.query.role_id;
    }
    var include = ['specialities']
    if (req.query.id) {
      where.id = req.query.id;
      include.push({
        model: db.user_service,
        as: 'user_service',
        include: ['user'],
        // exclude: ['department', 'speciality']
      })
    }

    try {
      let resp = await db.department.findAll({
        where: where, include: include
      });
      res.send(resp)
    } catch (error) {
      res.status(400).send({
        status: false,
        errors: error
      })
    }
  },

  /** Specialities */
  async addSpeciality(req, res, next) {
    let data = req.body;
    if (data.role_id && (+data.role_id) == 4) {
      data['category'] = 'Medical';
    } else {
      data['category'] = 'NonMedical';
    }
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
      let resp = await db.speciality.destroy({ where: { id: data.id } });
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
  async bulkUpdateSpeciality(req, res, next) {
    let data = req.body;
    try {
      data.forEach(async speciality => {
        await db.speciality.upsert(speciality, { where: { id: speciality.id } });
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
  },
  async downloadCSVSpeciality(req, res, next) {
    var query = req.query;
    var attributes = [];
    if (query.includes) {
      attributes = query.includes.split(',');
    }
    db.speciality.findAll({
      where: {}, include: ['department', 'user_service']
    }).then(resp => {
      var department_list = JSON.parse(JSON.stringify(resp));
      res.setHeader('Content-disposition', 'attachment; filename=sepcialities_list_csv.csv');
      res.setHeader('Content-type', 'text/csv');
      res.charset = 'UTF-8';

      var csv = 'id,title,title_es,department,status\n';
      if (attributes && attributes.length > 0) {
        csv = attributes.map(item => capitalize(item)).join(',') + '\n';
      }
      for (var i = 0; i < department_list.length; i++) {
        var speciality = department_list[i];
        speciality.no_of_user = (speciality.user_service || []).length;
        if (speciality.department) {
          speciality.department = speciality.department.title
        } else speciality.department || {}

        if (attributes && attributes.length > 0) {
          csv += attributes.map(includeColumn => speciality[includeColumn] || '').join(',') + '\n';
        } else {
          csv += `${speciality.id},${speciality.title},${speciality.title_es},${speciality.department.title},${speciality.status}\n`
        }
      }

      res.write(csv);
      res.end();
    }).catch(err => {
      res.status(400).send({
        status: false,
        errors: `${err}`
      })
    })
  },
  async bulkAddSpeciality(req, res) {
    try {

      if (req.file == null) {
        res.status(400).send({
          status: false,
          errors: `require file`
        })
      }

      var excel_path = req.file.path;

      if (!excel_path.endsWith('xlsx') && !excel_path.endsWith('csv')) {
        return res.status(400).send({
          status: false,
          errors: `Unsupported file format, must xlsx, csv file`
        })
      }
      var obj = xlsx.parse(excel_path); // parses a file

      if (obj.length == 0) {
        return res.status(400).send({
          status: false,
          errors: `Cannot parse xlsx`
        })
      }

      var sheetDataList = obj[0].data;
      var count = 0;

      for (var i = 0; i < sheetDataList.length; i++) {
        var row = sheetDataList[i];

        try {
          var speciality = {
            title: row[0],
            title_es: row[1],
            department_id: row[2]
          }
          await db.speciality.create(speciality);
          count++;
        } catch (e) {
          console.log(e)
        }
      }
      try { fs.unlinkSync(excel_path); } catch (e) { }

      res.status(200).send({
        status: true,
        count: count
      })

    } catch (error) {
      res.status(400).send({
        status: false,
        errors: `${error}`
      })
    }
  },
  async getSpecialities(req, res, next) {
    let where = {};
    let search = "";
    let page = 1;
    let pageSize = 25;
    let orderKey = "id";
    let order = "asc";

    if (req.body) {
      let data = req.body;
      search = data.title || "";
      orderKey = data.orderKey || "id";
      order = data.order || "asc";
      page = data.page || 1;
      pageSize = data.pageSize || 25;
    }

    if (req.query.title) {
      where.title = {
        [Op.like]: '%' + req.query.title + '%'
      }
    }

    if (search.length) {
      where = {
        ...where,
        [Op.or]: [
          { 'title': { [Op.like]: `%${search}%` } },
          { 'title_es': { [Op.like]: `%${search}%` } },
          { '$department.title$': { [Op.like]: `%${search}%` } },
          { '$department.title_es$': { [Op.like]: `%${search}%` } },
        ]
      }
    }

    if (req.query.department_id) {
      where.department_id = req.query.department_id;
    }
    if (req.query.status) {
      where.status = req.query.status;
    }
    if (req.body.role_id) {
      where.role_id = req.body.role_id;
    }

    var include = [{ model: db.department, required: true, as: 'department' }]
    if (req.query.id) {
      where.id = req.query.id;
      include.push({
        model: db.user_service,
        as: 'user_service',
        include: ['user']
      })
    } else {
      include.push({
        model: db.user_service,
        as: 'user_service'
      })
    }

    try {
      console.log(where)
      let resp = await db.speciality.findAndCountAll({
        where: where, include: include,
        order: [[orderKey, order]],
        distinct: true,
        limit: getLimitOffset(page, pageSize)
      });
      response(res, resp);
    } catch (error) {
      console.log(error)
      res.status(400).send({
        status: false,
        errors: error
      })
    }
  },

  /** Counselling Types */
  async getCounsellingTypes(req, res, next) {
    let where = {};
    if (req.body.title) {
      where.title = {
        [Op.like]: '%' + req.body.title + '%'
      }
    }
    if (req.body.status) {
      where.status = req.body.status;
    }

    try {
      let resp = await db.counselling_type.findAll({ where: where });
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
        data: resp
      })
    } catch (error) {
      res.status(400).send({
        status: false,
        errors: error
      })
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
        data: resp
      })
    } catch (error) {
      res.status(400).send({
        status: false,
        errors: error
      })
    }
  },
  getServicePrice: async (req, res, next) => {
    db.pricing.findOne({ where: { speciality_id: req.body.speciality_id, counselling_type: req.body.counselling_type } })
      .then(resp => {
        res.send(resp)
      }).catch(err => {
        res.send({
          status: false,
          errors: `${err}`
        })
      })
  },
  getAllProviders(req, res, next) {
    db.user.findAll({
      where: { status: { [Op.ne]: 0 } },
      include: ['education',
        {
          model: db.user_role,
          as: 'user_role',
          where: {
            role_id: { [Op.in]: [1, 5, 3] }
          }
        }
      ]
    }).then(resp => res.send(resp))
      .catch(err => res.status(400).send({ status: false, errors: `${err}` }))
  },

  async addAllergy(req, res, next) {
    let data = req.body;
    try {
      let resp = await db.allergy.upsert(data);
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
  async addSurgery(req, res, next) {
    let data = req.body;
    try {
      let resp = await db.surgery.upsert(data);
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
  async addMedicalCondition(req, res, next) {
    let data = req.body;
    try {
      let resp = await db.medical_condition.upsert(data);
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
  getAllergies(req, res, next) {
    db.allergy.findAll().then(response => {
      res.send(response)
    }).catch(err => {
      res.status(500).send({
        error_code: 105,
        status: false,
        error: `${err}`
      })
    })
  },
  getSurgeries(req, res, next) {
    db.surgery.findAll().then(response => {
      res.send(response)
    }).catch(err => {
      res.status(500).send({
        error_code: 105,
        status: false,
        error: `${err}`
      })
    })
  },
  getMedicalConditions(req, res, next) {
    db.medical_condition.findAll().then(response => {
      res.send(response)
    }).catch(err => {
      res.status(500).send({
        error_code: 105,
        status: false,
        error: `${err}`
      })
    })
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

  async getStaticPage(req, res) {
    let lang = req.lang || "en"
    db.static_page_detail.findOne({ where: { code: req.params.code, language: lang } }).then(resp => {
      res.send(resp)
    }).catch(err => {
      res.send({
        errors: `${err}`
      })
    })
  },
  async getDropdowns(req, res) {
    let lang = req.lang || "en";
    let where = {};
    if (req.params && req.params.types) {
      let dropdowns = req.params.types.split(',');
      where['section'] = { [Op.in]: dropdowns }
    }
    if (req.query && req.query.types) {
      let dropdowns = req.query.types.split(',');
      where['section'] = { [Op.in]: dropdowns }
    }
    db.translation.findAll({
      where: where,
      attributes: ['id', 'keyword', 'section'],
      // group: "type"
    }).then(resp => {
      let data = {}
      resp.map(r => {
        let key = r.section.toLowerCase();
        data[key] = data[key] || [];
        data[key].push({ id: r.id, keyword: r['keyword'] })
      })
      res.send(data)
    }).catch(err => {
      res.send({
        errors: `${err}`
      })
    })
  },
  async getEmailConversation(req, res, next) {
    let where = {};
    if (req.query.email) {
      where = {
        [Op.or]:
          [{ from: { [Op.eq]: req.query.email } },
          { to: { [Op.eq]: req.query.email } }]
      }
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
  async send_Email(req, res) {
    var r = await db.email_conversation.upsert(req.body);
    res.send(r);
    sendEmail(req.body.to, req.body.subject, {
      html: req.body.message
    })
  },
  async testJobs(req, res) {
    try {
      // calendarEmptyReminder();
      // pendingStaffSignupReminder();
      // happyBirthday();
      // incorporationGreeting();
      // insuranceReminder();
      // emailer();
      // bookingReminder();
      var data = req.body;
      if (data == null || data.length == 0) return res.send({ success: 'empty' });
      var total = 0;
      var error = '';
      data.forEach(command => {
        if (typeof jobController[command] == 'function') {
          try {
            jobController[command]();
            total++;
          } catch (e) {
            error += e;
          }
        }
      });

      res.send({ success: true, total: total, error: error });
    } catch (e) {
      res.send({ error: e });
    }
  }
}