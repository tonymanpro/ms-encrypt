const router = require("express").Router();
const api = require('../models/api');

router.route('/api')
    .get((req, res, next) => {
        api.getDecryptData()
            .then(result => res.send(result))
            .catch(err => next(err));
    })
    .post((req, res, next) => {
        api.insertEncryptData(req.body)
            .then(result => res.send(result))
            .catch(err => next(err));
    });

router.route('/api/rotate')
    .post((req, res, next) => {
        api.rotateKeyset()
            .then(result => res.send(result))
            .catch(err => next(err));
    });

module.exports = router;