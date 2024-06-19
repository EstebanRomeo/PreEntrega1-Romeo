const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../app'); // Asegúrate de exportar la app en tu archivo principal
const Cart = require('../dao/models/cartModel');
const Product = require('../dao/models/productModel');

chai.should();
chai.use(chaiHttp);

describe('Carts API', () => {
  beforeEach(async () => {
    await Cart.deleteMany({});
    await Product.deleteMany({});
  });

  describe('POST /api/carts/:cid/add', () => {
    it('it should ADD a product to a cart', (done) => {
      let product = new Product({ name: "Product 1", description: "Product description", price: 100 });
      product.save((err, product) => {
        let cart = new Cart({ products: [] });
        cart.save((err, cart) => {
          chai.request(server)
            .post('/api/carts/' + cart.id + '/add')
            .send({ productId: product.id, quantity: 2 })
            .end((err, res) => {
              res.should.have.status(200);
              res.body.should.be.a('object');
              res.body.should.have.property('products');
              res.body.products.should.be.a('array');
              res.body.products.length.should.be.eql(1);
              done();
            });
        });
      });
    });
  });
});
