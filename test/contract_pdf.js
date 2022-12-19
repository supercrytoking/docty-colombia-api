var fs = require('fs');
var pdf = require('html-pdf');

var options = { format: 'Letter' };
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

db.contract_template.findOne()
    .then(r => {
        console.log(r.id)
        pdf.create(r.html, options).toFile('./businesscard.pdf', function (err, res) {
            if (err) return console.log(err);
            console.log(res); // { filename: '/app/businesscard.pdf' }
        });

    })
