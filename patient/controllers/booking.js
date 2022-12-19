/* eslint-disable eqeqeq */
/* eslint-disable no-unused-vars */
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');
const config = require(__dirname + '/../../config/config.json');

const Openpay = require('../../opnepay/openpay');
const { smsTrigger } = require('../../commons/smsCrmTrigger');
const { crmTrigger, otpTrigger, monitorNotificationTrigger } = require('../../commons/crmTrigger');
const { councelling_link, scheduleTimeFormat, councelling_type, getAge, generateToken, getClinicOfUser } = require('../../commons/helper');
const isProduction = config.openpay.prodMode;
const openpay = new Openpay(config.openpay.merchantId, config.openpay.privateKey, isProduction);

const btoa = require('btoa');
const { createInvoicePDF } = require('../../commons/pdfUtil');
var { serverMessage } = require('../../commons/serverMessage');

async function sendPaymentNotification(booking, schedule, lang, invoice_pdf) {
  var provider = booking.providerInfo;
  var patient = booking.patientInfo;
  patient = JSON.parse(JSON.stringify(patient));
  if (booking.family_member) {
    booking.family_member = JSON.parse(JSON.stringify(booking.family_member));
    booking.family_member.fullName = `${booking.family_member.first_name || ''} ${booking.family_member.middle_name || ''} ${booking.family_member.last_name || ''}`;
  }
  try {
    if (booking.analysis) {
      if (typeof booking.analysis.tirage === 'string') booking.analysis.tirage = JSON.parse(booking.analysis.tirage);
      booking.description = booking.analysis.tirage.triage_level;
    }
  } catch (e) {
    console.log(e);
  }
  var time = scheduleTimeFormat(schedule, provider.timezone_offset);
  var family = '';
  var family_user;
  if (booking.family_member) {
    family_user = booking.family_member;
    family = `${booking.family_member.first_name || ''} ${booking.family_member.middle_name || ''} ${booking.family_member.last_name || ''}`;
  }
  var trigger = 'New_Video_Consultation_Request';
  switch (booking.councelling_type) {
    case 'video_call': trigger = 'New_Video_Consultation_Request'; break;
    case 'home_care': trigger = 'New_HomeCare_Consultation_Request'; break;
    case 'visit': trigger = 'New_Retail_Consultation_Request'; break;
  }

  var hash = await generateToken({ name: provider.first_name, group: 'client', role: 1 });
  await db.token.create({ userId: provider.id, token: hash, expired_at: null, login_as: 0, is_for_link: true });
  var returnUrl = `/waiting-room`;

  var link = `${config.domains.doctor}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrl)}`;
  if (booking.councelling_type == 'home_care')
    link = `${config.domains.nurse}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrl)}`;

  otpTrigger(trigger, {
    email: provider.email, subject: 'Docty Health Care: Consultation Request',
    requested_by: `${patient.fullName}`,
    requested_for: `${family}`,
    provider_name: provider.fullName,
    provider_photo: provider.picture,
    consultation_type: councelling_type(booking.councelling_type),
    consultation_time: time,
    consultation_status: 'Awaiting',
    link: link,
    invoice_pdf_link: invoice_pdf,
    patient_age: getAge(family_user ? family_user.dob : patient.dob),
    patient_name: family_user ? family : patient.fullName,
    patient_photo: family_user ? family_user.image : patient.picture,
    patient_gender: (family_user ? family_user.gender : patient.gender) || '',
    patient_remarks: booking.description
  }, lang);

  monitorNotificationTrigger(trigger, { booking_id: booking.id, by: patient, with: provider, patient_name: patient.fullName, provider_name: provider.fullName });

  if (booking.councelling_type == 'home_care') {
    var booking_support = await db.booking_support.findOne({ where: { booking_id: booking.id }, include: 'support_with' });
    if (booking_support && booking_support.support_with) {
      var support_doctor = booking_support.support_with;
      let timeS = scheduleTimeFormat(schedule, support_doctor.timezone_offset);
      otpTrigger('New_HomeCare_Support_Request', {
        email: support_doctor.email,
        requested_by: `${patient.fullName}`,
        requested_for: `${family}`,
        provider_name: support_doctor.fullName,
        provider_photo: support_doctor.picture,
        consultation_type: councelling_type(booking.councelling_type),
        consultation_time: timeS,
        consultation_status: 'Awaiting',
        link: `${config.domains.doctor}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrl)}`,
        invoice_pdf_link: invoice_pdf,
        patient_age: getAge(patient.dob),
        patient_name: patient.fullName,
        patient_photo: patient.picture,
        patient_gender: patient.gender || '',
        patient_remarks: booking.description
      }, lang);
    }
  }


  var hash = await generateToken({ name: patient.first_name, group: 'client', role: 2 });
  await db.token.create({ userId: patient.id, token: hash, expired_at: null, login_as: 0, is_for_link: true });
  var returnUrl = `/my-consultation/${btoa(booking.id).replace(/=/g, '')}`;

  let timeP = scheduleTimeFormat(schedule, patient.timezone_offset);
  let cl = await db.associate.findOne({ where: { associate: booking.provider_id } });
  let clinic_id = null;
  if (!!cl && !!cl.user_id) {
    clinic_id = cl.user_id || null
  }
  var triggerData = {
    email: patient.email, subject: 'Docty Health Care: Consultation Request',
    clinic_id: clinic_id,
    consultation_id: booking.reference_id,
    requested_by: `${patient.fullName}`,
    requested_for: `${family}`,
    provider_name: provider.fullName,
    company_name: provider.fullName,
    patient_name: patient.fullName,
    your_name: patient.fullName,
    patient_photo: patient.picture,
    provider_photo: provider.picture,
    type: councelling_type(booking.councelling_type),
    consultation_time: timeP,
    time: timeP,
    consultation_status: 'Awaiting',
    link: `${config.domains.patient}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrl)}`,
    invoice_pdf_link: invoice_pdf,
    patient_age: getAge(patient.dob),
    patient_gender: patient.gender || '',
    patient_remarks: booking.description
  };

  trigger = 'Video_Consultation_Requested';
  switch (booking.councelling_type) {
    case 'video_call': trigger = 'Video_Consultation_Requested'; break;
    case 'home_care': trigger = 'HomeCare_Consultation_Requested'; break;
    case 'visit': trigger = 'Retail_Consultation_Requested'; break;
  }

  var user_event = await db.user_event.findOrCreate({ where: { user_id: patient.id, booking_id: booking.id } });
  user_event[0].update({
    user_id: patient.id,
    title: `Video call requested with Dr. ${provider.fullName}`,
    calendarId: 2,
    start: new Date(schedule.start),
    end: new Date(schedule.end),
    category: "time",
    isAllDay: false,
    isReadOnly: false,
    state: 'Pending',
    booking_id: booking.id,
    data: { type: 'booking' }
  });

  if (booking.family_member) {
    crmTrigger(`${trigger}_For_Family`, triggerData, lang); // send to primary user(patient)
    triggerData.email = booking.family_member.email;
    crmTrigger(`${trigger}_By_Primary`, triggerData, lang); // send to family user
  } else {
    crmTrigger(trigger, triggerData, lang);
  }

  smsTrigger('New_Counselling_To_Doctor', {
    doctor_name: booking.providerInfo.first_name,
    request_number: booking.reference_id,
    patient_name: booking.patientInfo.first_name,
    link: config.domains.doctor,
    time: timeP,
    to: booking.providerInfo.isd_code + booking.providerInfo.phone_number
  }, lang, 0);
  return Promise.resolve(0);
}

async function calculateCoDoctorPrice(jsonDetails, booking, amount, discount, insurance_cover, total) {

  try {
    if (booking.booking_support && booking.booking_support.support_with && booking.speciality_id) {
      var co_doctor = JSON.parse(JSON.stringify(booking.booking_support.support_with));

      co_doctor.match_service = await db.user_service.findOne({ where: { user_id: co_doctor.id, speciality_id: booking.speciality_id } });

      if (co_doctor.match_service) {

        var patient_user_insurance = await db.user_insurance.findOne({
          where: {
            user_id: booking.patient_id, member_id: (booking.family_member_id || 0),
            start_date: { [Op.or]: [{ [Op.lte]: new Date() }, { [Op.eq]: null }] },
            end_date: { [Op.or]: [{ [Op.gte]: new Date() }, { [Op.eq]: null }] },
          },
        });

        co_doctor.services = [co_doctor.match_service];
        await getClinicOfUser(co_doctor, patient_user_insurance ? patient_user_insurance.company : null);

        co_doctor.match_service.pay_price = co_doctor.match_service.price - (co_doctor.match_service.insured_cover || 0);
        co_doctor.match_service.pay_price = Math.max(0, co_doctor.match_service.pay_price);

        jsonDetails.co_doctor_ammount = (co_doctor.match_service.price || 0);
        jsonDetails.co_doctor_insured_cover = (co_doctor.match_service.insured_cover || 0);
        jsonDetails.net_payable = amount + (jsonDetails.co_doctor_ammount || 0);
      }
      var jsonDetails = {
        provider_amount: amount + discount,
        provider_insured_cover: insurance_cover,
        coupon: discount, net_payable: amount,
        total: total
      };
    }
  } catch (e) { console.log(e); }
}

async function generateInvoice(booking, amount, discount, insurance_cover, total, req, payment_mod = 'By Card') {
  try {
    var jsonDetails = {
      provider_amount: total,
      provider_insured_cover: insurance_cover,
      coupon: discount,
      net_payable: amount,
      total: total
    };
    var from2_id = null;

    if (booking.booking_support && booking.speciality_id) {
      from2_id = booking.booking_support.provider_id;
    }
    let invoice_id = booking.reference_id;
    let set = null
    // await calculateCoDoctorPrice(jsonDetails, booking, discount, amount, insurance_cover, total);
    let inSql = `SELECT um.json_data,um.id FROM associates a,usermeta um 
    WHERE a.user_id = um.user_id AND um.key = "invoiceSettings" AND a.associate = ${booking.provider_id}`
    let inSet = await db.sequelize.query(inSql).spread((r, m) => r);
    let json_data = null;
    if (!!inSet && !!inSet.length) {
      set = inSet[0];
      if (!!set && !!set.json_data) {
        json_data = set.json_data;
      }
      if (typeof json_data == 'string') json_data = JSON.parse(json_data);
      if (!!!json_data.lastInvoice) {
        json_data.lastInvoice = parseInt(json_data.startFrom)
      } else {
        json_data.lastInvoice++
      }
      invoice_id = `${json_data.suffix}${json_data.lastInvoice}`
    }
    let data = {
      "invoice_id": invoice_id,
      reference_id: booking.reference_id,
      "from_id": booking.providerInfo.id,
      "from2_id": from2_id,
      booking: booking,
      "booking_id": booking.id,
      "payment_mod": payment_mod,
      "currency": "Dollar",
      "amount": amount,// this is no used
      "status": "Paid",
      "details": jsonDetails,
      "discount": discount,// this is no used
      "insurance_cover": insurance_cover,// this is no used
      "pdf": "",
      "to_id": booking.patientInfo.id,
      createdAt: new Date()
    };
    try {
      var r = await createInvoicePDF(data, req);
      data.pdf = r.Location;
    } catch (e) { console.log(e); }

    await db.invoice.create(data).then(() => {
      if (!!set && !!json_data) {
        return db.userMeta.update({ json_data: json_data }, { where: { id: set.id } })
      }
      return;
    })

    return r.Location;
  } catch (error) {
    console.log(error);
    return '';
  }
}
module.exports = {
  getBookingDetails: async (req, res, next) => {
    if (req.user && req.user.id) {
      let attr = ['title', 'id'];
      if (req.lang == 'es') {
        attr = [['title_es', 'title'], 'id'];
      }
      db.booking.findOne({
        where: {
          id: req.params.id,
          [Op.or]: [
            { booked_by: req.user.id },
            { patient_id: req.user.id },
            { "$permitedBy.permitted_to$": req.user.id }
          ]
        },
        attributes: {
          include: [
            [Sequelize.col('booking_update_request.reason'), 'reason']
          ]
        },
        include: [
          {
            model: db.user,
            attributes: ['first_name', 'middle_name', 'last_name', 'fullName', 'last_name_2', 'tp', 'id_proof_type', 'national_id', 'signature'],
            as: 'providerInfo',
            include: ['services', 'address'],
            required: false,
          },
          'patientInfo',
          'analysis',
          'schedule',
          'booking_calls',
          'permitedBy',
          {
            model: db.booking_update_request,
            as: 'booking_update_request', attributes: []
          },
          {
            model: db.speciality,
            as: 'speciality',
            attributes: attr,
            required: false,
            include: [
              {
                model: db.department,
                as: 'department',
                attributes: attr,
                required: false,
              }
            ]
          }
        ]
      }).then(async resp => {
        let data = JSON.parse(JSON.stringify(resp));
        if (!!data) {
          let doc = await db.user_document.findOne({
            where: {
              user_id: req.user.id,
              title: 'CONSULTATION_NOTE',
              remark: { [Op.like]: `%${data.reference_id}%` }
            }
          });
          if (!!doc && !!doc.document_path) {
            data.hippaForm = doc.document_path.trim();
          }
        }
        return response(res, data);
      }).catch(err => {
        return errorResponse(res, err);
      });
    } else {
      res.sendStatus(403);
    }
  },

  async getPrice(book) {
    let user_id = book.provider_id;
    if (typeof book.extras == 'string') book.extras = JSON.parse(book.extras);
    let assoc = await db.associate.findOne({ where: { associate: user_id } });
    let patient_user_insurance = null;
    if (assoc) {
      let doctor = await db.user.findByPk(user_id, { attributes: ['id', 'expertise_level'] });
      if (!!book.extras && !!book.extras.insurance_provider_id) {
        let wh = {
          user_id: book.patient_id,
          company: book.extras.insurance_provider_id,
          [Op.or]: [
            { end_date: null },
            { end_date: { [Op.gte]: new Date() } },
          ],
          [Op.or]: [
            { user_id: book.patient_id },
            { '$members.member_id$': book.patient_id }
          ]
        }
        patient_user_insurance = await db.user_insurance.findAll({
          where: wh,
          include: ['members']
        }).then(r => r[0]).catch(e => null);
      }
      // let sql = '';
      let company = null;
      if (!!patient_user_insurance) {
        company = patient_user_insurance.company;
      }
      let queryResult = null;

      if (!!company && !!book.extras.insuranceServiceId) {
        queryResult = await db.company_service.findOne({
          where: {
            id: book.extras.insuranceServiceId,
            insurance_provider_id: company,
            user_id: assoc.user_id,
            expertise_level: doctor.expertise_level || 0,
          }
        })
      } else if (!!book.extras && !!book.extras.insuranceServiceId) {
        queryResult = await db.company_service.findOne({
          where: {
            id: book.extras.insuranceServiceId,
            // insurance_provider_id: company,
            user_id: assoc.user_id,
            expertise_level: doctor.expertise_level || 0,
          }
        })

      } else {
        if (book.speciality_id) {
          queryResult = await db.company_service.findOne({
            where: {
              '$user_speciality.speciality_id$': book.speciality_id,
              user_id: assoc.user_id,
              expertise_level: doctor.expertise_level || 0,
            },
            include: ['user_speciality']
          })
        }
      }

      if (!!queryResult && !!queryResult.total) {
        return {
          amount: queryResult.total || 0,
          total: queryResult.total || 0,
          copay: queryResult.copay || 0,
          insured_cover: queryResult.insured_cover || 0,
          provider: (patient_user_insurance &&
            patient_user_insurance.insurance_provider &&
            patient_user_insurance.insurance_provider.name ? patient_user_insurance.insurance_provider.name : '')
        };
      }
    }

    let user_service = await db.user_service.findOne({
      where: {
        user_id: user_id,
        speciality_id: book.speciality_id
      }
    });
    let ob = { amount: 0 };
    if (!!user_service) {
      ob = {
        amount: user_service.price || 0,
        total: user_service.price || 0,
        copay: user_service.price || 0,
        insured_cover: 0,
        provider: null
      };
    }
    return ob;

  },
  billingDetails: async (req, res, next) => {
    if (req.user && req.user.id) {
      const from = !!req.body.from ? req.body.from : 0;
      db.booking.findOne({
        where: {
          id: req.body.id,
          [Op.or]: [
            { patient_id: req.user.id },
            { booked_by: req.user.id },
          ]
        },
        attributes: ['id', 'amount', 'councelling_type', 'patient_id', 'reference_id', 'provider_id', 'speciality_id', 'extras'],
        include: ['booking_support']
      }).then(async resp => {

        let obj = {
          amount: res.amount,
        };
        if (!!!obj.amount) {
          obj = await module.exports.getPrice(resp);
          if (from == 5) {
            obj.amount = resp.amount;
          }
          await resp.update(obj);
        }
        let respons = JSON.parse(JSON.stringify(resp));
        respons = Object.assign(respons, obj);
        return response(res, respons);
      }).catch(err => {
        return errorResponse(res, err);
      });
    } else {
      res.sendStatus(403);
    }
  },
  updatePayment: async (req, res, next) => {
    let data = req.body;
    let amount = 0;
    let discount = 0;
    let insurance_cover = 0;
    let total = 0;
    data = JSON.parse(JSON.stringify(data));
    try {
      let booking = await db.booking.findOne({
        where: {
          reference_id: data.reference_id,
          [Op.or]: [
            { patient_id: req.user.id },
            { booked_by: req.user.id },
          ]
        },
        include: [{
          model: db.userFamilyView.scope(''),
          as: 'patientInfo'
        }, {
          model: db.user, as: 'providerInfo',
          attributes: ['fullName', 'first_name', 'middle_name', 'last_name', 'gender', 'id', 'email', 'phone_number', 'picture', 'timezone_offset'],
          include: ['user_role']
        }, 'booking_support', 'analysis']
      });

      if (!!!booking) {
        return res.send({
          status: false,
          message: serverMessage('SERVER_MESSAGE.SONTHING_WRONG', req.lang),
          data: booking
        });
      }

      if (booking && booking.payment_status == 'paid') {
        return res.send({
          status: false,
          message: 'SERVER_MESSAGE.ALREADY_PAID',
          data: booking
        });
      }
      obj = await module.exports.getPrice(booking);
      await booking.update(obj);
      // await booking.update({ payment_status: 'paid' });
      let schedule = await db.schedule.findOne({
        where: {
          id: booking.schedule_id, start: { [Op.gte]: new Date() }
        }
      });

      amount = parseFloat(booking.amount);
      total = JSON.parse(JSON.stringify(booking.amount));
      let sql = `SELECT MAX(cs.insured_cover) insured_cover,cs.copay,cs.total,cs.id 
      FROM company_services cs,associates a, user_insurances ui
      WHERE cs.user_id = a.user_id ${booking.extras && booking.extras.insuranceServiceId ? `AND cs.id = ${booking.extras.insuranceServiceId}` : ''}
      AND a.associate= ${booking.provider_id} 
      AND cs.type_code = "${booking.councelling_type}"
      AND ui.user_id = ${booking.patient_id}    
      AND cs.insurance_provider_id = ui.company
      GROUP BY cs.id
      ORDER BY insured_cover DESC
      LIMIT  1`;
      let cover = await db.sequelize.query(sql).spread((resp) => resp[0]);
      if (cover && cover.insured_cover) {
        insurance_cover = cover.insured_cover;
        total = parseInt(cover.total || 0);
        amount = amount - parseFloat(cover.insured_cover);
      }
      let offerId = null;
      if (!!data.promotion_code) {
        let coupon = await db.coupon_utilisation.findOne({
          where: {
            create_code: data.promotion_code, type: data.coupon_type,
            status: true,
            start: { [Op.lte]: new Date() },
            end: { [Op.gte]: new Date() },
          }
        });
        if (coupon) {
          if (coupon.discount_type == 1) {
            discount = (parseFloat(amount) * parseInt(coupon.price) / 100);
            amount = amount - (parseFloat(amount) * parseInt(coupon.price) / 100);
          } else {
            discount = parseInt(coupon.price);
            amount = amount - parseInt(coupon.price);
          }
          // booking['discount'] = await discount;
          offerId = coupon.id;
          amount = amount > 0 ? amount : 0;
        }
      }
      if ((schedule && schedule.calendarId == 4) || schedule.id == booking.schedule_id) {
        let title = req.user.fullname;
        if (booking.patientInfo) {
          title = booking.patientInfo.first_name;
        }
        await schedule.update({ calendarId: 3, isReadOnly: true, title: title, state: 'Busy' }).then(() => {

          if (amount < 1) {
            return booking.update({ payment_status: 'paid', amount: amount, offer_id: offerId }).then(async () => {
              var invoice_pdf = await generateInvoice(booking, amount, discount, insurance_cover, total, req, `Copay : ${data.promotion_code}`);
              await sendPaymentNotification(booking, schedule, req.lang, invoice_pdf);
              res.send({
                status: true,
                message: 'SERVER_MESSAGE.PAYMENT_SUCCESS_SLOT_CONFIMED',
                data: booking,
                amount, insurance_cover, discount
              });
            });
          }

          const newCharge = {
            "method": "card",
            currency: 'COP',
            iva: 0,
            source_id: data.token,
            'customer': {
              'name': booking.patientInfo.first_name || 'Standerd User',
              'last_name': booking.patientInfo.last_name || 'Standerd User',
              'phone_number': booking.patientInfo.phone_number ? '' + booking.patientInfo.isd_code + booking.patientInfo.phone_number : '99999999999',
              'email': booking.patientInfo.email || 'noreplay@docty.ai'
            },
            device_session_id: Date.now().toString(16),
            "amount": amount,
            "description": `Booking - ${booking.reference_id} Patient- ${booking.patientInfo.fullName} Doctor- ${booking.providerInfo.fullName}`,
            "order_id": Date.now().toString(16)
          };
          return openpay.charges.create(newCharge, async (error, body) => {
            if (error) {
              await schedule.update({ calendarId: 4, isReadOnly: true, title: 'Available' });
              await booking.update({ payment_status: 'failed' });
              let errors = {
                description: 'Your card was declined',
              };
              if (req.lang == 'es') {
                errors =
                {
                  description: 'tu tarjeta fue declinada',
                };
              }
              errors.error = error;
              return res.status(406).send(errors);
            } else {
              await booking.update({ payment_status: 'paid', amount: amount }).then(async () => {
                var invoice_pdf = await generateInvoice(booking, amount, discount, insurance_cover, total, req, 'By Card');
                await sendPaymentNotification(booking, schedule, req.lang, invoice_pdf);
                return res.send({
                  status: true,
                  message: 'SERVER_MESSAGE.PAYMENT_SUCCESS_SLOT_CONFIMED',
                  data: booking,
                  amount, insurance_cover, discount
                });
              });
            }
          });
        });
      } else {
        await booking.update({ status: 'slotBusy' }).then(() => {
          res.send({
            status: false,
            message: 'SERVER_MESSAGE.PAYMENT_FAILED_SLOT_BUSY',
            data: schedule
          });
        });
      }
    } catch (error) {
      return errorResponse(res, error);
    }
  },
  insuranceReleafe: async (req, res, next) => {
    if (req.user && req.user.id) {
      // let where = {
      //   type_code: req.body.type_code,
      //   insurance_provider_id: req.body.insurance_provider_id,
      //   // '$company.associate.id$': 1
      // }

      let data = req.body;
      var patient_user_insurance = await db.user_insurance.findOne({
        where: {
          company: data.insurance_provider_id,
          user_id: req.user.id,
          start_date: { [Op.or]: [{ [Op.lte]: new Date() }, { [Op.eq]: null }] },
          end_date: { [Op.or]: [{ [Op.gte]: new Date() }, { [Op.eq]: null }] },
        },
      });
      if (patient_user_insurance == null) {
        return response(res, 0);
      }

      let sql = `SELECT MAX(cs.insured_cover) insured_cover,cs.copay,cs.total,cs.id FROM company_services cs,associates a
      WHERE cs.user_id = a.user_id AND a.associate= ${data.provider_id} AND  cs.type_code = "${data.type_code}" AND cs.insurance_provider_id = "${data.insurance_provider_id}"`;
      if (data.speciality_id) {
        var provider = await db.user.findByPk(data.provider_id);
        sql = `SELECT cs.id,MAX(cs.copay) price, insured_cover,cs.copay,cs.total,cs.id FROM company_services cs,user_specialities us,associates a WHERE cs.status=1 AND cs.expertise_level=${provider.expertise_level || 0} AND cs.user_id = a.user_id AND a.associate=${data.provider_id} AND cs.user_speciality_id=us.id AND us.speciality_id=${data.speciality_id} AND cs.type_code="${data.type_code}"`;
        sql += ` AND cs.insurance_provider_id="${data.insurance_provider_id}"`;
      }
      db.sequelize.query(sql).spread((resp) => response(res, resp[0]))
        .catch(err => errorResponse(res, err));

    } else {
      res.sendStatus(406);
    }
  },
  setBookingRunning: async (req, res, next) => {
    if (req.user && req.user.id) {
      db.booking.update(
        { status: 'running' },
        {
          where: {
            status: { [Op.in]: [5, 10] }, id: req.body.id,
            [Op.or]: [
              { patient_id: req.user.id },
              { booked_by: req.user.id }
            ]
          }
        }).then(resp => response(res, resp)).catch(err => errorResponse(res, err));
      //Call started successfully  : link to details page

      let book = await db.booking.findOne({
        where: { id: req.body.id },
        include: [
          {
            model: db.user.scope('publicInfo'),
            foreignKey: 'provider_id',
            as: 'providerInfo',
          }
        ]
      });
      monitorNotificationTrigger('CALL_STARTED_SUCCESSFULLY', { booking_id: book.id, by: req.user, with: book.providerInfo, patient_name: req.user.fullName, provider_name: book.providerInfo.fullName });
    } else {
      res.sendStatus(406);
    }
  },
  disconnectedReport: async (req, res, next) => {
    if (req.user && req.user.id) {
      db.booking.update(
        { status: 'running' },
        {
          where: {
            status: 5, patient_id: req.user.id, id: req.body.id
          }
        }).then(resp => response(res, resp)).catch(err => errorResponse(res, err));

      let book = await db.booking.findOne({
        where: { id: req.body.id },
        include: [
          {
            model: db.user.scope('publicInfo'),
            foreignKey: 'provider_id',
            as: 'providerInfo',
          }
        ]
      });
      monitorNotificationTrigger('CALL_DISCONNECTED', { booking_id: book.id, by: req.user, with: book.providerInfo, patient_name: req.user.fullName, provider_name: book.providerInfo.fullName });
    } else {
      res.sendStatus(406);
    }
  }
};