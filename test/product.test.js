const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../app'); // Asegúrate de exportar la app en tu archivo principal
const Product = require('../dao/models/productModel');

chai.should();
chai.use(chaiHttp);

describe('Products API', () => {
  beforeEach(async () => {
    await Product.deleteMany({});
  });

  describe('GET /api/products', () => {
    it('it should GET all the products', (done) => {
      chai.request(server)
        .get('/api/products')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.payload.should.be.a('array');
          done();
        });
    });
  });

  describe('POST /api/products', () => {
    it('it should not POST a product without name field', (done) => {
      let product = {
        description: "Product description",
        price: 100
      };
      chai.request(server)
        .post('/api/products')
        .send(product)
        .end((err, res) => {
          res.should.have.status(500);
          res.body.should.be.a('object');
          res.body.should.have.property('error');
          done();
        });
    });

    it('it should POST a product', (done) => {
      let product = {
        name: "Product 1",
        description: "Product description",
        price: 100
      };
      chai.request(server)
        .post('/api/products')
        .send(product)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('_id');
          res.body.should.have.property('name').eql('Product 1');
          done();
        });
    });
  });

  describe('PUT /api/products/:pid', () => {
    it('it should UPDATE a product given the id', (done) => {
      let product = new Product({ name: "Product 1", description: "Product description", price: 100 });
      product.save((err, product) => {
        chai.request(server)
          .put('/api/products/' + product.id)
          .send({ name: "Updated Product" })
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('name').eql('Updated Product');
            done();
          });
      });
    });
  });

  describe('DELETE /api/products/:pid', () => {
    it('it should DELETE a product given the id', (done) => {
      let product = new Product({ name: "Product 1", description: "Product description", price: 100 });
      product.save((err, product) => {
        chai.request(server)
          .delete('/api/products/' + product.id)
          .end((err, res) => {
            res.should.have.status(204);
            done();
          });
      });
    });
  });
});
