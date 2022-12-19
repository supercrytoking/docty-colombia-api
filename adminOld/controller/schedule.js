const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

const { addActivityLog } = require('./activityLog');

module.exports = {
  setSchedule: (req, res, next) => {
    if (req.user && req.user.id) {
      let data = req.body;
      let v = Date.now();
      let str = v.toString(16);
      data['reference_id'] = str.toUpperCase();
      data['patient_id'] = req.user.id;
      data['user_id'] = req.user.id;
      data['title'] = data.service_name;
      db.booking.create(data).then(async resp => {
        addActivityLog({ user_id: req.user.id, type: 'New Booking', details: `User ${req.user.email} created new schedule` });
        return res.send(resp);
      }).catch(err => {
        res.status(400).send({
          status: false,
          error: `${err}`
        })
      })
    } else {
      res.sendStatus(406)
    }
  },

  createBookingForAnanysis: async (req, res, next) => {
    try {
      if (req.user && req.user.id) {
        let data = req.body;
        let v = Date.now();
        let str = v.toString(16);
        data['reference_id'] = str.toUpperCase();
        data['patient_id'] = req.user.id;
        data['user_id'] = req.user.id;
        data['title'] = data.service_name;
        if (data.id) {
          let book = await db.booking.findByPk(data.id);
          if (!!book.provider_id && !!book.schedule_id) {
            return book.update({
              provider_id: data.provider_id,
              schedule_id: data.schedule_id,
              speciality_id: data.speciality_id,
              status: 'waiting'
            })
              .then(rr => {
                addActivityLog({ user_id: req.user.id, type: 'Schedule Updated' });
                return res.send(book);
              })
          }
          return book.update(data).then(async resp => {
            addActivityLog({ user_id: req.user.id, type: 'Provider selected', details: `User ${req.user.email} Provider selected` });
            return res.send(book);
          }).catch(err => {
            res.status(400).send({
              status: false,
              error: `${err}`
            })
          })

        }
        let booking = await db.booking.findOne({ where: { dignosis_id: data.dignosis_id, patient_id: data.user_id } });
        if (!!booking) {
          booking.update(data).then(resp => {
            addActivityLog({ user_id: req.user.id, type: 'Symptoms checked', details: `User ${req.user.email} Sympptom checked` });
            return res.send(resp);
          }).catch(err => {
            res.status(400).send({
              status: false,
              error: `${err}`
            })
          })
        } else {
          db.booking.create(data).then(async resp => {
            addActivityLog({ user_id: req.user.id, type: 'New Booking', details: `User ${req.user.email} created new schedule` });
            return res.send(resp);
          }).catch(err => {
            res.status(400).send({
              status: false,
              errors: `${err}`
            })
          })
        }
      } else {
        res.sendStatus(406)
      }
    } catch (error) {
      res.status(400).send({
        status: false,
        errors: `${error}`
      })
    }
  },
  updateSchedule: (req, res, next) => {
    try {

      if (req.user && req.user.id) {
        let data = req.body;

        if (data.id) {
          db.booking.update(data, { where: { id: data.id } }).then(resp => {
            // addActivityLog({ user_id: req.user.id, type: 'Counselling Request', details: `${data.status}` });
            return res.send(resp);
          }).catch(err => {
            res.status(400).send({
              status: false,
              error: `${err}`
            })
          })
          return;
        } else {
          res.sendStatus(406)
        }
      } else {
        res.sendStatus(406)
      }
    } catch (error) {
      console.log(error)
      res.status(400).send({
        status: false,
        errors: `${error}`
      })
    }
  },
  getSchedule: (req, res, next) => {
    if (req.user && req.user.id) {
      let where = {
        // payment_status: 1
      };
      if (req.query) {
        let query = req.query;
        if (!!query.id) {
          where['id'] = query.id
        }
        if (!!query.from) {
          where['createdAt'] = { [Op.gte]: (new Date(query.from)) }
        }
        if (!!query.to) {
          where['createdAt'] = { [Op.lte]: (new Date(query.to)) }
        }
        if (!!query.from && !!query.to) {
          where['createdAt'] = { [Op.gte]: (new Date(query.from)), [Op.lte]: (new Date(query.to)) }
        }
        if (!!query.family_member) {
          where['family_member_id'] = query.family_member
        }
      }
      db.booking.findAll({ where, include: ['providerInfo', 'patientInfo', 'analysis', 'family_member'], order: [['createdAt', 'DESC']] }).then(resp => {
        res.send(resp)
      }).catch(err => {
        res.send(err)
      })
    } else {
      res.sendStatus(406).send(req)
    }
  },
  getScheduleOnlyPatient: (req, res, next) => {
    if (req.user && req.user.id) {
      let where = {
        provider_id: req.user.id,
        payment_status: 1,
        // status: 'accepted',
        schedule_id: { [Op.ne]: null }
      };

      db.booking.findAll({ where, include: ['providerInfo', 'patientInfo', 'analysis', 'family_member', 'schedule'], order: [['createdAt', 'DESC']] }).then(resp => {
        res.send(resp)
      }).catch(err => {
        res.send(err)
      })
    } else {
      res.sendStatus(406).send(req)
    }
  },
  getScheduleSet: (req, res, next) => {
    if (req.user && req.user.id) {
      db.schedule.findByPk(req.body.id).then(resp => {
        res.send(resp)
      }).catch(err => {
        res.send(err)
      })
    } else {
      res.sendStatus(406).send(req)
    }
  },
  getScheduleByReference: (req, res, next) => {
    if (req.user && req.user.id) {
      let reference_id = req.body.reference_id

      db.booking.findOne({ where: { reference_id: reference_id }, include: ['providerInfo'] }).then(resp => {
        res.send(resp)
      }).catch(err => {
        res.send(err)
      })
    } else {
      res.sendStatus(406).send(req)
    }
  },

  setCalendarEvent: (req, res, next) => {
    if (req.user && req.user.id) {
      let data = req.body;
      data['user_id'] = req.user.id;
      data.start = data.start._date;
      data.end = data.end._date;
      db.schedule.upsert(data).then(resp => {
        res.send({
          status: true,
          message: 'event created successfully.'
        })
      }).catch(err => {
        res.status(400).send({
          status: false,
          errors: `${err}`
        })
      })
    } else {
      res.sendStatus(406)
    }
  },
  getCalendarEvents: (req, res, next) => {
    if (req.user && req.user.id) {
      let id = req.user.id;
      if (req.body.user_id) {
        id = req.body.user_id
      }
      let start = req.body.start;
      let end = req.body.end;
      if (!start || !end) {
        return res.status(403).send({
          status: false,
          errors: `Invalid date range provided`
        })
      }
      let query = `SELECT * FROM schedules WHERE DATE(start) >= DATE("${start}") AND DATE(start) <= DATE("${end}") AND user_id = ${id}`;
      if (req.body.calendarId) {
        query += ` AND calendarId = ${req.body.calendarId}`
      }
      db.sequelize.query(query).spread((resp, meta) => {
        res.send(resp)
      }).catch(err => {
        res.status(400).send({
          status: false,
          errors: `${err}`
        })
      })
    } else {
      res.sendStatus(406)
    }

  },
  deleteCalendarEvent: (req, res, next) => {
    if (req.user && req.user.id) {
      db.schedule.destroy({ where: { user_id: req.user.id, id: req.body.id } })
        // db.schedule.findOne({where:{user_id:req.user_id.id,id:req.body.id}})
        .then(resp => {
          res.send({
            status: true,
            message: 'event deleted successfully'
          })
        }).catch(err => {
          res.status(400).send({
            status: false,
            errors: `${err}`
          })
        })
    } else {
      res.sendStatus(406)
    }
  },
  createBulkEvent: async (req, res, next) => {
    if (req.user && req.user.id) {
      let schedule = {
        user_id: req.user.id,
        title: `Available at Docty.ai`,
        calendarId: 4,
        category: 'time',
        location: (req.body.location || null),
        dueDateClass: '',
        isReadOnly: false,
        state: `Free`,
        isAllDay: false,
        start: null,
        end: null
      }
      let slots = req.body.slots;
      let promises = [];
      try {
        slots.forEach(async slot => {
          promises.push(
            db.schedule.findOne({ where: { start: slot.start, end: slot.end } }).then(r => {
              if (!r) {
                schedule.start = slot.start;
                schedule.end = slot.end;
                return db.schedule.create(schedule)
              }
              else
                return r
            })
          )
        })
        Promise.all(promises).then(resp => {
          res.send(resp)
        }).catch(err => {
          res.send({
            errors: `${err}`,
            status: false
          })
        })
      } catch (error) {
        res.send({
          errors: `${error}`,
          status: false
        })
      }
    } else {
      res.sendStatus(406)
    }
  },
  confirmBooking: (req, res, next) => {
    if (req.user && req.user.id) {
      let user_id = req.user.id;
      if (!!!req.body.reference_id) {
        throw new Error(`Unknown Reference id`);
      }
      let reference_id = req.body.reference_id;
      db.booking.findOne({
        where: {
          patient_id: user_id,
          reference_id: reference_id
        },
        include: ['patientInfo', 'providerInfo']
      }).then(async resp => {
        if (resp) {
          await resp.update({ payment_status: 'paid' });
          let schedule = await db.schedule.findByPk(resp.schedule_id);

          if (schedule && (schedule.state == 'Free' || schedule.state == 'free')) {
            let title = `${resp.patientInfo ? resp.patientInfo.first_name : ''} : ${resp.service_name}`
            let newschedule = await schedule.update({
              title: title,
              state: 'Busy',
              calendarId: 3,
              councelling_type: resp.councelling_type,
              reference_id: resp.reference_id
            });

            if (newschedule) {
              let patientSchedule = JSON.parse(JSON.stringify(newschedule))
              patientSchedule['id'] = null;
              patientSchedule['title'] = `${resp.providerInfo ? resp.providerInfo.first_name : ''} : ${resp.service_name}`;
              patientSchedule['user_id'] = req.user.id;

              db.schedule.create(patientSchedule).then(ress => {
                res.send({
                  status: true,
                  message: 'Booking confirmerd...',
                  data: ress
                })
              }).catch(err => {
                res.status(400).send({
                  status: false,
                  errors: `${err}`
                })
              })
            } else {
              await resp.update({ status: 'error' });
              res.status(400).send({
                status: false,
                errors: `something went wrong... 1`
              })
            }
          } else {
            await resp.update({ status: 'error' });
            res.status(400).send({
              status: false,
              errors: `Sorry, this time slot not availabe...`
            })
          }

        } else {
          res.status(400).send({
            status: false,
            errors: `Invalid reference...`
          })
        }
      })
    } else {
      res.sendStatus(406)
    }
  }
}