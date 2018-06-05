const fs = require('fs')

const request = require('request-promise-native')
const cheerio = require('cheerio')
const _ = require('lodash')
const mysql = require('mysql')

const db = require('./db')
const config = require('../config.json')
const crawl = require('./crawl')