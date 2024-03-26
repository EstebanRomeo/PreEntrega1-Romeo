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
const Product = require('./dao/models/productModel'); // Importar el modelo de Producto

const uri = 'mongodb+srv://estebannicolasromeo:esteban28romeo@cluster0.fo3dz6j.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; // Reemplaza con tu URI de conexión

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conexión exitosa a MongoDB'))
  .catch(err => console.error('Error de conexión a MongoDB:', err));
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'Error de conexión a MongoDB:'));
db.once('open', () => {
  console.log('Conexión exitosa a MongoDB');
});

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');
app.set('views', __dirname + '/views');

app.use(bodyParser.json());

function paginate(array, page_size, page_number) {
  return array.slice((page_number - 1) * page_size, page_number * page_size);
}

app.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.render('home', { products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/realtimeproducts', async (req, res) => {
  try {
    const products = await Product.find();
    res.render('realTimeProducts', { products });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      res.status(404).json({ error: 'Producto no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

productsRouter.delete('/:pid', async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.pid);
    if (deletedProduct) {
      io.emit('updateProducts', deletedProduct);
      res.status(204).end();
    } else {
      res.status(404).json({ error: 'Producto no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
