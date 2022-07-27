const express = require("express");
const router = express.Router();
const store = require("../middleware/multer");
const adminHelper = require("../helpers/admin-helpers");
const async = require("hbs/lib/async");
// const objectId = require("mongodb").ObjectId;

const verifyAdmin = (req, res, next) => {
  if (req.session.admin) {
    next();
  } else {
    res.redirect("/admin");
  }
};

/* GET users listing. */
router.get("/", async (req, res, next) => {
  if (req.session.admin) {
    res.redirect("/admin/dashboard");
  } else {
    res.render("admins/admin-login", {
      admin: false,
      loginErr: req.session.loginErr,
    });
    req.session.loginErr = false;
  }
});

router.post("/adminlogin", async (req, res, next) => {
  try {
    let response = await adminHelper.Adologin(req.body);
    if (response.status) {
      req.session.admi = response.admi;
      req.session.admin = true;

      res.redirect("/admin/dashboard");
    } else {
      req.session.loginErr = "Wrong Email or Password";
      res.redirect("/admin");
    }
  } catch (error) {
    next(error);
  }
});

router.get("/dashboard", verifyAdmin, async (req, res, next) => {
  try {
    const all = await Promise.all([
      adminHelper.getTotalRevenue(),
      adminHelper.getTotalSale(),
      adminHelper.getTotalUsers(),
      adminHelper.getAllActiveUsers(),
      adminHelper.getPaymentStatus(),
      adminHelper.getDeliveryStatus(),
      adminHelper.getRecentSale(),
    ]);
    const Alogged = req.session.admin;
    const [totalActiveUser] = all[3];
    res.render("admins/dashboard", {
      Alogged,
      admin: true,
      totalRevenue: all[0],
      totalSale: all[1],
      totalUsers: all[2],
      activeUsers: totalActiveUser.false,
      paymentStatus: all[4],
      deliveryStatus: all[5],
      recentSale: all[6],
    });
  } catch (error) {
    next(error);
  }
});

router.get("/adminLogout", (req, res) => {
  req.session.admin = null;
  res.redirect("/admin");
});

router.get("/addProducts", verifyAdmin, async (req, res, next) => {
  try {
    let category = await adminHelper.getAllCategory();
    res.render("admins/add-product", { admin: true, category });
  } catch (error) {
    next(error);
  }
});

router.get("/viewproducts", verifyAdmin, (req, res, next) => {
  const { admin } = req.session;
  adminHelper
    .getAllProducts()
    .then((products) => {
      res.render("admins/view-products", { admin, products });
    })
    .catch((error) => {
      next(error);
    });
});

router.post("/add-products", store.array("image", 4), (req, res) => {
  const files = req.files;
  if (!files) {
    const error = new Error("Please choose files");
    error.httpStatus = 400;
    return next(error);
  }
  adminHelper
    .productUpload(req.body, files)
    .then((status) => {
      req.session.admin = true;
      res.redirect("/admin/viewproducts");
    })
    .catch((error) => {});
});

router.get("/editProducts/:id", verifyAdmin, async (req, res) => {
  try {
    const all = await Promise.all([
      adminHelper.getProductsDetails(req.params.id),
      adminHelper.getAllCategory(),
    ]);
    res.render("admins/edit-product", {
      admin: true,
      product: all[0],
      category: all[1],
    });
  } catch (error) {
    next(error);
  }
});

router.post("/editProducts/:id", store.array("image", 4), (req, res, next) => {
  const files = req.files;
  if (!files) {
    const error = new Error("Please choose files");
    error.httpStatus = 400;
    return next(error);
  }
  adminHelper
    .updateProduct(req.params.id, req.body, files)
    .then(() => {
      req.session.admin = true;
      res.redirect("/admin/viewproducts");
    })
    .catch((error) => {
      next(error);
    });
});

router.get("/delete-product/:id", verifyAdmin, (req, res, next) => {
  let proId = req.params.id;
  adminHelper
    .deleteProduct(proId)
    .then((response) => {
      res.redirect("/admin/viewproducts");
    })
    .catch((error) => {
      next(error);
    });
});

router.get("/category", verifyAdmin, async (req, res, next) => {
  try {
    let categorys = await adminHelper.getAllCategory();
    res.render("admins/category", { admin: true, categorys });
  } catch (error) {
    next(error);
  }
});

router.post("/addCategory", async (req, res, next) => {
  try {
    const category = await adminHelper.addCategory(req.body);
    res.redirect("/admin/category");
  } catch (error) {
    next(error);
  }
});

router.get("/viewUser", verifyAdmin, (req, res, next) => {
  adminHelper
    .getAllUsers()
    .then((users) => {
      res.render("admins/view-users", { admin: true, users });
    })
    .catch((error) => {
      next(error);
    });
});

router.post("/userAction", async (req, res, next) => {
  try {
    if (req.body.action == "block") {
      const response = await adminHelper.block(req.body.userId);
      res.json(response);
    } else {
      const response = await adminHelper.unBlock(req.body.userId);
      res.json(response);
    }
  } catch (error) {
    next(error);
  }
});

router.get("/viewOrders", verifyAdmin, async (req, res, next) => {
  try {
    let orders = await adminHelper.getAllOrders();
    res.render("admins/viewOrders", { admin: true, orders });
  } catch (error) {
    next(error);
  }
});

router.get("/productDetails/:id", verifyAdmin, async (req, res, next) => {
  try {
    let products = await adminHelper.getOrderProducts(req.params.id);
  } catch (error) {
    next(error);
  }
  res.render("admins/view_order_products", { products, admin: true });
});

router.post("/changeDeliveryStatus",verifyAdmin, async (req, res, next) => {
  console.log(req.body);
  try {
    const response = await adminHelper.changeDeliveryStatus(req.body);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get("/delete-category/:id",verifyAdmin, async (req, res, next) => {
  try {
    const category = await adminHelper.deleteCategory(req.params.id);
    res.redirect("/admin/category");
  } catch (error) {
    next(error);
  }
});
module.exports = router;
