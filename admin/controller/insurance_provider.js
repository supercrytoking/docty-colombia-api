const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse, responseObject } = require('../../commons/response');


async function getPatientListOfInsuranceProvider(req, res, next) {
  if (req.user && req.user.id) {
    var insurance_id = req.body.insurance_id;
    let cond = {
      where: {
        status: { [Op.gt]: 0 },
      },
      // attributes: ['id', 'fullName', 'picture'],
      include: [
        {
          model: db.user_insurance,
          as: 'insurance',
          // include: [{ model: db.insurence_provider, as: 'insurance_provider', attributes: ['id', 'name', 'status'], where: {  /* id: insurance_id, status: true */ } }],
          where: {
            company: insurance_id
          },
          required: true
        }
      ]
    }
    if (req.query && req.query.limit) {
      cond['limit'] = req.query.limit
    }
    db.user.findAll(cond).then(resp => {
      return response(res, resp);
    }).catch(err => {
      console.log(err)
      return errorResponse(res, err);
    })
  }
}


async function getClinicListOfInsuranceProvider(req, res, next) {
  if (req.user && req.user.id) {
    var insurance_id = req.body.insurance_id;
    let cond = {
      where: {
        status: { [Op.gt]: 0 },
      },
      // attributes: ['id', 'fullName', 'picture'],
      include: [
        {
          model: db.associate,
          required: true,
          as: 'associatedTo',
          include: [
            {
              model: db.user, as: 'user',
              attributes: ['id', 'company_name', 'picture'],
              required: true,
              include: [
                {
                  model: db.insurance_associate,
                  as: 'insurance_associates',
                  // include: [{ model: db.insurence_provider, as: 'provider', attributes: ['id', 'name', 'status'], }],
                  where: { provider_id: insurance_id, }
                }]
            }
          ]
        }
      ]
    }
    if (req.query && req.query.limit) {
      cond['limit'] = req.query.limit
    }
    db.user.findAll(cond).then(resp => {
      return response(res, resp);
    }).catch(err => {
      console.log(err)
      return errorResponse(res, err);
    })
  }
}


async function getClaimsBookingListOfInsuranceProvider(req, res, next) {
  if (req.user && req.user.id) {
    var insurance_id = req.body.insurance_id;
    let cond = {
      where: {
        // status: { [Op.in]: [5] },
        // payment_status: 1,
      },
      include: [
        {
          model: db.schedule,
          as: 'schedule',
          attributes: ['start', 'end', 'id'],
          // where: {
          //   end: { [Op.gte]: (new Date()) },
          // }
        },
        {
          model: db.user,
          as: 'providerInfo',
          attributes: ['id', 'fullName', 'picture', 'first_name', 'middle_name', 'last_name'],
          required: true,
          include: [
            {
              model: db.associate,
              required: true,
              as: 'associatedTo',
              include: [
                {
                  model: db.user, as: 'user',
                  attributes: ['id', 'company_name', 'picture'],
                  required: true,
                  include: [
                    {
                      model: db.insurance_associate,
                      as: 'insurance_associates',
                      required: true,
                      // include: [{ model: db.insurence_provider, as: 'provider', attributes: ['id', 'name', 'status'], }],
                      where: { provider_id: insurance_id, }
                    }]
                }
              ]
            }
          ]
        },
        {
          model: db.userFamilyView,
          as: 'patientInfo',
          attributes: ['id', 'fullName', 'picture', 'first_name', 'middle_name', 'last_name'],
          include: [
            {
              model: db.user_insurance,
              as: 'insurance',
              // include: [{ model: db.insurence_provider, as: 'insurance_provider', attributes: ['id', 'name', 'status'], where: {  /* id: insurance_id, status: true */ } }],
              where: {
                company: insurance_id
              }
            }
          ]
        },
        'family_member',
        // {
        //   model: db.booking_update_request,
        //   as: 'booking_update_request',
        //   include: [
        //     {
        //       model: db.booking_update_schedule,
        //       as: 'slots',
        //       include: ['schedule']
        //     },
        //   ]
        // }
      ]
    }
    if (req.query && req.query.limit) {
      cond['limit'] = req.query.limit
    }
    db.booking.findAll(cond).then(resp => {
      return response(res, resp);
    }).catch(err => {
      console.log(err)
      return errorResponse(res, err);
    })
  }
}

module.exports = {
  getPatientListOfInsuranceProvider, getClinicListOfInsuranceProvider, getClaimsBookingListOfInsuranceProvider
}
