const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../app'); // Asegúrate de exportar la app en tu archivo principal
const User = require('../dao/models/userModel');

chai.should();
chai.use(chaiHttp);

describe('Sessions API', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /login', () => {
    it('it should LOGIN a user', (done) => {
      let user = new User({ email: "test@example.com", password: "password" });
      user.save((err, user) => {
        chai.request(server)
          .post('/login')
          .send({ email: "test@example.com", password: "password" })
          .end((err, res) => {
            res.should.have.status(200);
            done();
          });
      });
    });
  });

  describe('GET /api/sessions/current', () => {
    it('it should GET the current session', (done) => {
      let user = new User({ email: "test@example.com", password: "password" });
      user.save((err, user) => {
        chai.request(server)
          .post('/login')
          .send({ email: "test@example.com", password: "password" })
          .end((err, res) => {
            chai.request(server)
              .get('/api/sessions/current')
              .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('email').eql('test@example.com');
                done();
              });
          });
      });
    });
  });
});
