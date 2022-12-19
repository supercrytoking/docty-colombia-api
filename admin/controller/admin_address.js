const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const Validator = require("validator");
const isEmpty = require("is-empty");
const validateAddressInput = require("../../validation/address");

async function addAddress(req, res, next) {
    if (req.user && req.user.id) {
        try {
            // const { errors, isValid } = validateAddressInput.validateAddressInput(req.body);
            // if (!isValid) {
            //     return res.status(400).json({
            //         'error_code': 101,
            //         'status': false,
            //         'errors': errors
            //     });
            // } else {

            await db.address.destroy({
                where: {
                    admin_id: req.body.admin_id
                }
            });
            // if (address) {
            //     return res.status(409).json({
            //         'error_code': 102,
            //         'status': false,
            //         'errors': 'Address is already added for the user.'
            //     })
            // }

            console.log(req.body)
            var result = await db.address.create(req.body);
            if (result) {
                res.status(200).json({
                    error: "false",
                    status: "Success",
                    message: 'Address  is successfully Added.',
                    data: result
                })
            } else {
                return res.status(500).json({
                    'error_code': 109,
                    'status': false,
                    'errors': 'Address is not added. Please try again after some time.'
                })
            }
            // }
        } catch (error) {
            console.log(error)
            return res.status(500).json(
                {
                    error_code: 103,
                    status: false,
                    errors: `${error}`
                }
            )
        }
    }
    else {
        res.sendStatus(406)
    }
}

async function UpdateAddress(req, res, next) {
    if (req.user && req.user.id) {
        try {
            // const { errors, isValid } = validateAddressInput.validateAddressInput(req.body, "update");
            // // Check validation 
            // if (!isValid) {
            //     return res.status(400).json({
            //         error: true,
            //         status: false,
            //         errors
            //     });
            // }

            var address = await db.address.upsert(req.body, { where: { id: req.body.id } });
            console.log(address);
            if (address == 0 || !address) {
                return res.status(404).json({
                    error_code: 106,
                    status: false,
                    errors: "Address is not updated. Please try again!"
                });
            }
            delete (req.body.id);
            return res.status(200).json({
                error: false,
                status: "Success",
                data: req.body
            })
        } catch (error) {
            return res.status(500).json({
                error_code: 105,
                status: false,
                error: `${error}`
            })
        }
    }
    else {
        res.sendStatus(406)
    }
}

async function removeAddress(req, res, next) {
    if (req.user && req.user.id) {
        try {
            let errors = {};
            // console.log("I am in");
            let id = !isEmpty(req.params.id) ? req.params.id : "";

            if (Validator.isEmpty(id)) {
                errors.id = "Address id is Empty";
            }
            // Check validation  
            if (!isEmpty(errors)) {
                return res.status(400).json({
                    error: true,
                    status: false,
                    errors: errors
                });
            }
            var address_data = await db.address.destroy({ where: { id: id } });
            if (address_data) {
                return res.status(200).json({
                    error: false,
                    status: "Success",
                    message: "Address deleted successfully",
                    data: address_data
                })
            } else {
                return res.status(404).json({
                    error: true,
                    status: false,
                    message: "Address not deleted. please try again"
                })
            }
        } catch (error) {
            return res.status(500).json({
                error_code: 105,
                status: false,
                error: `${error}`
            })
        }
    }
    else {
        res.sendStatus(406)
    }
}

async function getAddressDetailByAdmin(req, res, next) {
    if (req.user && req.user.id) {
        try {
            let admin_id = req.body.admin_id

            if (admin_id == null) {

                return res.status(400).json({
                    error: true,
                    status: false,
                    errors: 'Need admin_id'
                });
            }

            // let attributes = ['id','appartment_no','house_no','landmark','city','state','country','zip'];
            let address_data = await db.address.findOne({ where: { admin_id: admin_id } });
            if (address_data) {
                return res.status(200).json({
                    error: false,
                    status: "Success",
                    data: address_data
                })
            } else {
                return res.status(404).json({
                    error: true,
                    status: false,
                    message: "Address detail not found. Please try again"
                })
            }
        } catch (error) {
            console.error(error)
            return res.status(500).json({
                error_code: 105,
                status: false,
                error: `${error}`
            })
        }
    }
    else {
        res.sendStatus(406)
    }
}

module.exports = { addAddress, UpdateAddress, removeAddress, getAddressDetailByAdmin }
