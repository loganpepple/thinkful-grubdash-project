const path = require("path");
const dishes = require(path.resolve("src/data/dishes-data"));
const nextId = require("../utils/nextId");

function dishExists(req, res, next) {
  const { dishId } = req.params;
  const foundDish = dishes.find((dish) => dish.id === dishId);
  if (foundDish) {
    res.locals.dish = foundDish;
    next();
  } else {
    next({ status: 404, message: `Dish does not exist: ${dishId}.` });
  }
}

function bodyDataHas(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    if (
      propertyName == "price" &&
      (typeof data[propertyName] != "number" || data[propertyName] <= 0)
    ) {
      next({
        status: 400,
        message: `Dish must have a price that is an integer greater than 0`,
      });
    } else if (typeof data[propertyName] == "string" && data[propertyName].length == 0) {
      next({ status: 400, message: `Dish must include a ${propertyName}` });
    } else if (data[propertyName]) {
      next();
    }
    next({ status: 400, message: `Dish must include a ${propertyName}` });
  };
}

function list(req, res) {
  res.json({ data: dishes });
}

function read(req, res) {
  res.json({ data: res.locals.dish });
}

function create(req, res) {
  const { data: { name, description, price, image_url } = {} } = req.body;
  const newDish = {
    name: name,
    description: description,
    price: price,
    image_url: image_url,
    id: nextId(),
  };
  dishes.push(newDish);
  res.status(201).json({ data: newDish });
}

function idsMatch(req, res, next) {
  const { dishId } = req.params;
  let { id } = req.body.data;
  id = id ? id : dishId;
  if (dishId !== id) {
    next({status: 400, message: `Dish id does not match routeid. Dish: ${id}, Route: ${dishId}`});
  } else {
    next();
  }
} 

function update(req, res) {
  const dish = res.locals.dish;
  const { data: { name, description, price, image_url, id = req.params.dishId } = {} } = req.body;
  dish.name = name;
  dish.description = description;
  dish.price = price;
  dish.image_url = image_url;
  res.json({ data: dish });
}

module.exports = {
  list,
  read: [dishExists, read],
  create: [
    bodyDataHas("name"),
    bodyDataHas("description"),
    bodyDataHas("price"),
    bodyDataHas("image_url"),
    create,
  ],
  update: [
    dishExists,
    idsMatch,
    bodyDataHas("name"),
    bodyDataHas("description"),
    bodyDataHas("price"),
    bodyDataHas("image_url"),
    update,
  ],
};
