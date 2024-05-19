const express = require('express');
const CartRepository = require('./repositories/cartRepository');
const { isUser } = require('./authMiddleware');

const cartsRouter = express.Router();
const cartRepository = new CartRepository();

cartsRouter.post('/:cid/add', isUser, async (req, res, next) => {
  try {
    const { cid } = req.params;
    const { productId, quantity } = req.body;
    const updatedCart = await cartRepository.addProductToCart(cid, productId, quantity);
    res.status(200).json(updatedCart);
  } catch (error) {
    next(error);
  }
});

module.exports = cartsRouter;
