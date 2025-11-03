const Post = require('../models/Post'),
  config = require('../configs/app'),
  base = require('./base.service'),
  { ErrorBadRequest, ErrorNotFound } = require('../configs/errorMethods')

const methods = {

  find(req) {
    const limit = +(req.query.limit || config.pageLimit)
    const offset = +(limit * ((req.query.page || 1) - 1))
    const _q = base.buildDynamicSearch(req)

    return new Promise(async (resolve, reject) => {
      try {
        Promise.all([
          Post.find(_q.query).sort(_q.sort).limit(limit).skip(offset).populate('author'),
          Post.countDocuments(_q.query),
        ])
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
        const obj = await Post.findById(id).populate('author')
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
        const obj = new Post(data)
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
        const obj = await Post.findById(id)
        if (!obj) reject(ErrorNotFound('id: not found'))
        await Post.updateOne({ _id: id }, data)
        resolve(Object.assign(obj, data))
      } catch (error) {
        reject(error)
      }
    })
  },

  delete(id) {
    return new Promise(async (resolve, reject) => {
      try {
        const obj = await Post.findById(id)
        if (!obj) reject(ErrorNotFound('id: not found'))
        await Post.deleteOne({ _id: id })
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  },
}

module.exports = { ...methods }
