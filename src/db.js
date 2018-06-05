const mysql = require('mysql')
const config = require('../config.json')
const crawl = require('./crawl')
const _ = require('lodash')

// const connection = mysql.createConnection(config.mysql)
const pool = mysql.createPool(config.mysql)


// 正排索引
let query = `create table if not exists doc_index (
  doc_id INT UNSIGNED AUTO_INCREMENT,
  url TINYTEXT NOT NULL,
  links TEXT,
  doc BLOB NOT NULL,
  PRIMARY KEY ( doc_id )
);`

// 倒排
let query2 = `create table if not exists inverse_index (
  doc_word VARCHAR(10) NOT NULL,
  doc_id VARCHAR(100) NOT NULL,
  submission_date DATE,
  PRIMARY KEY ( doc_word )
);`

// let query3 = `drop table doc_index`
// connection.query(query3, function (error, results, fields) {
//   if (error) throw console.log(error)
//   console.log(results)
//   console.log(fields)
// })

// connection.query(query, function (error, results, fields) {
// if (error) throw console.log(error)
// console.log(results)
// console.log(fields)
// })


/**
 * 
 * @param {Object} data 格式为 {doc:string, url:string, links:Array<string>} 
 */
function insertWikiPage(pool, data) {
  return new Promise((res, rej) => {
    let sql = 'INSERT INTO doc_index VALUES(DEFAULT, ?, ?, ?)'

    if (typeof data !== 'object' || data.doc == null || data.url == null) {
      console.log(this.name + ' 不符合格式')
    }

    pool.getConnection(function (err, connection) {
      connection.query(sql, [data.url, data.links.join('|'), data.doc], function (err, results, fields) {
        connection.release()
        if (err) {
          console.log(err.sqlMessage)
        }else {
          console.log("插入成功", results)
        }
        res()        
      })
    })
  })

}


// insertWikiPage({doc: "yjh", url:"https://github.com/yjhmelody", links:["https://github.com/yjhmelody"]})



exports.pool = pool
exports.insertWikiPage = insertWikiPage