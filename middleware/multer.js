const multer = require("multer");

//set storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/product-images");
  },
  filename: function (req, file, cb) {
    //image.jpg
    let ext = file.originalname.substr(file.originalname.lastIndexOf("."));
    cb(null, file.fieldname+ "-" + Date.now() + ext);
  },
});

module.exports = store = multer({ storage: storage });
