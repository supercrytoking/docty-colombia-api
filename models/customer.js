'use strict';
module.exports = (sequelize, DataTypes) => {
    const customer = sequelize.define('customer', {
        user_id: DataTypes.INTEGER, // clinic
        customer: DataTypes.INTEGER, // patient
        ips_code: DataTypes.STRING, // patient
        type: DataTypes.STRING, // patient
        syncId: DataTypes.STRING,
        tags: DataTypes.JSON,
        family_access: DataTypes.BOOLEAN,
        location_id: {
            type: DataTypes.INTEGER,
            defaultValue: null
        }
    }, {
        defaultScope: {
            attributes: { exclude: ['createdAt', 'updatedAt', 'syncId', 'type'] },
            include: [
                'company',
                // 'location_info'
            ]
        }
    });
    customer.associate = function(models) {
        // associations can be defined here
        customer.belongsTo(models.user, {
            foreignKey: 'user_id',
            as: 'user'
        });
        customer.belongsTo(models.user, {
            foreignKey: 'customer',
            as: 'employee'
        });
        customer.belongsTo(models.userFamilyView, {
            foreignKey: 'customer',
            sourseKey: 'parent',
            as: 'familyHead'
        });
        customer.belongsTo(models.user.scope('publicCompanyInfo'), {
            foreignKey: 'user_id',
            as: 'company'
        });
        customer.belongsTo(models.location.scope('shortInfo'), {
            foreignKey: 'location_id',
            as: 'location_info'
        });
    };
    return customer;
};