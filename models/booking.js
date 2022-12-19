'use strict';
const payment_status = {
    pending: 0,
    paid: 1,
    rejected: 2,
    failed: 3,
    "0": "pending",
    "1": "paid",
    "2": "rejected",
    "3": "failed"
};
const status = {
    waiting: 0,
    accepted: 5,
    rejected: 2,
    running: 1,
    complete: 3,
    error: 4,
    slotBusy: 6,
    rescheduling: 7,
    canceled: 8,
    consulted: 9,
    expired: 10,
    refund: 11,
    "0": "waiting",
    "1": "running",
    "2": "rejected",
    "3": "complete",
    "4": "error",
    "5": "accepted",
    "6": "slotBusy",
    "7": "rescheduling",
    "8": "canceled",
    9: "consulted",
    "10": "expired",
    11: "refund"
}
const db = require(".");

module.exports = (sequelize, DataTypes) => {
    const booking = sequelize.define('booking', {
        patient_id: DataTypes.INTEGER,
        provider_id: DataTypes.INTEGER,
        dignosis_id: DataTypes.INTEGER,
        // family_member_id: DataTypes.INTEGER,
        booked_by: DataTypes.INTEGER,
        covid_id: DataTypes.INTEGER,
        service_name: {
            type: DataTypes.STRING
        },
        description: { type: DataTypes.TEXT, defaultValue: "" },
        reference_id: {
            type: DataTypes.STRING
        },
        digit_token: {
            type: DataTypes.STRING
        },
        payment_status: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            get() {
                let v = this.getDataValue('payment_status');
                return (payment_status[v] || null)
            },
            set(value) {
                let v = (value || 'pending').toLowerCase();
                let v1 = payment_status[v] || 0;
                this.setDataValue('payment_status', v1);
            }
        },
        status: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            get() {
                let v = this.getDataValue('status');
                return (status[v] || null)
            },
            set(value) {
                console.log(value, 'status')
                let v = (value || 'waiting').toLowerCase();
                this.setDataValue('status', (status[v] || 0));
            }
        },
        schedule_id: DataTypes.INTEGER,
        pharmacy: DataTypes.INTEGER,
        amount: DataTypes.DECIMAL(12, 2),
        councelling_type: DataTypes.STRING,
        offer_id: DataTypes.INTEGER,
        speciality_id: DataTypes.INTEGER,
        extras: DataTypes.JSON,
    }, {
        hooks: {

        }
    });
    booking.associate = function(models) {
        booking.belongsTo(models.user.scope('publicInfo', 'timezone'), {
            foreignKey: 'provider_id',
            as: 'providerInfo'
        });
        booking.belongsTo(models.userFamilyView.scope('publicInfo', 'timezone'), {
            foreignKey: 'patient_id',
            as: 'patientInfo',
        });
        booking.hasMany(models.call, {
            foreignKey: 'cid',
            as: 'booking_calls',
        });
        booking.belongsTo(models.user.scope('publicInfo', 'timezone'), {
            foreignKey: 'booked_by',
            as: 'bookedByUser',
        });
        booking.belongsTo(models.symptom_analysis, {
            foreignKey: 'dignosis_id',
            as: 'analysis',
        });
        booking.belongsTo(models.covid_checker, {
            foreignKey: 'covid_id',
            as: 'covid_analysis',
        });
        booking.belongsTo(models.schedule, {
            foreignKey: 'schedule_id',
            as: 'schedule',
        });
        booking.hasOne(models.prescription, {
            foreignKey: 'reference_id',
            sourceKey: 'reference_id',
            as: 'prescription',
        });
        booking.belongsTo(models.speciality, {
            foreignKey: 'speciality_id',
            as: 'speciality',
        });
        booking.hasOne(models.booking_support, {
            foreignKey: 'booking_id',
            as: 'booking_support',
        });
        booking.hasOne(models.booking_update_request, {
            foreignKey: 'booking_id',
            as: 'booking_update_request',
        });
        booking.hasOne(models.family_access, {
            sourceKey: 'booked_by',
            foreignKey: 'user_id',
            as: 'permitedBy',
        });
        booking.hasOne(models.invoice, {
            foreignKey: 'booking_id',
            sourceKey: 'id',
            as: 'invoice',
        });
    };
    return booking;
};