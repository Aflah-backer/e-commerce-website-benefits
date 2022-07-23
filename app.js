const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const userRouter = require("./routes/user");
const adminRouter = require("./routes/admin");
const hbs = require("express-handlebars");
const app = express();
const nocache = require("nocache");
const dotenv = require("dotenv");
dotenv.config();
// const fileUpload = require("express-fileupload");
const db = require("./config/connection");
const session = require("express-session");

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");
app.engine(
  "hbs",
  hbs.engine({
    extname: "hbs",
    defaultLayout: "layout",
    layoutsDir: __dirname + "/views/layout/",
    partialsDir: __dirname + "/views/partials",
  })
);

app.use(nocache());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(session({ secret: "key", cookie: { maxAge: 60000000 } }));
db.connect((err) => {
  if (err) console.log("connection Error" + err);
  else console.log("conneted to port 3000");
});
// app.use(fileUpload());
app.use("/", userRouter);
app.use("/admin", adminRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  res.render("error/404");
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  // res.locals.message = err.message;
  // res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  console.log(err);
  res.render("error/500");
});

module.exports = app;
