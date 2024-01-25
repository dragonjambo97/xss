/*
 * Copyright (c) 2014-2023 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import models = require('../models/index')
import { type Request, type Response, type NextFunction } from 'express'
import { UserModel } from '../models/user'
import * as utils from '../lib/utils'
import { stringAt } from 'pdfkit/js/data'
import * as sanitizeHtml from 'sanitize-html'
import { sanitizeInput } from '../lib/utils'
const challengeUtils = require('../lib/challengeUtils')
const challenges = require('../data/datacache').challenges

class ErrorWithParent extends Error {
  parent: Error | undefined
}

// vuln-code-snippet start unionSqlInjectionChallenge dbSchemaChallenge
module.exports = function searchProducts () {
  return (req: Request, res: Response, next: NextFunction) => {

    // Dodanie sanityzacji dla kryteriów wyszukiwania
    let criteria = req.query.q ?? ''
    criteria = criteria.substring(0, Math.min(criteria.length, 25)) // ogranicz długość
    criteria = sanitizeInput(criteria) // użycie ulepszonej funkcji sanityzacji
    
    models.sequelize.query("SELECT * FROM Products WHERE (name LIKE :criteria OR description LIKE :criteria) AND deletedAt IS NULL ORDER BY name", {
      replacements: { criteria: `%${criteria}%` }
      type: models.sequelize.QueryTypes.SELECT
    })
      .then(([products]: any) => {
        const dataString = JSON.stringify(products)
        if (challengeUtils.notSolved(challenges.unionSqlInjectionChallenge)) { // vuln-code-snippet hide-start
          let solved = true
          UserModel.findAll().then(data => {
            const users = utils.queryResultToJson(data)
            if (users.data?.length) {
              for (let i = 0; i < users.data.length; i++) {
                solved = solved && utils.containsOrEscaped(dataString, users.data[i].email) && utils.contains(dataString, users.data[i].password)
                if (!solved) {
                  break
                }
              }
              if (solved) {
                challengeUtils.solve(challenges.unionSqlInjectionChallenge)
              }
            }
          }).catch((error: Error) => {
            next(error)
          })
        }
        if (challengeUtils.notSolved(challenges.dbSchemaChallenge)) {
          let solved = true
          models.sequelize.query('SELECT sql FROM sqlite_master').then(([data]: any) => {
            const tableDefinitions = utils.queryResultToJson(data)
            if (tableDefinitions.data?.length) {
              for (let i = 0; i < tableDefinitions.data.length; i++) {
                if (tableDefinitions.data[i].sql) {
                  solved = solved && utils.containsOrEscaped(dataString, tableDefinitions.data[i].sql)
                  if (!solved) {
                    break
                  }
                }
              }
              if (solved) {
                challengeUtils.solve(challenges.dbSchemaChallenge)
              }
            }
          })
        } // vuln-code-snippet hide-end
        products.forEach(product => {
          products[i].name = utils.sanitizeInput(req.__(products[i].name))
          products[i].description = utils.sanitizeInput(req.__(products[i].description))
        })
        res.json(utils.queryResultToJson(products))
      })
      .catch((error: ErrorWithParent) => {
        next(error.parent ? error.parent : error)
      })
  }
}
// vuln-code-snippet end unionSqlInjectionChallenge dbSchemaChallenge
