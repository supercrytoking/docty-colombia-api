'use strict';
module.exports = (sequelize, DataTypes) => {
    const health_advisor = sequelize.define('health_advisor', {
        patient_id: DataTypes.INTEGER,
        clinic_id: DataTypes.INTEGER,
        family_access: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        request_remark: DataTypes.STRING,
        reject_remark: DataTypes.STRING,
        approved: DataTypes.INTEGER,
        isDefault: DataTypes.BOOLEAN,
        type: DataTypes.STRING
    }, {
        paranoid: true,
        defaultScope: {
            attributes: { exclude: ['createdAt', 'updateAt', 'type'] }
        }
    });
    health_advisor.associate = function(models) {
        health_advisor.belongsTo(models.user, {
            foreignKey: 'clinic_id',
            as: 'health_advisors',
        })
        health_advisor.belongsTo(models.user, {
            foreignKey: 'patient_id',
            as: 'patient',
        })
    };
    return health_advisor;
};