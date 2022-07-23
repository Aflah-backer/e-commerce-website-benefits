const express = require("express");
const router = express.Router();
const userHelpers = require("../helpers/user-helpers");
const otpHelper = require("../helpers/otpHelper");
const { redirect } = require("express/lib/response");
const async = require("hbs/lib/async");
let productss;

const verifyLogin = async (req, res, next) => {
  if (req.session.loggedIn) {
    const user = req.session.user._id;
    const userBlocked = await userHelpers.isBlocked(user);
    if (userBlocked.blocked) {
      req.session.loggedIn = false;
      res.redirect("/login");
    }
    next();
  } else {
    res.redirect("/login");
  }
};
/* GET home page. */
router.get("/", async (req, res, next) => {
  try {
    const logged = req.session.user;
    let cartCount = null;
    let wishList = null;
    if (req.session.user) {
      const promiseAll = await Promise.all([
        userHelpers.getWishCount(req.session.user._id),
        userHelpers.getCartCount(req.session.user._id),
      ]);
      wishList = promiseAll[0];
      cartCount = promiseAll[1];
    }
    let products = await userHelpers.getSortedproducts();
    let out;
    for (i = 0; i < products.length; i++) {
      products[i].out = products[i].quantity < 1;
    }
    res.render("users/index", {
      user: true,
      logged,
      products,
      cartCount,
      wishList,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/signup", userHelpers.signup);

router.post("/signup", (req, res) => {
  const { Email, MobNumber } = req.body;
  req.session.number = MobNumber;
  req.session.email = Email;
  req.session.whole = req.body;
  otpHelper
    .makeOtp(MobNumber)
    .then((verification) => console.log(verification));
  res.render("users/verify", { whole: req.session.whole });
});

router.post("/verify", (req, res) => {
  let { otp } = req.body;
  otp = otp.join("");
  const phNumber = req.session.number;
  otpHelper.verifyOtp(otp, phNumber).then((verifcation_check) => {
    if (verifcation_check.status == "approved") {
      req.session.checkstatus = true;
      userHelpers
        .doSignup(req.session.whole)
        .then((response) => {
          res.redirect("/login");
        })
        .catch(() => {
          req.session.alreadyexist = true;
          res.redirect("/signup");
        });
    } else {
      res.redirect("/signup");
    }
  });
});

router.get("/login", (req, res) => {
  if (req.session.loggedIn) {
    res.redirect("/");
  } else {
    res.render("users/user-login", { loginErr: req.session.loginErr });
    req.session.loginErr = false;
  }
});

router.post("/login", (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.user = response.user;
      req.session.loggedIn = true;
      res.redirect("/");
    } else {
      req.session.loginErr = "wrong username or password";
      res.redirect("/login");
    }
  });
});

router.get("/logout", (req, res) => {
  (req.session.user = null),
    (req.session.loggedIn = null),
    res.redirect("/login");
});

router.get("/cart", verifyLogin, async (req, res, next) => {
  try {
    const products = await userHelpers.cartProduct(req.session.user._id);
    if (products.length != 0) {
      const total = await userHelpers.getTotalAmount(req.session.user._id);
      const logged = req.session.user;

      res.render("users/cart", { user: true, logged, products, total });
    } else {
      const logged = req.session.user;
      res.render("users/empty_cart", { user: true, logged });
    }
  } catch (error) {
    next(error);
  }
});

router.post("/remove_product", (req, res, next) => {
  userHelpers
    .deleteCartProduct(req.body)
    .then((response) => {
      res.json(response);
    })
    .catch((error) => {
      next(error);
    });
});

router.get("/add-to-cart/:id", verifyLogin, (req, res, next) => {
  userHelpers
    .addToCart(req.params.id, req.session.user._id)
    .then(() => {
      res.redirect("/cart");
    })
    .catch((error) => {
      next(error);
    });
});

router.post("/change-product-proCout", (req, res, next) => {
  userHelpers.changeProductQuantity(req.body).then((response) => {
    res.json(response);
  });
});

router.get("/place_order/:id", verifyLogin, async (req, res, next) => {
  try {
    console.log(req.params.id);
    const params = req.params.id;
    if ("buyNow" === params) {
      req.session.status = true;
      const logged = req.session.user;
      const address = await userHelpers.getAddress(logged._id);
      const product = req.session.buyProduct;
      let total = product.price;
      console.log(address);
      res.render("users/place_order", {
        logged,
        user: true,
        address,
        total,
        status: true,
      });
    } else {
      req.session.status = false;
      const logged = req.session.user;
      const all = await Promise.all([
        userHelpers.getOrders(logged._id),
        userHelpers.getTotalAmount(logged._id),
      ]);
      res.render("users/place_order", {
        logged,
        total: all[1],
        user: true,
        address: all[0],
      });
    }
  } catch (error) {
    next(error);
  }
});

router.post("/place_order", verifyLogin, async (req, res, next) => {
  try {
    if (req.session.status) {
      const product = req.session.buyProduct;
      const total = product.price;
      const orderId = await userHelpers.placeOrderBuy(req.body, product, total);
      console.log();
      if (req.body["payment-method"] === "COD") {
        res.json({ codSuccess: true });
      } else {
        userHelpers.generateRazorpay(orderId, total).then((response) => {
          res.json(response);
        });
      }
    } else {
      let results = await Promise.all([
        userHelpers.getCartProductList(req.body.userId),
        userHelpers.getTotalAmount(req.body.userId),
      ]);
      const orderId = await userHelpers.placeOrder(
        req.body,
        results[0],
        results[1]
      );

      if (req.body["payment-method"] === "COD") {
        res.json({ codSuccess: true });
      } else {
        userHelpers.generateRazorpay(orderId, results[1]).then((response) => {
          res.json(response);
        });
      }
    }
  } catch (error) {
    next(error);
  }
});

router.post("/verify_payment", (req, res, next) => {
  userHelpers
    .verifyPayment(req.body)
    .then(() => {
      userHelpers.changePaymentStatus(req.body["order[receipt]"]).then(() => {
        res.json({ status: true });
      });
    })
    .catch((error) => {
      console.log(error);
      next(error);
      res.json({ status: false, errMsg: "" });
    });
});

router.get("/order_success", verifyLogin, async (req, res) => {
  let logged = req.session.user;
  const orders = await userHelpers.getOrders(req.session.user._id);
  res.render("users/order_success", { user: true, logged, orders });
});

router.get("/orders", verifyLogin, async (req, res, next) => {
  try {
    const logged = req.session.user;
    const orders = await userHelpers.getOrders(logged._id);
    console.log(orders);
    if (orders.length != 0) {
      res.render("users/orders", {
        logged,
        user: true,
        orders,
      });
    } else {
      const logged = req.session.user;
      res.render("users/empty_orders", { user: true, logged });
    }
  } catch (error) {
    next(error);
  }
});

router.get("/view-single-orders/:id", verifyLogin, async (req, res) => {
  try {
    console.log(req.params.id);
    const logged = req.session.user;
    res.render("users/view_single_orders", { user: true, logged });
  } catch (error) {
    next(error);
  }
});

router.get("/wishlist", verifyLogin, async (req, res, next) => {
  const logged = req.session.user;
  try {
    const products = await userHelpers.getWishlistProducts(
      req.session.user._id
    );
    if (products.length != 0) {
      console.log(products.length);
      let out;
      for (i = 0; i < products.length; i++) {
        products[i].product.out = products[i].product.quantity < 1;
        res.render("users/wishList", { user: true, logged, products });
      }
    } else {
      const logged = req.session.user;
      res.render("users/empty_orders", { user: true, logged });
    }
  } catch (error) {
    next(error);
  }
});

router.get("/addToWishList/:id", verifyLogin, async (req, res, next) => {
  try {
    const status = await userHelpers.addTowishList(
      req.params.id,
      req.session.user._id
    );
    if (status) {
      res.json({ added: true });
    } else {
      res.json({ exist: true });
    }
  } catch (error) {
    next(error);
  }
});

router.post("/remove_wishPro", (req, res, next) => {
  userHelpers
    .deleteWishProduct(req.body)
    .then((response) => {
      res.json(response);
    })
    .catch((error) => {
      next(error);
    });
});

router.get("/viewSingleProductDetails/:id", (req, res, next) => {
  userHelpers
    .getProductById(req.params.id)
    .then((products) => {
      const logged = req.session.user;
      let out;
      products.out = products.quantity < 1;
      res.render("users/view-single-product", {
        user: true,
        products,
        logged,
      });
    })
    .catch((error) => {
      next(error);
    });
});

router.post("/edit_profile/:id", (req, res, next) => {
  try {
    const profile = userHelpers.getProfile(req.params.id, req.body);
    res.redirect("/");
  } catch (err) {
    next(err);
  }
});

router.get("/about", (req, res) => {
  const logged = req.session.user;
  res.render("users/about", { user: true, logged });
});

router.get("/contactUs", (req, res) => {
  const logged = req.session.user;
  res.render("users/contactUs", { user: true, logged });
});

router.get("/shop", async (req, res) => {
  let products = await userHelpers.getAllproducts();
  if (products) {
    productss = products;
  }
  res.redirect("/shope");
});

router.post("/products/filter", async (req, res, next) => {
  try {
    const detail = req.body;
    const price = parseInt(detail.price);
    const filter = [];
    for (const i of detail.categoryName) {
      filter.push({ category: i });
    }
    productss = await userHelpers.filterProducts(filter, price);
    res.json(productss);
  } catch (error) {
    next(error);
  }
});

router.get("/shope", async (req, res) => {
  let logged = req.session.user;
  // let all = null;
  let cartCount = null;
  let wishList = null;
  if (logged) {
    cartCount = await userHelpers.getCartCount(logged._id);
    wishList = await userHelpers.getWishCount(logged._id);
  }
  let out;
  for (i = 0; i < productss.length; i++) {
    productss[i].out = productss[i].quantity < 1;
  }
  const category = await userHelpers.getAllCategory();
  res.render("users/shop", {
    user: true,
    logged,
    cartCount,
    productss,
    wishList,
    category,
  });
});

router.get("/buy-now/:id", verifyLogin, async (req, res, next) => {
  try {
    const response = await userHelpers.buyNow(req.params.id);
    req.session.buyProduct = response;
    res.redirect("/place_order/buyNow");
  } catch (error) {
    next(error);
  }
});

router.post("/searchProduct", async (req, res, next) => {
  try {
    let searchProduct = await userHelpers.searchProducts(req.body.key);
    productss = searchProduct;
    res.redirect("/shope");
  } catch (error) {
    next(error);
  }
});

router.get("/forgotPassword", (req, res) => {
  res.render("users/forgotPassword", { emailError: req.session.emailError });
  req.session.emailError = false;
});

router.post("/forgotPassword", async (req, res, next) => {
  try {
    const email = await userHelpers.checkEmail(req.body.email);
    if (email == null) {
      req.session.emailError = true;
      res.redirect("/forgotPassword");
    } else {
      req.session.setOtp = email;
      otpHelper
        .makeOtp(email.MobNumber)
        .then((verification) => console.log(verification));
      res.render("users/reVerify", { phoneNumber: email });
    }
  } catch (error) {
    next(error);
  }
});

router.post("/reVerify", (req, res) => {
  let { otp } = req.body;
  otp = otp.join("");
  let number = req.session.setOtp;
  otpHelper.verifyOtp(otp, number.MobNumber).then((verifcation_check) => {
    if (verifcation_check.status == "approved") {
      req.session.checkstatus = true;
      res.render("users/reSetPassword");
    } else {
      redirect("/forgotPassword");
    }
  });
});

router.post("/reSetPassword", async (req, res, next) => {
  try {
    console.log(req.body);
    console.log(req.session.setOtp._id, "what is this");
    const result = await userHelpers.setNewPassword(
      req.session.setOtp._id,
      req.body.password
    );
    res.redirect("/login");
  } catch (error) {
    next(error);
  }
});

module.exports = router;
