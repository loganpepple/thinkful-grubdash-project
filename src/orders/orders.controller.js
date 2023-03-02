const path = require("path");
const orders = require(path.resolve("src/data/orders-data"));
const nextId = require("../utils/nextId");

function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id == orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    next();
  } else {
    next({ status: 404, message: `Order does not exist: ${orderId}.` });
  }
}

function bodyDataHas(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    if (data[propertyName]) {
      next();
    } else {
      next({ status: 400, message: `Order must include a ${propertyName}` });
    }
  };
}

function dishesOk(req, res, next) {
  const { dishes: reqDishes } = req.body.data;
  if (!Array.isArray(reqDishes) || reqDishes.length == 0) {
    next({ status: 400, message: "Order must include at least one dish" });
  }

  const badQuantity = reqDishes.findIndex((dish) => {
    return (
      !dish.quantity || dish.quantity <= 0 || !Number.isInteger(dish.quantity)
    );
  });
  if (badQuantity >= 0) {
    next({
      status: 400,
      message: `Dish ${badQuantity} must have a quantity that is an integer greater than 0`,
    });
  }

  next();
}

function checkReqStatus(req, res, next) {
  const order = res.locals.order;
  const validStatus = ["pending", "preparing", "out-for-delivery", "delivered"];
  let { status } = req.body.data;
  status = status ? status : "";
  if (status && order.status != "delivered" && validStatus.includes(status)) {
    next();
  } else if (order.status == "delivered") {
    next({ status: 400, message: "A delivered order cannot be changed" });
  } else {
    next({
      status: 400,
      message:
        "Order must have a status of pending, preparing, out-for-delivery, delivered",
    });
  }
}

function idsMatch(req, res, next) {
  const { orderId } = req.params;
  let { id } = req.body.data;
  id = id ? id : orderId;
  if (orderId != id) {
    next({
      status: 400,
      message: `Order id does not match routeid. Dish: ${id}, Route: ${orderId}`,
    });
  } else {
    next();
  }
}

function list(req, res) {
  res.json({ data: orders });
}

function read(req, res) {
  res.json({ data: res.locals.order });
}

function create(req, res) {
  const {
    data: { deliverTo, mobileNumber, dishes },
  } = req.body;
  const newOrder = {
    deliverTo: deliverTo,
    mobileNumber: mobileNumber,
    dishes: dishes,
    id: nextId(),
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function update(req, res) {
  const order = res.locals.order;
  const {
    data: { deliverTo, mobileNumber, status, dishes },
  } = req.body;
  order.deliverTo = deliverTo;
  order.mobileNumber = mobileNumber;
  order.status = status;
  order.dishes = dishes;
  res.json({ data: order });
}

function okToDelete(req, res, next) {
  const order = res.locals.order;
  if (order.status !== "pending") {
    next({
      status: 400,
      message: "An order cannot be deleted unless it is pending.",
    });
  }
  next();
}

function destroy(req, res, next) {
  const { orderId } = req.params;
  const orderIndex = orders.findIndex((order) => order.id == orderId);
  const deletedOrders = orders.splice(orderIndex, 1);
  res.sendStatus(204);
}

module.exports = {
  list,
  read: [orderExists, read],
  create: [
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    bodyDataHas("dishes"),
    dishesOk,
    create,
  ],
  update: [
    orderExists,
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    bodyDataHas("dishes"),
    dishesOk,
    checkReqStatus,
    idsMatch,
    update,
  ],
  delete: [orderExists, okToDelete, destroy],
};
