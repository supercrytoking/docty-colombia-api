'use strict';
module.exports = (sequelize, DataTypes) => {
    const associate = sequelize.define('associate', {
        associate: DataTypes.INTEGER,
        user_id: DataTypes.INTEGER,
        admin_id: DataTypes.INTEGER,
        syncId: DataTypes.STRING,
        inNetworks: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
        defaultScope: {
            include: ['user'],
            attributes: { exclude: ['createdAt', 'updatedAt', 'syncId'] }
        },
        scopes: {
            withoutUser: {
                attributes: { exclude: ['createdAt', 'updatedAt', 'syncId'] }
            }
        },
        hooks: {
            beforeCreate: async function(instance, options) {
                if (instance.user_id) {
                    let sq = `select json_data from usermeta where user_id = ${instance.user_id} and "key" = 'networkVisibility'`;
                    sq = sq.replace(/\"/g, '`');
                    let d = await sequelize.query(sq).spread((r, m) => r);
                    instance.inNetworks = !!instance.inNetworks;
                    if (!!d && !!d.length) {
                        let f = d[0] || {};
                        if (!!f.json_data && !!f.json_data.statffCloseEnvironment) {
                            instance.inNetworks = true;
                        }
                    }
                }
            },
            beforeUpdate: async function(instance, options) {
                if (instance.user_id) {
                    let sq = `select json_data from usermeta where user_id = ${instance.user_id} and "key" = 'networkVisibility'`;
                    sq = sq.replace(/\"/g, '`');
                    let d = await sequelize.query(sq).spread((r, m) => r);
                    instance.inNetworks = !!instance.inNetworks;
                    if (!!d && !!d.length) {
                        let f = d[0] || {};
                        if (!!f.json_data && !!f.json_data.statffCloseEnvironment) {
                            instance.inNetworks = true;
                        }
                    }
                }
            }
        }
    });
    associate.associate = function(models) {
        // associations can be defined here
        associate.belongsTo(models.admin, {
            foreignKey: 'admin_id',
            as: 'admin'
        });
        associate.hasMany(models.company_service, {
            foreignKey: 'user_id',
            as: 'company_service',
            sourceKey: 'user_id',
        });
        associate.belongsTo(models.user.scope('publicInfo'), {
            foreignKey: 'user_id',
            as: 'user'
        });
        associate.belongsTo(models.user.scope('publicInfo'), {
            foreignKey: 'associate',
            as: 'staff'
        });
    };
    return associate;
};