const db = require("../config/connection");
const collection = require("../config/collections");
const bcrypt = require("bcrypt");
const { reject } = require("bcrypt/promises");
const objectId = require("mongodb").ObjectId;


// const store = require("../middleware/multer");

module.exports = {
  Adologin: (adminData) => {
    return new Promise(async (resolve, reject) => {
      try {
        let response = {};
        let admi = await db
          .get()
          .collection(collection.ADMIN_COLLECTION)
          .findOne({ Email: adminData.Email });
        if (admi) {
          bcrypt.compare(adminData.Password, admi.Password).then((status) => {
            if (status) {
              response.admi = admi;
              response.status = true;
              resolve(response);
            } else {
              resolve({ status: false });
            }
          });
        } else {
          resolve({ status: false });
        }
      } catch (error) {
        reject(error);
      }
    });
  },

  getAllProducts: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let products = await db
          .get()
          .collection(collection.PRODUCT_COLLECTION)
          .find()
          .toArray();
        resolve(products);
      } catch (error) {
        reject(error);
      }
    });
  },

  index: (req, res) => {
    if (req.session.admin) {
      res.render("admins/add-product", { admin: true });
    } else {
      res.redirect("/admin");
    }
  },

  deleteProduct: (proId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await db
          .get()
          .collection(collection.PRODUCT_COLLECTION)
          .deleteOne({ _id: objectId(proId) });
        resolve(response);
      } catch (error) {
        reject(error);
      }
    });
  },

  productUpload: (proData, imagesData) => {
    return new Promise(async (resolve, reject) => {
      let products = {
        _id: new objectId(),
        title: proData.title,
        brand: proData.brand,
        category: proData.category,
        price: Number(proData.price),
        quantity: Number(proData.quantity),
        product_description: proData.product_description,
        createdDate: new Date(),
        images: imagesData,
      };

      await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .insertOne(products)
        .then((status) => {
          if (status) {
            resolve(status);
          } else {
            reject(error);
          }
        });
    });
  },

  getAllUsers: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let users = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .find()
          .toArray();
        resolve(users);
      } catch (error) {
        reject(error);
      }
    });
  },

  getProductsDetails: (proId, id) => {
    return new Promise(async (resolve, reject) => {
      try {
        const product = await db
          .get()
          .collection(collection.PRODUCT_COLLECTION)
          .findOne({ _id: objectId(proId) });
        resolve(product);
      } catch (error) {
        reject(error);
      }
    });
  },

  addCategory: (cat) => {
    return new Promise(async (resolve, reject) => {
      try {
        let category = await db
          .get()
          .collection(collection.CATEGORY_COLLECTION)
          .insertOne(cat);
        resolve(category);
      } catch (error) {
        reject(error);
      }
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

  updateProduct: (proId, proDetails, imagesData) => {
    console.log(proDetails);
    return new Promise(async (resolve, reject) => {
      try {
        const response = await db
          .get()
          .collection(collection.PRODUCT_COLLECTION)
          .updateOne(
            { _id: objectId(proId) },
            {
              $set: {
                title: proDetails.title,
                brand: proDetails.brand,
                category: proDetails.category,
                price: Number(proDetails.price),
                quantity: Number(proDetails.quantity),
                product_description: proDetails.product_description,
                images: imagesData,
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

  deleteUser: (useId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .deleteOne({ _id: objectId(useId) });
        resolve(response);
      } catch (error) {
        reject(error);
      }
    });
  },

  block: (userid) =>
    new Promise(async (resolve) => {
      try {
        const response = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .updateOne({ _id: objectId(userid) }, { $set: { isBlocked: true } });
        resolve(response);
      } catch (error) {
        reject(error);
      }
    }),

  unBlock: (userId) =>
    new Promise(async (resolve) => {
      try {
        const response = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .updateOne({ _id: objectId(userId) }, { $set: { isBlocked: false } });
        resolve(response);
      } catch (error) {
        reject(error);
      }
    }),

  getAllOrders: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let result = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $lookup: {
                from: collection.USER_COLLECTION,
                localField: "userId",
                foreignField: "_id",
                as: "user",
              },
            },
            {
              $unwind: {
                path: "$user",
              },
            },
            {
              $lookup: {
                from: collection.PRODUCT_COLLECTION,
                localField: "products.item",
                foreignField: "_id",
                as: "product",
              },
            },
            {
              $unwind: {
                path: "$product",
              },
            },
            {
              $sort: {
                date: -1,
              },
            },
          ])
          .toArray();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  },

  changeDeliveryStatus: (delivery, orderId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const deliveryStatus = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .updateOne(
            { _id: objectId(orderId) },
            {
              $set: {
                deliveryStatus: delivery,
              },
            }
          );
        resolve(deliveryStatus);
      } catch (error) {
        reject(error);
      }
    });
  },

  deleteCategory: (categoryId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const removedCategory = await db
          .get()
          .collection(collection.CATEGORY_COLLECTION)
          .deleteOne({ _id: objectId(categoryId) });
        resolve(removedCategory);
        console.log(removedCategory);
      } catch (error) {
        reject(error);
      }
    });
  },

  getTotalRevenue: () => {
    return new Promise(async (resolve, reject) => {
      const revenue = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              deliveryStatus: "delivered",
            },
          },
          {
            $group: {
              _id: null,
              totalAmount: {
                $sum: "$totalAmount",
              },
            },
          },
        ])
        .toArray();
      resolve(revenue);
    });
  },

  getTotalSale: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const totalSale = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $group: {
                _id: null,
                totalAmount: {
                  $sum: "$totalAmount",
                },
              },
            },
          ])
          .toArray();
        resolve(totalSale);
      } catch (error) {
        reject(error);
      }
    });
  },
  
  getAllActiveUsers: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const totalUsers = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .aggregate([
            {
              $match: {
                isBlocked: false,
              },
            },
            {
              $count: "false",
            },
          ])
          .toArray();
        resolve(totalUsers);
      } catch (error) {
        reject(error);
      }
    });
  },

  getTotalUsers: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const totalActiveUsers = await db
          .get()
          .collection(collection.USER_COLLECTION)
          .count();
        resolve(totalActiveUsers);
      } catch (error) {
        reject(error);
      }
    });
  },

  getPaymentStatus: () => {
    const result = [];
    return new Promise(async (resolve, reject) => {
      try {
        const cod = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $match: {
                paymentMethod: "COD",
              },
            },
          ])
          .toArray();
        let codLength = cod.length;
        result.push(codLength);
        const onlne = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $match: {
                paymentMethod: "online",
              },
            },
          ])
          .toArray();
        const onlineLength = onlne.length;
        result.push(onlineLength);
        const paymentPenting = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $match: {
                status: "placed",
              },
            },
          ])
          .toArray();
        const statusLength = paymentPenting.length;
        result.push(statusLength);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  },

  getDeliveryStatus: () => {
    const result = [];
    return new Promise(async (resolve, reject) => {
      try {
        const placed = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $match: {
                deliveryStatus: "Order Placed",
              },
            },
          ])
          .toArray();
        let orderPlaced = placed.length;
        result.push(orderPlaced);
        const shipped = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $match: {
                deliveryStatus: "shipped",
              },
            },
          ])
          .toArray();
        let shippedLength = shipped.length;
        result.push(shippedLength);
        const delivered = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $match: {
                deliveryStatus: "delivered",
              },
            },
          ])
          .toArray();
        let deliveredLength = delivered.length;
        result.push(deliveredLength);
        const canceled = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $match: {
                deliveryStatus: "cancel",
              },
            },
          ])
          .toArray();
        let cancelLength = canceled.length;
        result.push(cancelLength);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  },

  getRecentSale: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const recent = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .find()
          .sort({ date: -1 })
          .limit(5)
          .toArray();
        resolve(recent);
      } catch (error) {
        reject(error);
      }
    });
  },
};
