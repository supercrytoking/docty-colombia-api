const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { otpTrigger, crmTrigger } = require('../../commons/crmTrigger');
const { notifyUsers } = require('../../commons/notifyUsers');
const { generateToken, councelling_type, scheduleTimeFormat, getNewPassword, getUserDomain, getAge } = require('../../commons/helper');
const { errorResponse, response } = require('../../commons/response');
const config = require(__dirname + '/../../config/config.json');
const static = require(__dirname + '/../../config/static.json');
const btoa = require('btoa');
const bcrypt = require('bcryptjs');
const { smsOtpTrigger, smsTrigger } = require('../../commons/smsCrmTrigger');
const formUrl = config.jotform.formUrl;



var daysOfDiff = (listOfdata) => {
  var loginDays = 0;
  if (listOfdata.length > 1) {
    loginDays = new Date(listOfdata[0]).getTime() - new Date(listOfdata[1]).getTime();
  } else if (listOfdata.length == 1) {
    loginDays = new Date().getTime() - new Date(listOfdata[0]).getTime();
  }
  loginDays = Math.round(loginDays / (1000 * 60 * 60 * 24));
  return loginDays;
};

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
  userInfo: async (req, res, next) => {
    if (req.user && req.user.id) {
      var user_id = req.body.id;
      var where = { id: user_id };
      let lang = req.lang || 'en';
      let attr = ['title', 'id', 'role_id'];
      if (lang == 'es') {
        attr = [['title_es', 'title'], 'id', 'role_id'];
      }
      var user = await db.user.findOne({
        where: where, attributes: ['id', 'first_name', 'last_name', 'fullName', 'createdAt', 'picture', 'speciality_type'],
        include: [{
          model: db.user_service,
          as: 'services',
          required: false,
          include: [
            {
              model: db.speciality,
              as: 'speciality',
              attributes: attr,
              where: {
                status: true,
              },
              required: true
            },
          ]
        }, 'reviewer']
      });

      // Get Today Bookings of user
      var start = new Date();
      start.setHours(0);
      start.setMinutes(0);
      start.setSeconds(0);
      start.setMilliseconds(0);
      if (req.body && req.body.start) {
        start = new Date(req.body.start);
      }
      var end = new Date(start);
      end.setDate(end.getDate() + 1);
      var todayBookings = await db.booking.findAll({
        where: {
          provider_id: user_id,
          status: { [Op.in]: [5, 3, 1] }, // 'accepted', 'complete', 'running'
          payment_status: 1,
          // '$schedule.end$': { [Op.gte]: start },
          // '$schedule.end$': { [Op.lte]: end },
        },
        include: [
          // 'schedule',
          {
            model: db.schedule,
            as: 'schedule',
            where: {
              start: { [Op.gte]: start },
              end: { [Op.lte]: end }
            }
          }]
      });

      //Get Week Bookings of user
      var curr = new Date(start);
      curr.setHours(0);
      curr.setMinutes(0);
      curr.setSeconds(0);
      var firstday = new Date(curr.setDate(curr.getDate() - curr.getDay()));
      var lastday = new Date(curr.setDate(curr.getDate() - curr.getDay() + 6));
      var weekBookings = await db.booking.findAll({
        where: {
          provider_id: user_id,
          status: { [Op.in]: [5, 3, 1, 0] }, // 'accepted', 'complete', 'running', 'waiting
          // '$schedule.end$': { [Op.gte]: firstday },
          // '$schedule.end$': { [Op.lte]: lastday }
        },
        include: [{
          model: db.schedule,
          as: 'schedule',
          where: {
            start: { [Op.gte]: firstday },
            end: { [Op.lte]: lastday }
          }
        }]
      });

      weekBookings = JSON.parse(JSON.stringify(weekBookings));
      // calculate weekly earning
      var weeklyEarning = 0;
      weekBookings.forEach(book => {
        if (book.payment_status == 'paid') {
          try {
            if (typeof book.amount == 'string') weeklyEarning += parseFloat(book.amount);
            else weeklyEarning += book.amount;
          } catch (e) { }
        }
      });
      user = JSON.parse(JSON.stringify(user));
      user.services = (user.services || []).filter(s => s.speciality.role_id == user.speciality_type);

      res.send({ user: user, todayBookings: todayBookings, weekBookings: weekBookings, weeklyEarning: weeklyEarning });
    } else {
      res.sendStatus(406);
    }

  },
  patientInfo: async (req, res, next) => {
    if (req.user && req.user.id) {
      var user_id = req.body.id;
      var where = { id: user_id };

      var customer = await db.customer.findOne({ where: { customer: user_id, user_id: req.user.id } });

      var family = [];

      var user = await db.user.findOne({
        where: where,
        attributes: ['id', 'first_name', 'last_name', 'fullName',
          'createdAt', 'picture', 'isd_code', 'country_id', 'phone_number', 'gender',
          'dob', [Sequelize.col('emergency_contact_person.phone_number'), 'emergency_contact']],
        include: [
          // 'insurance',
          'config',
          {
            model: db.user, as: 'emergency_contact_person', attributes: []
          }
        ]
      });
      let ha = null;
      if (!!user)
        ha = await user.getAdvisors({ where: { family_access: true } });
      if (!!ha && !!ha.length) {
        family = await user.getFamilies().filter(e => !!e.user)
          .map(r => {
            let user = r.user.toJSON();
            user.relation = r.relation;
            return user;
          });
      }
      user = JSON.parse(JSON.stringify(user));
      if (user && user.config && user.config.is_no_insurance) {
        delete user.insurance;
      }
      let parents = await db.user_kindred.findOne({ where: { member_id: user_id }, include: ['parent'] });
      if (!!parents && !!parents.parent) {
        let parent = JSON.parse(JSON.stringify(parents.parent));
        try {
          parent['relation'] = static.reverseRelation[user.gender][parents.relation]
        } catch (error) {
          parent['relation'] = null
        }
        family.push(parent)
      }

      res.send({ user: user, family: family, isCustomer: customer != null });
    } else {
      res.sendStatus(406);
    }

  },
  myStaffWithSchedule: async (req, res, next) => {
    if (req.user && req.user.id) {
      var user_id = req.user.id;
      if (req.query && req.query.user_id) {
        user_id = req.query.user_id;
      }
      let data = req.body;
      var roles_list = data.roles_list || [];

      var where = { status: 1 };

      let start = new Date();
      let end = new Date();
      end.setFullYear(end.getFullYear() + 1); // getAll schedule [ 1 year ]

      if (req.body.start) {
        start = new Date(req.body.start);
      }
      if (req.body.end) {
        end = new Date(req.body.end);
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
          where: { user_id: user_id }
        },
          'services',
        {
          model: db.schedule,
          as: 'schedule',
          where: {
            calendarId: 4,
            start: { [Op.gte]: start },
            end: { [Op.lte]: end }
          },
          required: false,
        },
        ],
        where: where
      }).then(resp => {
        res.send(resp);
      }).catch(err => {
        console.log(err);
        res.status(400).status({
          status: false,
          errors: `${err}`
        });
      });

    } else {
      res.sendStatus(406);
    }
  },


  newBookingGetOtp: async function (req, res, next) {
    if (req.user && req.user.id) {
      var user = req.body;

      var user_id = req.body.id;
      var family_id = req.body.family_id || 0;

      let userObj = await db.userFamilyView.findByPk(user_id);
      let email = userObj.email;
      let phone = `${userObj.isd_code}${userObj.phone_number}`;
      let userName = userObj.first_name
      let familyObj = null
      let age = 0;
      // if (!!family_id) {
      //   familyObj = await db.user_family.findByPk(family_id);
      //   if (familyObj)
      //     age = getAge(familyObj.dob) || 0
      // }
      age = getAge(userObj.dob) || 0
      let ud = userObj.id;
      if (age >= 18) {
        email = userObj.email;
        phone = `${userObj.isd_code}${userObj.phone_number}`;
        userName = userObj.first_name
      } else {
        let parent = await db.userFamilyView.findByPk(userObj.parent);
        if (!!parent) {
          email = parent.email;
          phone = `${parent.isd_code}${parent.phone_number}`;
          userName = parent.first_name;
          family_id = userObj.id
          ud = userObj.parent;
        }
      }

      const otp = Math.floor(100000 + Math.random() * 900000);
      db.pin.create({ user_id: ud, pin: otp, status: 0, member_id: family_id })
        .then(async (resp) => {
          var trigger = 'Symptom_Check_Auth_Code';
          if (user.isCovid19Checking) trigger = 'Covid19_Check_Auth_Code';
          if (user.isMovingClinicPatient) trigger = 'Move_Patient_Auth_Code';
          if (!!user.sendTo && user.sendTo == "phone") {
            smsOtpTrigger(trigger,
              {
                to: phone,
                userName: userName,
                otp: otp,
                company_name: req.user.company_name
              },
              req.lang || 'es')
          } else {
            await otpTrigger(trigger, {
              email: email,
              userName: userName,
              otp: otp,
              company_name: req.user.company_name
            }, req.lang || 'en');
          }
          res.send({ success: true });
        })
        .catch(err => {
          res.status(400).status({
            status: false,
            errors: `${err}`
          });
        });
    } else {
      res.sendStatus(406);
    }

  },
  verifyOtp: async function (req, res, next) {
    if (req.user && req.user.id) {
      var user_id = req.body.user_id;
      var member_id = req.body.member_id || 0;
      var otp = req.body.otp;

      db.pin.findOne({
        where: {
          pin: otp, status: 0,
          [Op.or]: [
            { member_id: user_id },
            { user_id: user_id }
          ]
        }
      })
        .then(async resp => {
          if (resp) {
            await db.pin.update({ status: 1 }, { where: { user_id: user_id, pin: otp } });
            res.send({ success: true });
          }
          else res.send({ success: false });
        })
        .catch(err => {
          res.status(400).status({
            status: false,
            errors: `${err}`
          });
        });
    } else {
      res.sendStatus(406);
    }
  },
  bookingSendInvoice: async (req, res, next) => {
    let data = req.body;
    try {
      let booking = await db.booking.findOne({
        where: {
          id: data.id
        },
        include: [{
          model: db.userFamilyView.scope(),
          foreignKey: 'patient_id',
          as: 'patientInfo',
          attributes: ['fullName', 'first_name', 'middle_name', 'last_name', 'id',
            'email', 'isd_code', 'phone_number', 'timezone_offset', 'dob', 'parent', 'allow_access']
        }, {
          model: db.user.scope(),
          foreignKey: 'provider_id',
          as: 'providerInfo',
          attributes: ['fullName', 'first_name', 'middle_name', 'last_name', 'id', 'email', 'phone_number', 'timezone_offset']
        }, 'schedule']
      });

      if (!!!booking) {
        return res.send({
          status: false,
          message: 'SERVER_MESSAGE.SONTHING_WRONG',
          data: booking
        });
      }

      var now = new Date();
      let coupon = null;
      if (data.promotionCode) {
        coupon = await db.coupon_utilisation.findOne({
          where: {
            [Op.or]:
              [{
                patient_id: req.user.id,
                is_global: false
              },
              {
                is_global: true
              }],
            status: true,
            create_code: data.promotionCode,
            type: 'copay',
            start: { [Op.lte]: now },
            end: { [Op.gte]: now }
          }
        });
      }
      let discount = 0;
      let amt = parseInt(booking.amount) || 0;
      let total = 0 + amt;
      if (!!coupon) {
        discount = parseInt(coupon.price);
        if (coupon.discount_type == 1) {
          amt = amt * (1 - discount / 100)
          discount = (parseInt(booking.amount) || 0) - amt;
        } else {
          amt = amt - discount;
        }
      }
      if (!!!booking.booked_by && !!booking.patientInfo.parent) {
        if (!!!booking.patientInfo.allow_access) {
          booking.booked_by = booking.patientInfo.parent || null
        } else if (!!booking.patientInfo.dob) {
          let age = getAge(booking.patientInfo.dob) || 0;
          if (age < 18) booking.booked_by = booking.patientInfo.parent || null
        }
      }

      if (amt < 0) amt = 0;
      booking.update({
        amount: amt,
        status: 0,
        payment_status: (amt <= 0 ? 'paid' : 'pending'), offer_id: (!!coupon ? coupon.id : null)
      });

      await db.schedule.update({ state: 'Busy', calendarId: 3 }, { where: { id: booking.schedule_id } })

      // var booking_update_request = {
      //   booking_id: data.id,
      //   reason: data.reason,
      //   old_provider_id: booking.provider_id,
      //   new_provider_id: booking.new_provider_id,
      //   status: 'new_booking_by_support',
      //   by_user: req.user.id
      // };

      // await db.booking_update_request.create(booking_update_request); // for logging

      var patient = booking.patientInfo || {};
      var provider = booking.providerInfo || {};

      var token_expire = new Date();
      token_expire.setDate(token_expire.getDate() + 1);
      const hash = await generateToken({ name: patient.fullName, group: 'client', role: 2 });;
      var tokenObj = await db.token.create({ userId: patient.id, token: hash, expiredAt: null, login_as: 0, is_for_link: true });
      tokenObj.update({ expiredAt: token_expire });
      var returnUrl = `/symptoms/billing/${btoa(data.id).replace(/=/g, '')}`;
      if (amt <= 0) {
        returnUrl = `/my-consultation/${btoa(data.id).replace(/=/g, '')}`;
        await generateInvoice(booking, 0, discount, 0, total, req, `Copay : ${data.promotionCode || ''}`)
      }
      var link = `${config.domains.patient}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrl)}`;
      var time = '';
      if (booking && booking.schedule) time = scheduleTimeFormat(booking.schedule, patient.timezone_offset);
      let cl = await db.associate.findOne({ where: { associate: booking.provider_id } });
      let clinic_id = null;
      if (!!cl && !!cl.user_id) {
        clinic_id = cl.user_id || null
      }
      otpTrigger('Consultation_Request_Invoice_Patient',
        {
          email: patient.email, clinic_id: clinic_id,
          subject: 'Docty Health Care: Consultation Invoice',
          company_name: `${req.user.company_name}`,
          your_name: patient.fullName,
          provider_name: provider.fullName,
          type: councelling_type(booking.councelling_type),
          time: time,
          link: link
        }, req.lang || 'en');
      smsOtpTrigger('Consultation_Request_Invoice_Patient', {
        link: link,
        to: `${patient.isd_code}${patient.phone_number}`,
        company_name: `${req.user.company_name}`,
        your_name: patient.fullName,
        provider_name: provider.fullName,
      }, patient.lang || req.lang || 'es')
      res.send({ success: true });

    } catch (error) {
      console.log(error);
      return errorResponse(res, error);
    }
  },

  addManager: async function (req, res, next) {
    if (req.user && req.user.id) {
      var data = req.body;
      var resp;

      if (!!data.id) {
        var user_authenticator = await db.user_authenticator.findOne({ where: { email: data.email, id: { [Op.ne]: data.id } } });
        if (user_authenticator) {
          return res.status(400).send({
            status: false,
            errors: 'EMAIL_UNAVALABLE'
          });
        }

        user_authenticator = await db.user_authenticator.findOne({ where: { phone_number: data.phone_number, id: { [Op.ne]: data.id } } });
        if (user_authenticator) {
          return res.status(400).send({
            status: false,
            errors: 'PHONE_UNAVALABLE'
          });
        }

        resp = db.user_authenticator.upsert(data);
      } else {
        var user_authenticator = await db.user_authenticator.findOne({ where: { email: data.email } });
        if (user_authenticator) {
          return res.status(400).send({
            status: false,
            errors: 'EMAIL_UNAVALABLE'
          });
        }

        user_authenticator = await db.user_authenticator.findOne({ where: { phone_number: data.phone_number } });
        if (user_authenticator) {
          return res.status(400).send({
            status: false,
            errors: 'PHONE_UNAVALABLE'
          });
        }

        var pwdObj = await getNewPassword();
        data.password = pwdObj.hashPassword;
        req.body.user_id = req.user.id;
        req.body.need_password_reset = true;

        var parentUser = await db.user.findOne({ where: { id: req.user.id } });
        otpTrigger('Access_Allowed_Clinic_Member', { email: data.email, subject: 'Docty Health Care: portal Access', password: pwdObj.password, added_By: parentUser.fullName, added_By_img: parentUser.picture }, req.lang || 'en');

        resp = db.user_authenticator.create(data);
      }

      resp.then(resp => {
        res.send(resp);
      })
        .catch(err => {
          res.status(400).status({
            status: false,
            errors: `${err}`
          });
        });
    } else {
      res.sendStatus(406);
    }
  },
  getManagerList: async function (req, res, next) {
    if (req.user && req.user.id) {
      var where = { user_id: req.user.id };
      if (req.query && req.query.id) where = { id: req.query.id };
      db.user_authenticator.findAll({ where: where })
        .then(async resp => {
          res.send(resp);
        })
        .catch(err => {
          console.log(err);
          res.status(400).status({
            status: false,
            errors: `${err}`
          });
        });
    } else {
      res.sendStatus(406);
    }
  },
  deleteManager: async function (req, res, next) {
    if (req.user && req.user.id) {
      db.user_authenticator.destroy({ where: { id: req.body.id } })
        .then(async resp => {
          res.send({ success: true, data: resp });
        })
        .catch(err => {
          res.status(400).status({
            status: false,
            errors: `${err}`
          });
        });
    } else {
      res.sendStatus(406);
    }
  },

  changePassword: async (req, res) => {
    if (req.user && req.user.id) {
      var password = req.body.password;
      var parentUser = await db.user.findOne({ where: { id: req.user.id } });

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

          return db.user_authenticator.update({ password: hashPassword }, { where: { id: req.body.id } }).then(async resp => {
            res.send(resp);
            otpTrigger('Clinic_Member_Password_Updated', { email: parentUser.email, subject: 'Docty Health Care: password updated', password: password, added_By: parentUser.fullName, added_By_img: parentUser.picture }, parentUser.lang || req.lang || 'en');
          });
        });
      });

    } else {
      res.sendStatus(406);
    }
  },


  resetTemporaryPassword: async (req, res, next) => {
    try {
      let result = await db.user.scope('').findOne({ where: { id: req.body.user_id } });
      let data = req.body;
      if (!!data.sms) {
        return smsOtpTrigger('Clinic_Patient_Welcome_SMS', {
          to: `${result.isd_code}${result.phone_number}`,
          name: result.first_name,
          clinic: req.user.company_name
        }, result.lang || 'es').then(resp => {
          res.status(200).json({
            error: false,
            status: "Success",
            // message: 'Password successfully updated !',
            // data: passwordObject.password
          });
        })
      }
      var passwordObject = await getNewPassword();
      if (!!result) {
        await result.update({ password: passwordObject.hashPassword, need_password_reset: true });
        otpTrigger('Login_Details_Generated',
          {
            email: req.body.email,
            password: passwordObject.password,
            link: await getUserDomain(req.body.user_id),
            provider_name: result.fullName
          }, req.lang || 'en');

        res.status(200).json({
          error: false,
          status: "Success",
          message: 'Password successfully updated !',
          data: passwordObject.password
        });
      } else {
        return res.status(500).json({
          'error_code': 109,
          'status': false,
          'errors': 'Password Not updated. Please try again !'
        });
      }


    } catch (error) {
      return res.status(500).json({
        error_code: 105,
        status: false,
        error: `${error}`
      });
    }
  },
  myConsultationForm: async (req, res, next) => {
    let sql = `SELECT cj.form_id,cj.clinic_id, CONCAT('${formUrl}',cj.form_id) form 
    FROM clinic_jotforms cj WHERE cj.clinic_id = ${req.user.id}`;
    db.sequelize.query(sql).spread(resp => response(res, resp[0])).catch(ee => errorResponse(res, ee));
  },
  timeLog: async (req, res, next) => {
    if (req.user && req.user.id) {
      var user_id = req.params.user_id;

      var activity_logs = await db.activity_log.findAll({
        where: {
          user_id: user_id
        },
        limit: 2,
        order: [['createdAt', 'DESC']],

      });
      var loginDays = null;
      activity_logs = activity_logs.map(a => a.createdAt);
      if (!!activity_logs.length) {
        loginDays = daysOfDiff(activity_logs);
      }

      var symptom_analysis = await db.symptom_analysis.findAll({
        where: {
          user_id: user_id
        },
        limit: 2,
        order: [['createdAt', 'DESC']],

      });
      var symptomDays = null;
      symptom_analysis = symptom_analysis.map(a => a.createdAt);
      if (!!symptom_analysis.length) {
        symptomDays = daysOfDiff(symptom_analysis);
      }

      var books = await db.booking.findAll({
        where: {
          patient_id: user_id,
          status: 3,//complete
          family_member_id: 0,
        },
        limit: 2,
        order: [[{
          model: db.schedule,
          as: 'schedule',
        }, 'start', 'DESC']],
        include: [{
          model: db.schedule,
          as: 'schedule',
          required: true,
        }]
      });
      var bookingDays = null;
      books = books.map(b => b.schedule.start);
      if (!!books.length) {
        var bookingDays = daysOfDiff(books);
      }
      res.send({
        loginDays, symptomDays, bookingDays
      });

    }
    else {
      res.sendStatus(406);
    }
  },
  sendnotificationUsers: async (req, res, next) => {
    let users = req.body.users;
    let modes = req.body.modes;
    let message = req.body.message || '';
    let subject = req.body.subject || '';
    let phones = users.map(e => e.phone_number);
    let emails = users.map(e => e.email);
    notifyUsers(message, modes, phones, emails, subject).then(resp => {
      res.send({
        status: true
      });
    }).catch(err => {
      res.status(400).send({
        status: false,
        errors: err,
        error: `${err}`
      });
    });
  },
  userFinder: async (req, res, next) => {
    let sql = `SELECT
    CASE
    WHEN ur.role_id < 4 THEN CONCAT(
    COALESCE(u.first_name, ''), ' ',
    COALESCE(u.middle_name, ''), ' ',
    COALESCE(u.last_name, ''), ' ',
    COALESCE(u.last_name_2, '')
    )
    ELSE u.company_name
    END AS fullName,
    u.createdAt,r.role,ur.role_id,u.id,
    u.email,u.phone_number
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN roles r ON r.id = ur.role_id
    LEFT JOIN customers c ON c.customer = u.id
    LEFT JOIN associates aa ON aa.associate = u.id
    WHERE ( u.email like '%${req.params.search}%'
    OR  u.phone_number like '%${req.params.search}%'
    OR  u.telephone_1 like '%${req.params.search}%'
    OR  u.telephone_1 like '%${req.params.search}%'
    OR CONCAT(
    COALESCE(u.first_name, ''),
    COALESCE(u.middle_name, ''),
    COALESCE(u.last_name, ''),
    COALESCE(u.last_name_2, ''))
    LIKE '%${req.params.search}%'
    ) AND (aa.user_id = ${req.user.id} OR c.user_id = ${req.user.id})`;
    if (req.query && req.query.role) {
      let role = req.query.role;
      sql += ` AND ur.role_id = ${role}`;
    }
    console.log(sql)
    db.sequelize.query(sql).spread((resp, m) => {
      res.send(resp)
    }).catch(e => res.status(400).send({ error: `${e}` }))
  },

  async getApiKey(req, res, next) {
    try {
      let api = await db.apiKey.findOne({ where: { user_id: req.user.id } });
      if (!!!api) {
        let apiKey = `${Date.now()}${req.user.id}`;
        apiKey = btoa(apiKey).replace(/=/g, '');
        api = await db.apiKey.create({ user_id: req.user.id, apiKey: apiKey });
      }
      res.send(api)
    } catch (error) {
      res.status(400).send({ error: `${error}` })
    }
  },
  async getInsuranceCustomer(req, res) {
    let offset = 0;
    let page = 1;
    let limit = 50;
    let orderKey = 'policy_holder';
    let order = 'ASC';
    let query = req.query || {};
    if (!!query.orderKey) {
      orderKey = query.orderKey
    }
    if (!!query.order) {
      order = query.order
    }
    if (!!query.page) {
      page = query.page;
    }
    offset = (page - 1) * limit;
    if (offset < 0) offset = 0;
    let name = (obj) => {
      return `REPLACE(CONCAT(COALESCE(${obj}.first_name, ''), ' ', COALESCE(${obj}.middle_name, ''), ' ',
       COALESCE(${obj}.last_name, '')), '  ', ' ')`
    }
    let count = `SELECT COUNT(ip.id) AS total`;
    let select = `SELECT ip.name provider,ip.id provider_id,ui.id id,u.id user_id,
    ui.type policy_type,DATE_FORMAT(ui.start_date,'%d %M %Y') start_date,DATE_FORMAT(ui.end_date,'%d %M %Y') end_date,
    ui.card_copy policy_bond,
    u.id family_id,(ui.addedBy = ia.user_id) canDelete,
    CASE
      WHEN ui.type = 'individual' THEN ui.card_number
      WHEN ui.type = 'group' AND uim.policy_number IS NULL THEN ui.card_number
      ELSE uim.policy_number
    END policy_no,
    CASE
      WHEN ui.type = 'individual' THEN 1
      ELSE (SELECT COUNT(id) FROM user_insurance_members WHERE insurance_id = ui.id AND isCovered = 1)
    END beneficiaries,
    CASE
      WHEN ui.type = 'individual' THEN 'Primary'
      WHEN ui.type = 'group' AND uim.isPrimary > 0 THEN 'Primary'
      ELSE 'Secondary'
    END holder_type,
    CASE
      WHEN (ui.type = 'individual' OR ui.type IS NULL) THEN ${name('u')}
      WHEN ui.type = 'group' AND uim.member_id != u.parent THEN ${name('uf2')}
      ELSE ${name('u')}
    END policy_holder,
    CASE
      WHEN (ui.addedBy IS NULL OR ui.addedBy = ui.user_id) and (ui.member_id = 0 or ui.member_id is null) THEN 'SELF'
      WHEN (ui.addedBy IS NULL OR ui.addedBy = ui.user_id) AND ui.member_id IS not NULL THEN ${name('u')}
      ELSE IF(u2.first_name,${name('u2')},u2.company_name)
    END added_by`;
    let sql = `
    FROM insurance_associates ia
    JOIN insurence_providers ip ON ip.id = ia.provider_id
    JOIN user_insurances ui ON ui.company = ia.provider_id
    JOIN user_family_view u  ON u.id = ui.user_id AND u.deletedAt IS NULL
    JOIN customers c ON c.customer = u.parent AND c.user_id =  ${req.user.id}
    LEFT JOIN user_insurance_members uim ON uim.insurance_id = ui.id AND isPrimary = 1
    LEFT JOIN users uf2 ON uim.member_id = uf2.id AND uf2.deletedAt IS NULL
    LEFT JOIN users u2 ON u2.id = ui.addedBy
    WHERE ia.user_id = ${req.user.id} AND (u.id IS NOT NULL OR uf2.id IS NOT NULL)
    `;

    if (!!query.type) {
      sql += ` AND ui.type = '${query.type}'`
    }
    if (!!query.provider_id) {
      sql += ` AND ia.provider_id = '${query.provider_id}'`
    }
    if (!!query.expiringDays) {
      let d = parseInt(query.expiringDays)
      if (d >= 0)
        sql += ` AND ui.end_date <= (NOW() + INTERVAL ${d} DAY)`
    }
    if (!!query.search) {
      sql += ` HAVING policy_holder like '%${query.search}%'`
    }
    let total = await db.sequelize.query(count + ' ' + sql).spread((r, m) => r[0].total).catch(e => 0);
    db.sequelize.query(select + ' ' + sql + ` ORDER BY ${orderKey} ${order} LIMIT ${offset}, ${limit}`).spread(async (r, m) => {
      let ids = r.map(e => e.id);
      ids.push(0);
      let ssql = `SELECT uim.policy_number policy_no,
       ${name('uf')} policy_holder,
      'Secondary' as holder_type,
      uim.insurance_id as insurance_id
      FROM user_insurance_members uim
      LEFT JOIN users uf ON uf.id = uim.member_id AND uf.deletedAt IS NULL
      WHERE uim.insurance_id IN (${ids.join(',')}) AND uim.isCovered = TRUE AND uim.isPrimary = FALSE`
      let secondary = await db.sequelize.query(ssql).spread((r, m) => r).catch(e => []);
      return response(res, { count: total, rows: r, otherObject: { secondary } }, '', limit)
    }).catch(e => res.status(400).send({ status: false, error: `${e}` }))
  },
  downloadIC(req, res, next) {
    let name = (obj) => {
      return `REPLACE(CONCAT(COALESCE(${obj}.first_name, ''), ' ', COALESCE(${obj}.middle_name, ''), ' ',
       COALESCE(${obj}.last_name, '')), '  ', ' ')`
    }
    let sql = `SELECT ip.name provider,ip.id provider_id,ui.id id,u.id user_id,
    ui.type policy_type,DATE_FORMAT(ui.start_date,'%d %M %Y') start_date,DATE_FORMAT(ui.end_date,'%d %M %Y') end_date,
    ui.card_copy policy_bond,
    u.id family_id,(ui.addedBy = ia.user_id) canDelete,
    CASE
      WHEN ui.type = 'individual' THEN ui.card_number
      WHEN ui.type = 'group' AND uim.policy_number IS NULL THEN ui.card_number
      ELSE uim.policy_number
    END policy_no,
    CASE
      WHEN ui.type = 'individual' THEN 1
      ELSE (SELECT COUNT(id) FROM user_insurance_members WHERE insurance_id = ui.id AND isCovered = 1)
    END beneficiaries,
    CASE
      WHEN ui.type = 'individual' THEN 'Primary'
      WHEN ui.type = 'group' AND uim.isPrimary > 0 THEN 'Primary'
      ELSE 'Secondary'
    END holder_type,
    CASE
      WHEN (ui.type = 'individual' OR ui.type IS NULL) THEN ${name('u')}
      WHEN ui.type = 'group' AND uim.member_id != u.parent THEN ${name('uf2')}
      ELSE ${name('u')}
    END policy_holder,
    CASE
      WHEN (ui.addedBy IS NULL OR ui.addedBy = ui.user_id) and (ui.member_id = 0 or ui.member_id is null) THEN 'SELF'
      WHEN (ui.addedBy IS NULL OR ui.addedBy = ui.user_id) AND ui.member_id IS not NULL THEN ${name('u')}
      ELSE IF(u2.first_name,${name('u2')},u2.company_name)
    END added_by
     FROM insurance_associates ia
    JOIN insurence_providers ip ON ip.id = ia.provider_id
    JOIN user_insurances ui ON ui.company = ia.provider_id
    JOIN user_family_view u  ON u.id = ui.user_id AND u.deletedAt IS NULL
    JOIN customers c ON c.customer = u.parent  AND c.user_id =  ${req.user.id}
    LEFT JOIN user_insurance_members uim ON uim.insurance_id = ui.id AND isPrimary = 1
    LEFT JOIN users uf2 ON uim.member_id = uf2.id AND uf2.deletedAt IS NULL
    LEFT JOIN users u2 ON u2.id = ui.addedBy
    WHERE ia.user_id = ${req.user.id} AND (u.id IS NOT NULL OR uf2.id IS NOT NULL)
    `;
    db.sequelize.query(sql).spread((r, m) => {
      return res.xls('customers.xlsx', r)
    }).catch(e => res.status(400).send({ status: false, error: `${e}` }))

  }
};