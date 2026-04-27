const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CatchSensor API',
      version: '1.0.0',
      description: 'API Documentation for the CatchSensor IoT Trap Monitoring System',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Pointing to a separate docs file to keep route files clean
  apis: [path.join(__dirname, '../docs/*.js')],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
