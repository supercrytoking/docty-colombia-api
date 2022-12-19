'use strict';
module.exports = (sequelize, DataTypes) => {
    let expiredAt = new Date();
    const minuts = expiredAt.getHours();
    let expitedAt1 = new Date(expiredAt.setHours(minuts + 2000));
    const token = sequelize.define('admin_token', {
        userId: {
            type: DataTypes.INTEGER,
            references: {
                model: 'users',
                referencesKey: 'id'
            }
        },
        token: DataTypes.STRING,
        expiredAt: { type: DataTypes.DATE, allowNull: true, defaultValue: expitedAt1 },
    }, {
        underscored: true,
        timestamps: true,
        expiredAt: true,
        // freezeTableName: true
    });
    token.associate = function (models) {
        // associations can be defined here
        //otp
    };
    return token;
};