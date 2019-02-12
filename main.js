const impesa = require('@impesa/common');
const routers = require("./routers");

impesa.microservice.start({
    port: process.env.MS_PORT || 8080,
    basepath: '/aes',
    routing: () => routers.paths()
});