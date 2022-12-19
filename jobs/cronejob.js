var createError = require('http-errors');
var express = require('express');
const cron = require("node-cron");
require('dotenv').config();

var app = express();

var { emailer, sms, pendingStaffSignupReminder, happyBirthday, incorporationGreeting, insuranceReminder, bookingReminder, calendarEmptyReminder, unreadMesageReminder, eventReminder } = require('./jobController');
var { freeUp, setBookingExpired } = require('./freeupUpBusySlot');
var signedContract = require('./signedContract');
var cronController = require('../commons/cron');
var { dropboxCron } = require('../webhook/dropbox');
var { patientListOfClinic } = require('./scheduledDownloads');
const { odooFetch } = require('../interOperability/crons/odoo');
const { associateCC } = require('./clinicCorporateAssociation');

var everyDayEvent = () => {
    calendarEmptyReminder();
    pendingStaffSignupReminder();
    happyBirthday();
    incorporationGreeting();
    insuranceReminder();
};
// setBookingExpired();
cron.schedule("* * * * *", emailer);
cron.schedule("* * * * *", unreadMesageReminder);

cron.schedule("* * * * *", freeUp);
cron.schedule("* * * * *", setBookingExpired);
cron.schedule("* * * * *", signedContract.check);

cron.schedule("0,30 * * * *", cronController.calculateAvarageRating);
cronController.calculateAvarageRating();
cron.schedule("* * * * *", sms);
cron.schedule("0 0 * * *", everyDayEvent); // 12:00 am

cron.schedule("* * * * *", bookingReminder);

cron.schedule("* * * * *", eventReminder);
cron.schedule("* * * * *", dropboxCron);
cron.schedule("* * * * *", odooFetch);

cron.schedule("*/10 * * * *", patientListOfClinic);
cron.schedule("*/5 * * * *", associateCC);
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error panpm ge
    res.status(err.status || 500);
    res.render('error');
});


module.exports = app;