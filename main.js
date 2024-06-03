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
const nodemailer = require('nodemailer');
const crypto = require('crypto');

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
  .then(() => console.log('Conexión exitosa a MongoDB'))
  .catch(err => console.error('Error de conexión a MongoDB:', err));
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Error de conexión a MongoDB:'));
db.once('open', () => {
  console.log('Conexión exitosa a MongoDB');
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
    res.status(500).json({ error: error.message });
  }
});
productsRouter.post('/', async (req, res) => {
  try {
    const newProduct = new Product({
      ...req.body,
      status: true,
      owner: req.user.email
    });
    await newProduct.save();
    io.emit('updateProducts', newProduct);
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

productsRouter.put('/:pid', async (req, res) => {
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

productsRouter.delete('/:pid', async (req, res, next) => {
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

app.get('/loggerTest', (req, res) => {
  console.log('Este es un mensaje de prueba.');
  res.status(200).send('Logs de prueba realizados.');
});


app.post('/forgotpassword', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'estebannicolasromeo@gmail.com',
        pass: '1234'
      }
    });
    const mailOptions = {
      from: 'estebannicolasromeo@gmail.com',
      to: user.email,
      subject: 'Restablecimiento de contraseña',
      text: `Para restablecer tu contraseña, haz clic en el siguiente enlace: \n\n
        http://${req.headers.host}/resetpassword/${token}\n\n
        El enlace expirará en 1 hora. Si no solicitaste esto, por favor ignora este correo y tu contraseña permanecerá sin cambios.`
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
      } else {
        console.log('Email enviado: ' + info.response);
      }
    });
    res.status(200).json({ message: 'Se ha enviado un correo con instrucciones para restablecer la contraseña.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/resetpassword/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(401).json({ message: 'El enlace para restablecer la contraseña es inválido o ha expirado.' });
    }
    res.render('resetpassword', { token: req.params.token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/resetpassword/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(401).json({ message: 'El enlace para restablecer la contraseña es inválido o ha expirado.' });
    }
    if (req.body.password === req.body.confirmPassword) {
      return res.status(400).json({ message: 'No puedes restablecer la contraseña con la misma contraseña anterior.' });
    }
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.status(200).json({ message: 'Contraseña restablecida con éxito.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/premium/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(uid, { role }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


const winston = require('winston');

const loggerDevelopment = winston.createLogger({
  levels: {
    debug: 0,
    http: 1,
    info: 2,
    warning: 3,
    error: 4,
    fatal: 5
  },
  transports: [
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
});

const loggerProduction = winston.createLogger({
  levels: {
    debug: 0,
    http: 1,
    info: 2,
    warning: 3,
    error: 4,
    fatal: 5
  },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
});

app.use((req, res, next) => {
  const level = req.app.get('env') === 'development' ? 'debug' : 'info';
  const msg = `${req.method} ${req.url}`;
  req.log = req.app.get('env') === 'development' ? loggerDevelopment.log : loggerProduction.log;
  req.log(level, msg);
  next();
});

app.post('/login', (req, res) => {
  const msg = `Login attempt for user: ${req.body.email}`;
  req.log('info', msg);
});

app.post('/forgotpassword', (req, res) => {
  const msg = `Password reset request for user: ${req.body.email}`;
  req.log('info', msg)
});

const errorHandler = (err, req, res, next) => {
  const { statusCode = 500, message } = err;
  res.status(statusCode).json({ error: message });
};

app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
