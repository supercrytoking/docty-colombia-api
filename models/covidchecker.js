'use strict';
module.exports = (sequelize, DataTypes) => {
    const covidChecker = sequelize.define('covid_checker', {
        user_id: DataTypes.INTEGER,
        age: DataTypes.INTEGER,
        gender: DataTypes.STRING,
        input_data: DataTypes.JSON,
        triage: DataTypes.JSON,
        user_response: DataTypes.JSON,
        // family_member_id: DataTypes.INTEGER,
        added_by: DataTypes.INTEGER,
        symptom_status: DataTypes.JSON,
        changed_user_id: DataTypes.INTEGER,
        changed_admin_id: DataTypes.INTEGER,
        booking_id: DataTypes.INTEGER,
        latitude: {
            type: DataTypes.STRING,
            defaultValue: null
        },
        longitude: {
            type: DataTypes.STRING,
            defaultValue: null
        },
        by_user_id: DataTypes.INTEGER,
        by_admin_id: DataTypes.INTEGER,
    }, {});
    covidChecker.associate = function(models) {
        covidChecker.belongsTo(models.user.scope('publicInfo'), {
            foreignKey: 'added_by',
            as: 'addedByUser'
        });
        covidChecker.belongsTo(models.userFamilyView, {
            foreignKey: 'user_id',
            as: 'user'
        });
        covidChecker.hasOne(models.family_access, {
            targetKey: 'added_by',
            foreignKey: 'permitted_to',
            as: 'permitedBy',
        });
        covidChecker.belongsTo(models.user.scope('publicInfo'), {
            foreignKey: 'user_id',
            as: 'userInfo'
        });
        covidChecker.belongsTo(models.admin, {
            foreignKey: 'changed_admin_id',
            as: 'changed_admin'
        });
        covidChecker.belongsTo(models.user, {
            foreignKey: 'changed_user_id',
            as: 'changed_user'
        });
    };
    return covidChecker;
};