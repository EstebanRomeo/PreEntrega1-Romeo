const isAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'admin') {
      return next();
    } else {
      res.status(403).json({ error: 'No tienes permiso para realizar esta acción' });
    }
  };
  
  const isUser = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'user') {
      return next();
    } else {
      res.status(403).json({ error: 'No tienes permiso para realizar esta acción' });
    }
  };
  
  module.exports = { isAdmin, isUser };
  