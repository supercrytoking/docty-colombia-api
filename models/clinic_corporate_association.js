'use strict';
module.exports = (sequelize, DataTypes) => {
    const clinic_corporate_association = sequelize.define('clinic_corporate_association', {
        clinic_id: DataTypes.INTEGER,
        corporate_id: DataTypes.INTEGER,
        associated: DataTypes.BOOLEAN,
        synced: DataTypes.BOOLEAN
    }, {});
    clinic_corporate_association.associate = function(models) {
        clinic_corporate_association.belongsTo(models.user.scope('publicInfo'), {
            foreignKey: "clinic_id",
            as: "clinic",
        })
        clinic_corporate_association.belongsTo(models.user, {
            foreignKey: "corporate_id",
            as: "corporate",
        })
    };
    return clinic_corporate_association;
};