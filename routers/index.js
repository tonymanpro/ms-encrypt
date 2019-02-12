const router = require('express').Router();

module.exports.paths = () => {

	router.use('/', require('./api')); //API

	return router;
}