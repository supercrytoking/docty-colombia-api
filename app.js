var createError = require('http-errors');
var express = require('express');
var cors = require('cors');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cron = require("node-cron");
require('dotenv').config();
//var Router = require('./routes/routes');

var indexRouter = require('./index');
var interOp = require('./interOperability/routes/index');

var app = express();
app.use(cors(
  {
    exposedHeaders: "o_token,auth-token,apiKey"
  }
));

// view engine setup
//app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  const lang = req.headers.lang || 'en';
  req.lang = lang;
  return next();
});
app.use('/public', express.static('public'));
app.get('/', (req, res) => {
  res.render('index', { title: 'Docty API' });
});
app.use('/v1', interOp);
app.use('/api', indexRouter);

// cron.schedule("*/2 * * * *", require('./scripts/familyMigrate').getUsers);

// catch 404 and forwarsds to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error panpm ge
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
