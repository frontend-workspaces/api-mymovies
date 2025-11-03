const User = require('../models/User'),
  config = require('../configs/app'),
  crypto = require('crypto'),
  base = require('./base.service'),
  jwt = require('jsonwebtoken'),
  { ErrorBadRequest, ErrorNotFound, ErrorUnauthorized } = require('../configs/errorMethods')

const methods = {

  find(req) {
    const limit = +(req.query.limit || config.pageLimit)
    const offset = +(limit * ((req.query.page || 1) - 1))
    const _q = base.buildDynamicSearch(req, {
      allowlist: ['username', 'email', 'tel']
    })

    return new Promise(async (resolve, reject) => {
      try {
        Promise.all([User.find(_q.query).sort(_q.sort).limit(limit).skip(offset), User.countDocuments(_q.query)])
          .then((result) => {
            const rows = result[0],
              count = result[1]
            resolve({
              total: count,
              lastPage: Math.ceil(count / limit),
              currPage: +req.query.page || 1,
              rows: rows,
            })
          })
          .catch((error) => {
            reject(error)
          })
      } catch (error) {
        reject(error)
      }
    })
  },

  findById(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const obj = await User.findById(id)
        if (!obj) reject(ErrorNotFound('id: not found'))
        resolve(obj.toJSON())
      } catch (error) {
        reject(ErrorNotFound('id: not found'))
      }
    })
  },

  insert(data) {
    return new Promise(async (resolve, reject) => {
      try {
        const obj = new User(data)
        const inserted = await obj.save()
        resolve(inserted)
      } catch (error) {
        reject(ErrorBadRequest(error.message))
      }
    })
  },

  update(id, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const obj = await User.findById(id)
        if (!obj) reject(ErrorNotFound('id: not found'))
        await User.updateOne({ _id: id }, data)
        resolve(Object.assign(obj, data))
      } catch (error) {
        console.log('===========<<<>>>');
        
        reject(error)
      }
    })
  },

  delete(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const obj = await User.findById(id)
        if (!obj) reject(ErrorNotFound('id: not found'))
        await User.deleteOne({ _id: id })
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  },

  login(data) {
    return new Promise(async (resolve, reject) => {
      try {
        const obj = await User.findOne({ username: data.username })
        if (!obj) {
          reject(ErrorUnauthorized('username not found'))
        }

        if (!obj.validPassword(data.password)) {
          reject(ErrorUnauthorized('password is invalid.'))
        }

        resolve({ accessToken: obj.generateJWT(obj), userData: obj })
      } catch (error) {
        reject(error)
      }
    })
  },

  refreshToken(accessToken) {
    return new Promise(async (resolve, reject) => {
      try {
        const decoded = jwt.decode(accessToken)
        const obj = await User.findOne({ username: decoded.username })
        if (!obj) {
          reject(ErrorUnauthorized('username not found'))
        }
        resolve({ accessToken: obj.generateJWT(obj), userData: obj })
      } catch (error) {
        reject(error)
      }
    })
  },

  genPassword(password) {
    return new Promise(async (resolve, reject) => {
      try {
        const passwordHash = crypto.createHash('sha1').update(password).digest('hex')
        resolve({ password: passwordHash })
      } catch (error) {
        reject(error)
      }
    })
  },
}

module.exports = { ...methods }
