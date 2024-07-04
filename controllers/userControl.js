
const User = require('../dao/models/userModel');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath;
    if (file.fieldname === 'profile') {
      uploadPath = path.join(__dirname, '../uploads/profiles');
    } else if (file.fieldname === 'product') {
      uploadPath = path.join(__dirname, '../uploads/products');
    } else {
      uploadPath = path.join(__dirname, '../uploads/documents');
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

exports.uploadDocuments = [
  upload.fields([{ name: 'profile' }, { name: 'product' }, { name: 'document' }]),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.uid);
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      if (req.files.document) {
        req.files.document.forEach(file => {
          user.documents.push({ name: file.originalname, reference: file.path });
        });
        await user.save();
      }

      res.status(200).json({ message: 'Documentos subidos exitosamente', user });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

exports.updateUserToPremium = async (req, res) => {
  try {
    const user = await User.findById(req.params.uid);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const requiredDocuments = ['Identificación', 'Comprobante de domicilio', 'Comprobante de estado de cuenta'];
    const hasRequiredDocuments = requiredDocuments.every(doc => user.documents.some(d => d.name === doc));

    if (!hasRequiredDocuments) {
      return res.status(400).json({ message: 'No se ha terminado de cargar la documentación requerida' });
    }

    user.role = 'premium';
    await user.save();
    res.status(200).json({ message: 'Usuario actualizado a premium', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
