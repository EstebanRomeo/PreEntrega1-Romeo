class CustomError extends Error {
    constructor(status, message, code) {
      super(message);
      this.status = status;
      this.code = code;
    }
  }
  
  const errorDictionary = {
    PRODUCT_NOT_FOUND: {
      status: 404,
      message: "Product not found",
      code: "PRODUCT_NOT_FOUND"
    },
    USER_NOT_FOUND: {
      status: 404,
      message: "User not found",
      code: "USER_NOT_FOUND"
    },
    CART_NOT_FOUND: {
      status: 404,
      message: "Cart not found",
      code: "CART_NOT_FOUND"
    },
    INVALID_INPUT: {
      status: 400,
      message: "Invalid input",
      code: "INVALID_INPUT"
    },
    INTERNAL_ERROR: {
      status: 500,
      message: "Internal server error",
      code: "INTERNAL_ERROR"
    }
  };
  
  const errorHandler = (err, req, res, next) => {
    if (err instanceof CustomError) {
      const errorDetails = errorDictionary[err.code];
      res.status(errorDetails.status).json({ error: errorDetails.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  };
  
  module.exports = { CustomError, errorDictionary, errorHandler };
  