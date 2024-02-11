const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 8080;



app.get('/', (req, res) => {
    res.send('Prueba');
  });
  

  app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
  });

app.use(bodyParser.json());




const productsRouter = express.Router();
app.use('/api/products', productsRouter);


let products = [];


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
    res.json(products[index]);
  } else {
    res.status(404).json({ error: 'Producto no encontrado' });
  }
});


productsRouter.delete('/:pid', (req, res) => {
  products = products.filter(p => p.id !== req.params.pid);
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

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
