'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
var sequelizeTransforms = require('sequelize-transforms');
const env = process.env.NODE_ENV || 'mysqlConfig';//"clustured";//
// const env = "mysqlConfig";
const config = require(__dirname + '/../config/config.json')[env];
const db = {};
let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env.db_connection_string);
} 
else if (env === "production") {
  sequelize = new Sequelize(config.database, config.username, config.password,
    {
      // host: 'docty-ecuador-prod.cluster-ro-cvpqhk0vnc1l.us-east-2.rds.amazonaws.com',
      host: config.replication.write.host,
      username: config.replication.write.username,
      password: config.replication.write.password,
      dialect: "mysql",
      ssl:true,
      dialectOptions:{
         ssl:{
            require:true,
            cert: fs.readFileSync('./cert/us-east-2-bundle.pem'),
            rejectUnauthorized: false
         }
      }

    },
     config);
}
 else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach(file => {
    const model = sequelize['import'](path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});
sequelizeTransforms(sequelize);
db.sequelize = sequelize;
db.Sequelize = Sequelize;


db.queryRun = async function queryRun(sql) {
  return new Promise((resolve, reject) => {
    db.sequelize.query(sql).spread((queryResult) => {
      queryResult = JSON.parse(JSON.stringify(queryResult));
      // console.log(queryResult)
      // if (queryResult && queryResult[0] && queryResult[0].total) {
      //   service.price = queryResult[0].total;
      //   console.log(service.price)
      // }
      resolve(queryResult)
    }).catch(err => {
      reject(err);
    });
  })
}

module.exports = db;
