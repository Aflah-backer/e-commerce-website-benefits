const db = require("../config/connection");
const collection = require("../config/collections");
const bcrypt = require("bcrypt");
const objectId = require("mongodb").ObjectId;
const Razorpay = require("razorpay");
const { reject } = require("bcrypt/promises");
const { response } = require("../app");
const moment = require("moment");
require("dotenv").config();

let instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports = {
  signup: (req, res) => {
    res.render("users/user-signup");
  },

  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      const check = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ Email: userData.Email });
      if (check) {
        reject();
      } else {
        userData.Password = await bcrypt.hash(userData.Password, 10);
        userData.isBlocked = false;
        db.get()
          .collection(collection.USER_COLLECTION)
          .insertOne(userData)
          .then((data) => {
            resolve(data.insertedId);
          });
      }
    });
  },

  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let response = {};
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ Email: userData.Email, isBlocked: false });
      if (user) {
        bcrypt.compare(userData.Password, user.Password).then((status) => {
          if (status) {
            response.user = user;
            response.status = true;
            resolve(response);
          } else {
            resolve({ status: false });
          }
        });
      } else {
        resolve({ status: false });
      }
    });
  },

  getSortedproducts: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let products = await db
          .get()
          .collection(collection.PRODUCT_COLLECTION)
          .find()
          .sort({ createdDate: -1 })
          .limit(8)
          .toArray();
        resolve(products);
      } catch (error) {
        console.log(error);
      }
    });
  },

  getProductById: (id) => {
    return new Promise(async (res, rej) => {
      const product = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: objectId(id) });

      res(product);
    });
  },

  addToCart: (proId, userId) => {
    let proObj = {
      item: objectId(proId),
      proCount: 1,
    };
    return new Promise(async (resolve, reject) => {
      try {
        var userCart = await db
          .get()
          .collection(collection.CART_COLLECTION)
          .findOne({ user: objectId(userId) });
      } catch (err) {
        console.log(err);
      }

      if (userCart) {
        let proExist = userCart.products.findIndex(
          (product) => product.item == proId
        );
        if (proExist != -1) {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: objectId(userId), "products.item": objectId(proId) },
              {
                $inc: { "products.$.proCount": 1 },
              }
            )
            .then(() => {
              resolve();
            });
        } else {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: objectId(userId) },
              {
                $push: { products: proObj },
              }
            )
            .then((response) => {
              resolve();
            });
        }
      } else {
        let cartObj = {
          user: objectId(userId),
          products: [proObj],
        };
        db.get()
          .collection(collection.CART_COLLECTION)
          .insertOne(cartObj)
          .then((response) => {
            resolve();
          });
      }
    });
  },

  cartProduct: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let cartItems = await db
          .get()
          .collection(collection.CART_COLLECTION)
          .aggregate([
            {
              $match: { user: objectId(userId) },
            },
            {
              $unwind: "$products",
            },
            {
              $project: {
                item: "$products.item",
                proCount: "$products.proCount",
              },
            },
            {
              $lookup: {
                from: collection.PRODUCT_COLLECTION,
                localField: "item",
                foreignField: "_id",
                as: "product",
              },
            },
            {
              $project: {
                item: 1,
                proCount: 1,
                products: { $arrayElemAt: ["$product", 0] },
              },
            },
          ])
          .toArray();

        resolve(cartItems);
      } catch (error) {
        console.log(error);
      }
    });
  },

  getCartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count;
      let cart;
      try {
        count = 0;
        cart = await db
          .get()
          .collection(collection.CART_COLLECTION)
          .findOne({ user: objectId(userId) });
      } catch (err) {
        console.log(err);
      }
      if (cart) {
        count = cart.products.length;
      }
      resolve(count);
    });
  },

  deleteCartProduct: (details) => {
    console.log(true);
    return new Promise((resolve, reject) => {
      console.log(1234567890);
      db.get()
        .collection(collection.CART_COLLECTION)
        .updateOne(
          { _id: objectId(details.cart) },
          {
            $pull: { products: { item: objectId(details.product) } },
          }
        )
        .then((response) => {
          console.log(response);
          resolve({ removeProduct: true });
        });
    });
  },

  changeProductQuantity: (details) => {
    details.count = parseInt(details.count);
    details.proCount = parseInt(details.proCount);
    return new Promise((resolve, reject) => {
      if (details.count == -1 && details.proCount == 1) {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            { _id: objectId(details.cart) },
            {
              $pull: { products: { item: objectId(details.product) } },
            }
          )
          .then((response) => {
            resolve({ removeProduct: true });
          })
          .catch((error) => {
            next(error);
          });
      } else {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            {
              _id: objectId(details.cart),
              "products.item": objectId(details.product),
            },
            {
              $inc: { "products.$.proCount": details.count },
            }
          )
          .then((response) => {
            resolve(true);
          });
      }
    });
  },

  getTotalAmount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let total;
      try {
        total = await db
          .get()
          .collection(collection.CART_COLLECTION)
          .aggregate([
            {
              $match: { user: objectId(userId) },
            },
            {
              $unwind: "$products",
            },
            {
              $project: {
                item: "$products.item",
                proCount: "$products.proCount",
              },
            },
            {
              $lookup: {
                from: collection.PRODUCT_COLLECTION,
                localField: "item",
                foreignField: "_id",
                as: "product",
              },
            },
            {
              $project: {
                item: 1,
                proCount: 1,
                products: { $arrayElemAt: ["$product", 0] },
              },
            },

            {
              $group: {
                _id: null,
                total: {
                  $sum: { $multiply: ["$proCount", "$products.price"] },
                },
              },
            },
          ])
          .toArray();
        resolve(total[0].total);
      } catch (error) {
        console.log(error);
      }
    });
  },

  placeOrder: (order, products, total) => {
    return new Promise((resolve, reject) => {
      let dateIso = new Date();
      let date = moment(dateIso).format("YYYY/MM/DD");
      let time = moment(dateIso).format("HH:mm:ss");
      moment().format("MMMM Do YYYY, h:mm:ss a");
      moment(date).format("MM/DD/YYYY");
      const status = order["payment-method"] === "COD" ? "placed" : "pending";
      const orderObj = {
        deliveryDetails: {
          firstName: order.firstName,
          lastName: order.lastName,
          mobileNumber: order.mobileNumber,
          pincode: order.pincode,
          address: order.address,
        },
        userId: objectId(order.userId),
        paymentMethod: order["payment-method"],
        products: products,
        totalAmount: total,
        status: status,
        deliveryStatus: "Order Placed",
        date: date,
        time: time,
      };

      db.get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then((response) => {
          db.get()
            .collection(collection.CART_COLLECTION)
            .deleteOne({ user: objectId(order.userId) });
          for (i = 0; i < products.length; i++)
            db.get()
              .collection(collection.PRODUCT_COLLECTION)
              .updateOne(
                { _id: objectId(products[i].item) },
                {
                  $inc: { quantity: -products[i].proCount },
                }
              );
          resolve(response.insertedId);
        });
    });
  },

  placeOrderBuy: (order, product, total) => {
    let products = [{ item: new objectId(product._id), proCount: 1 }];
    return new Promise((resolve, reject) => {
      let dateIso = new Date();
      let date = moment(dateIso).format("YYYY/MM/DD");
      let time = moment(dateIso).format("HH:mm:ss");
      moment().format("MMMM Do YYYY, h:mm:ss a");
      moment(date).format("MM/DD/YYYY");
      const status = order["payment-method"] === "COD" ? "placed" : "pending";
      const orderObj = {
        deliveryDetails: {
          firstName: order.firstName,
          lastName: order.lastName,
          mobileNumber: order.mobileNumber,
          pincode: order.pincode,
          address: order.address,
        },
        userId: objectId(order.userId),
        paymentMethod: order["payment-method"],
        products: products,
        totalAmount: total,
        status: status,
        deliveryStatus: "Order Placed",
        date: date,
        time: time,
      };
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then((response) => {
          db.get()
            .collection(collection.PRODUCT_COLLECTION)
            .updateOne(
              { _id: objectId(products[0].item) },
              {
                $inc: { quantity: -1 },
              }
            );
          resolve(response.insertedId);
        });
    });
  },

  getCartProductList: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const cart = await db
          .get()
          .collection(collection.CART_COLLECTION)
          .findOne({ user: objectId(userId) });
        resolve(cart.products);
      } catch (error) {
        reject(error);
      }
    });
  },

  getOrders: (userId) => {
    return new Promise(async (resolve, reject) => {
      const orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { userId: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              time: "$time",
              date: "$date",
              deliveryStatus: "$deliveryStatus",
              totalAmount: "$totalAmount",
              item: "$products.item",
              paymentMethod: "$paymentMethod",
              status: "$status",
              deliveryDetails: "$deliveryDetails",
              proCount: "$products.proCount",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              time: 1,
              date: 1,
              status: 1,
              deliveryDetails: 1,
              deliveryStatus: 1,
              totalAmount: 1,
              proCount: 1,
              paymentMethod: 1,
              products: { $arrayElemAt: ["$product", 0] },
            },
          },
          {
            $sort: {
              date: -1,
            },
          },
        ])
        .toArray();
      resolve(orders);
    });
  },

  generateRazorpay: (orderId, total) => {
    return new Promise((resolve, reject) => {
      const options = {
        amount: total * 100,
        currency: "INR",
        receipt: "" + orderId,
      };
      instance.orders.create(options, (err, orders) => {
        if (err) {
          console.log(err);
        } else {
          resolve(orders);
        }
      });
    });
  },

  verifyPayment: (Details) =>
    new Promise((resolve, reject) => {
      const crypto = require("crypto");
      let hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);

      hmac.update(
        Details["payment[razorpay_order_id]"] +
          "|" +
          Details["payment[razorpay_payment_id]"]
      );
      hmac = hmac.digest("hex");
      if (hmac == Details["payment[razorpay_signature]"]) {
        resolve();
      } else {
        reject();
      }
    }),
  changePaymentStatus: (orderId) => {
    return new Promise((resolve, rejects) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(orderId) },
          {
            $set: {
              status: "placed",
            },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },

  addTowishList: (productId, userId) => {
    let proObj = {
      item: objectId(productId),
    };
    return new Promise(async (resolve, reject) => {
      try {
        let wishList = await db
          .get()
          .collection(collection.WISHLIST_COLLECTION)
          .findOne({ user: objectId(userId) });

        if (wishList) {
          let proExist = wishList.product.findIndex(
            (product) => product.item == productId
          );
          if (proExist != -1) {
            resolve();
          } else {
            await db
              .get()
              .collection(collection.WISHLIST_COLLECTION)
              .updateOne(
                { user: objectId(userId) },
                {
                  $push: { product: proObj },
                }
              );
            resolve({ status: true });
          }
        } else {
          let wishObj = {
            user: objectId(userId),
            product: [proObj],
          };
          await db
            .get()
            .collection(collection.WISHLIST_COLLECTION)
            .insertOne(wishObj)
            .then(() => {
              resolve({ status: true });
            });
        }
      } catch (error) {
        reject(error);
      }
    });
  },

  getWishlistProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const products = await db
          .get()
          .collection(collection.WISHLIST_COLLECTION)
          .aggregate([
            {
              $match: {
                user: new objectId(userId),
              },
            },
            {
              $unwind: {
                path: "$product",
              },
            },
            {
              $lookup: {
                from: collection.PRODUCT_COLLECTION,
                localField: "product.item",
                foreignField: "_id",
                as: "product",
              },
            },
            {
              $unwind: {
                path: "$product",
              },
            },
          ])
          .toArray();
        resolve(products);
      } catch (error) {
        reject(error);
      }
    });
  },

  deleteWishProduct: (details) => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await db
          .get()
          .collection(collection.WISHLIST_COLLECTION)
          .updateOne(
            { _id: objectId(details.wishList) },
            {
              $pull: { product: { item: objectId(details.product) } },
            }
          );

        resolve({ removeProduct: true });
      } catch (error) {
        reject(error);
      }
    });
  },

  getProfile: (userId, data) => {
    return new Promise(async (resolve, reject) => {
      try {
        const reponse = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .updateOne(
            { _id: objectId(userId) },
            {
              $set: {
                Name: data.Name,
                Email: data.Email,
                MobNumber: data.MobNumber,
              },
            }
          );
        console.log(response);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },

  getAllproducts: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const products = await db
          .get()
          .collection(collection.PRODUCT_COLLECTION)
          .find()
          .sort({ createdDate: -1 })
          .toArray();
        resolve(products);
      } catch (error) {
        reject(error);
      }
    });
  },

  getWishCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count;
      let wishList;
      try {
        count = 0;
        wishList = await db
          .get()
          .collection(collection.WISHLIST_COLLECTION)
          .findOne({ user: objectId(userId) });
      } catch (err) {
        console.log(err);
      }
      if (wishList) {
        count = wishList.product.length;
      }
      resolve(count);
    });
  },

  getAllCategory: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const category = await db
          .get()
          .collection(collection.CATEGORY_COLLECTION)
          .find()
          .toArray();
        resolve(category);
      } catch (error) {
        reject(error);
      }
    });
  },

  filterProducts: (filter, price) => {
    try {
      return new Promise(async (resolve, reject) => {
        if (filter.length > 1) {
          let filterProducts = await db
            .get()
            .collection(collection.PRODUCT_COLLECTION)
            .aggregate([
              {
                $match: {
                  $or: filter,
                },
              },
              {
                $match: {
                  price: { $lt: price },
                },
              },
            ])
            .toArray();
          resolve(filterProducts);
        } else {
          let filterProducts = db
            .get()
            .collection(collection.PRODUCT_COLLECTION)
            .aggregate([
              {
                $match: {
                  price: { $lt: price },
                },
              },
            ])
            .toArray();
          resolve(filterProducts);
        }
      });
    } catch (error) {
      reject(error);
    }
  },

  buyNow: (proId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const buy = await db
          .get()
          .collection(collection.PRODUCT_COLLECTION)
          .findOne({ _id: objectId(proId) });
        resolve(buy);
      } catch (error) {
        reject(error);
      }
    });
  },

  isBlocked: (user) => {
    let status = {};
    return new Promise(async (resolve, reject) => {
      const isBlocked = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: objectId(user), isBlocked: true });
      if (isBlocked) {
        status.blocked = true;
        resolve(status);
      } else {
        status.blocked = false;
        resolve(status);
      }
    });
  },

  searchProducts: (search) => {
    console.log(search);
    return new Promise(async (resolve, reject) => {
      try {
        let products = await db
          .get()
          .collection(collection.PRODUCT_COLLECTION)
          .find({
            $or: [
              {
                title: { $regex: search, $options: "i" },
              },
              {
                category: { $regex: search, $options: "i" },
              },
            ],
          })
          .toArray();
        console.log(products);
        resolve(products);
      } catch (error) {
        reject(error);
      }
    });
  },

  checkEmail: (email) => {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .findOne({ Email: email, isBlocked: false });
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  },

  setNewPassword: (userId, password) => {
    return new Promise(async (resolve, reject) => {
      try {
        const newPassword = await bcrypt.hash(password, 10);
        console.log(newPassword);
        user = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .updateOne(
            { _id: objectId(userId) },
            { $set: { Password: newPassword } }
          );
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },

  getBrands: () => {
    return new Promise(async (resolve, reject) => {
      const brand = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .aggregate([
          {
            $group: {
              _id: {
                brand: "$brand",
              },
            },
          },
        ])
        .toArray();
      resolve(brand);
    });
  },

  getAddress: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const address = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $match: {
                userId: new objectId(userId),
              },
            },
            {
              $project: {
                address: "$deliveryDetails",
                date: "$date",
              },
            },
            {
              $sort: {
                date: -1,
              },
            },
          ])
          .limit(1)
          .toArray();
        console.log(address);
        resolve(address);
      } catch (error) {
        reject(error);
      }
    });
  },
};
