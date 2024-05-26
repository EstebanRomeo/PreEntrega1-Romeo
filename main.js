const express = require('express');
const exphbs = require('express-handlebars');
const http = require('http');
const socketIO = require('socket.io');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const faker = require('faker');
const { CustomError, errorDictionary, errorHandler } = require('./errorHandler');
const { isAdmin, isUser } = require('./authMiddleware');
const logger = require('./logger');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const PORT = 8080;

const Product = require('./dao/models/productModel');
const User = require('./dao/models/userModel');
const Cart = require('./dao/models/cartModel');
const Ticket = require('./dao/models/ticketModel');

const mongooseURI = process.env.MONGO_URI;
mongoose.connect(mongooseURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => logger.info('Conexión exitosa a MongoDB'))
  .catch(err => logger.error('Error de conexión a MongoDB:', err));
const db = mongoose.connection;
db.on('error', error => logger.error('Error de conexión a MongoDB:', error));
db.once('open', () => {
  logger.info('Conexión exitosa a MongoDB');
});

passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return done(null, false, { message: 'Usuario no encontrado' });
    }
    const isValidPassword = await user.isValidPassword(password);
    if (!isValidPassword) {
      return done(null, false, { message: 'Contraseña incorrecta' });
    }
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');
app.set('views', __dirname + '/views');
app.use(bodyParser.json());
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
  res.render('home');
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/products',
  failureRedirect: '/login',
  failureFlash: true,
}));

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated()) {
    const userDto = {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
    };
    res.json(userDto);
  } else {
    res.status(401).json({ error: 'No autenticado' });
  }
});

const productsRouter = express.Router();
app.use('/api/products', productsRouter);

productsRouter.get('/', async (req, res) => {
  try {
    const { limit = 10, page = 1, sort, query } = req.query;
    const skip = (page - 1) * limit;
    const filter = query ? { category: query } : {};
    const sortOption = sort ? { price: sort === 'asc' ? 1 : -1 } : {};
    const products = await Product.find(filter)
      .sort(sortOption)
      .limit(parseInt(limit))
      .skip(skip);
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);
    const nextPage = page < totalPages ? parseInt(page) + 1 : null;
    const prevPage = page > 1 ? parseInt(page) - 1 : null;
    const hasNextPage = nextPage !== null;
    const hasPrevPage = prevPage !== null;
    const prevLink = hasPrevPage ? `/api/products?limit=${limit}&page=${prevPage}` : null;
    const nextLink = hasNextPage ? `/api/products?limit=${limit}&page=${nextPage}` : null;

    res.json({
      status: 'success',
      payload: products,
      totalPages,
      prevPage,
      nextPage,
      page: parseInt(page),
      hasPrevPage,
      hasNextPage,
      prevLink,
      nextLink,
    });
  } catch (error) {
    logger.error('Error al obtener productos:', error);
    res.status(500).json({ error: error.message });
  }
});

productsRouter.post('/', isAdmin, async (req, res) => {
  try {
    const newProduct = new Product({
      ...req.body,
      status: true,
    });
    await newProduct.save();
    io.emit('updateProducts', newProduct);
    res.status(201).json(newProduct);
  } catch (error) {
    logger.error('Error al crear producto:', error);
    res.status(500).json({ error: error.message });
  }
});

productsRouter.put('/:pid', isAdmin, async (req, res, next) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(req.params.pid, req.body, { new: true });
    if (updatedProduct) {
      io.emit('updateProducts', updatedProduct);
      res.json(updatedProduct);
    } else {
      throw new CustomError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }
  } catch (error) {
    next(error);
  }
});

productsRouter.delete('/:pid', isAdmin, async (req, res, next) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.pid);
    if (deletedProduct) {
      io.emit('updateProducts', deletedProduct);
      res.status(204).end();
    } else {
      throw new CustomError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }
  } catch (error) {
    next(error);
  }
});

app.get('/mockingproducts', (req, res) => {
  const products = [];
  for (let i = 0; i < 100; i++) {
    products.push({
      _id: faker.datatype.uuid(),
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: faker.commerce.price(),
      category: faker.commerce.department(),
      status: true
    });
  }
  res.json(products);
});

const cartsRouter = express.Router();
app.use('/api/carts', cartsRouter);

cartsRouter.post('/:cid/add', isUser, async (req, res, next) => {
  try {
    const { cid } = req.params;
    const { productId, quantity } = req.body;
    const cart = await Cart.findById(cid);
    if (!cart) {
      throw new CustomError(404, 'Cart not found', 'CART_NOT_FOUND');
    }
    const product = await Product.findById(productId);
    if (!product) {
      throw new CustomError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }
    cart.products.push({ product: productId, quantity });
    await cart.save();
    res.status(200).json(cart);
  } catch (error) {
    next(error);
  }
});

app.use(errorHandler);

app.get('/loggerTest', (req, res) => {
  logger.debug('This is a debug message');
  logger.http('This is an http message');
  logger.info('This is an info message');
  logger.warning('This is a warning message');
  logger.error('This is an error message');
  logger.fatal('This is a fatal message');
  res.send('Logs have been tested, check the console and errors.log file');
});

server.listen(PORT, () => {
  logger.info(`Servidor escuchando en el puerto ${PORT}`);
});
