const express = require('express');
const exphbs = require('express-handlebars');
const http = require('http');
const socketIO = require('socket.io');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const PORT = 8080;

const mongoose = require('mongoose');

const MONGO_URI = 'tu_uri_de_conexion_mongodb'; // Reemplaza con tu URI de conexión

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'Error de conexión a MongoDB:'));
db.once('open', () => {
  console.log('Conexión exitosa a MongoDB');
});



app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');
app.set('views', __dirname + '/views');


app.use(bodyParser.json());


let products = [];


app.get('/', (req, res) => {
  res.render('home', { products });
});


app.get('/realtimeproducts', (req, res) => {
  res.render('realTimeProducts', { products });
});


const productsRouter = express.Router();
app.use('/api/products', productsRouter);


productsRouter.get('/', (req, res) => {
  res.json(products);
});


productsRouter.get('/:pid', (req, res) => {
  const product = products.find(p => p.id === req.params.pid);
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ error: 'Producto no encontrado' });
  }
});


productsRouter.post('/', (req, res) => {
  const newProduct = {
    id: generateId(),
    ...req.body,
    status: true
  };

  products.push(newProduct);
  io.emit('updateProducts', products); 
  res.status(201).json(newProduct);
});


productsRouter.put('/:pid', (req, res) => {
  const index = products.findIndex(p => p.id === req.params.pid);
  if (index !== -1) {
    products[index] = {
      ...products[index],
      ...req.body,
      id: req.params.pid
    };
    io.emit('updateProducts', products); 
    res.json(products[index]);
  } else {
    res.status(404).json({ error: 'Producto no encontrado' });
  }
});


productsRouter.delete('/:pid', (req, res) => {
  products = products.filter(p => p.id !== req.params.pid);
  io.emit('updateProducts', products); 
  res.status(204).end();
});


const cartsRouter = express.Router();
app.use('/api/carts', cartsRouter);


let carts = [];


cartsRouter.post('/', (req, res) => {
  const newCart = {
    id: generateId(),
    products: []
  };

  carts.push(newCart);
  res.status(201).json(newCart);
});


cartsRouter.get('/:cid', (req, res) => {
  const cart = carts.find(c => c.id === req.params.cid);
  if (cart) {
    res.json(cart.products);
  } else {
    res.status(404).json({ error: 'Carrito no encontrado' });
  }
});

cartsRouter.post('/:cid/product/:pid', (req, res) => {
  const cart = carts.find(c => c.id === req.params.cid);
  if (cart) {
    const productIndex = cart.products.findIndex(p => p.id === req.params.pid);
    if (productIndex !== -1) {

      cart.products[productIndex].quantity++;
    } else {

      cart.products.push({
        id: req.params.pid,
        quantity: 1
      });
    }
    res.status(200).json(cart);
  } else {
    res.status(404).json({ error: 'Carrito no encontrado' });
  }
});


function generateId() {
  return Math.random().toString(36).substr(2, 9);
}


server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
