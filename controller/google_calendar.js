var request = require('request');

const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

const { google } = require('googleapis');
const calendar = google.calendar('v3');



module.exports = {
    async enable_google_calendar(req, res, next) {
        try {
            const scopes = [
                'https://www.googleapis.com/auth/calendar'
            ];
            var user_id = req.params.user_id;

            const oauth2Client = new google.auth.OAuth2(
                '1013734515262-csgcm2o0euikla7jera9a2va7h6077cp.apps.googleusercontent.com',
                'CiA5shVMZ2-eoAKEKqaYCYMB',
                `http://localhost:3004/api/google_calendar/refresh_token?user_id=${user_id}`
            );


            const url = oauth2Client.generateAuthUrl({
                // 'online' (default) or 'offline' (gets refresh_token)
                access_type: 'offline',

                // If you only need one scope you can pass it as a string
                scope: scopes
            });
            res.send({ url: url });
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: error
            })
        }
    },
    async refresh_token(req, res, next) {
        try {
            console.log(req.query)
            var data = {
                user_id: -1,
                refresh_token: req.query.code
            }
            let resp = await db.user_google_auth.upsert(data);
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

}