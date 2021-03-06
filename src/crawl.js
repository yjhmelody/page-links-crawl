const fs = require('fs')

const request = require('request-promise-native')
const cheerio = require('cheerio')
const _ = require('lodash')
const process = require('process')


const config = {
    headers: {
        'Connection': 'close',
    },
    savePath: './temp/links.json',
    // 存储间隔
    saveInterval: 100,
    maxPages: 1000,
    request: {
        timeout: 2000
    }
}

function getConfig() {
    return config
}

/**
 * 设置请求头
 * @param {Object} headers 请求头
 */
function setHeaders(headers) {
    Object.assign(config.headers, headers)
}

// const pattern = /^https?:\/\/(.*?\.)?.*?\.(.*?[\/])+[^?]*$/

/**
 * 搜集 urls
 * @param {string} html html文本
 * @returns {Array<string>}
 */
function getAllLinks(html) {
    const pattern = /https?:\/\/(.*?\.)?.*?\..*?[\/]/

    const $ = cheerio.load(html)
    const links = []
    $('a').each((i, el) => {
        let link = el.attribs.href
        if (pattern.test(link))
            links.push(link.match(pattern)[0])
    })
    return _.uniq(links)
}

/**
 *
 * 爬取wiki链接
 * @param {string} html
 * @returns {Array<string>} urls
 */
function getWikiLinks(html) {
    const pattern = /^\/wiki\/[^:]*$/
    const head = "https://en.wikipedia.org"

    const $ = cheerio.load(html)
    let links = []
    let body = $('#bodyContent')
    body.find('a').each((i, el) => {
        let link = el.attribs.href
        if (pattern.test(link)) {
            links.push(head + link.match(pattern)[0])
        }
    })
    return _.uniq(links)
}


/**
 *
 * 封装了请求逻辑，传入具体解析函数
 * @param {Function} func 解析页面返回数据的函数 参数是 html
 * @param {string} url 
 * @returns {Promise<Object>} 格式为 {doc:string, url:string, links:Array<string>}
 */
function crawlPage(func, url) {
    console.log('正在爬取' + url)
    let req
    try {
        req = request.get(url, {
            timeout: config.request.timeout,
            headers: config.headers
        })
    } catch (error) {

    }
    return req
        .promise()
        .then(data => {
            let links = func(data)
            console.log(`爬取到${url}，links有${links.length}个`)
            return {
                // doc: data,
                url,
                links
            }
        })
        .catch(err => {
            console.error(`html处理出错： ${err}`)
            return {
                doc: null,
                url,
                links: null
            }
        })
}


/**
 *
 * 调度器，管理全局队列，urls去重，传入具体的单页面处理逻辑和数据存储逻辑
 * @param {Function} crawlFn 爬取某个页面的逻辑 参数为 url
 * @param {Function} saveFn 存储该页面爬取到数据 参数是 json
 * @param {number} id 用来区分不同调度器
 */
async function dispatch(crawlFn, saveFn, id) {
    while (queue.length) {
        try {
            let url = queue.shift()
            let page = await crawlFn(url)

            if (page.links == null) {
                continue
            }

            if (mainPages.length > count) {
                if (count > config.maxPages) {
                    return
                }
                count += config.saveInterval
                console.log(id, '存储...')
                saveFn(page)
                // await saveFn(page)                
            }

            page.links.forEach(element => {
                if (!uniqUrls.has(element)) {
                    queue.push(element)
                    uniqUrls.add(element)
                }
            })
            mainPages.push(page)
            console.log('mainPages', mainPages.length)
            // console.log('queue', queue.length)
            // console.log('uniqUrls', uniqUrls.size)

        } catch (err) {
            console.log(err)
        }
    }
}

/**
 * 存储 links 到磁盘
 * @param {String} path 路径
 * @param {Object} 占位
 */
function savePageLinks(path, _) {
    let json = JSON.stringify({
        "pageLinks": mainPages
    })
    fs.writeFileSync(path, json)
    console.log("存储完成:\n 时间" + new Date(Date.now()))
}

/**
 *
 * 异步暂停
 * @param {number} time 毫秒
 * @returns {Promise<any>}
 */
function sleep(time) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve()
        }, time)
    })
}

/**
 *
 * 异步重启
 * @param {Number} time 毫秒
 * @param {Function} func
 * @param {Array} args
 */
function restart(time, func, ...args) {
    new Promise(function (res, rej) {
            setTimeout(() => {
                res(), time
            })
        })
        .then(v => func(...args))
}

// 存储间隔
let count = 10
// 存储主页及其链接
const mainPages = []
// url去重
const uniqUrls = new Set()
// url队列，用于并发
let queue = []


// 在Job queue中的队列分为两种类型：macro-task和microTask。我们举例来看执行顺序的规定，我们设

// macro-task队列包含任务: a1, a2 , a3 
// micro-task队列包含任务: b1, b2 , b3

// 执行顺序为，首先执行marco-task队列开头的任务，也就是 a1 任务，执行完毕后，在执行micro-task队列里的所有任务，也就是依次执行b1, b2 , b3，执行完后清空micro-task中的任务，接着执行marco-task中的第二个任务，依次循环。

// 了解完了macro-task和micro-task两种队列的执行顺序之后，我们接着来看，真实场景下这两种类型的队列里真正包含的任务（我们以node V8引擎为例），在node V8中，这两种类型的真实任务顺序如下所示：

// macro-task队列真实包含任务：

// script(主程序代码),setTimeout, setInterval, setImmediate, I/O, UI rendering*

// micro-task队列真实包含任务： 
// process.nextTick, Promises, Object.observe, MutationObserver

// 由此我们得到的执行顺序应该为：

// script(主程序代码)—>process.nextTick—>Promises…——>setTimeout——>setInterval——>setImmediate——> I/O——>UI rendering

/**
 * 
 * @param {Array<string>} urls 需要配置的urls
 */
function addBaseUrls(urls) {
    queue = queue.concat(urls)
}



// 爬取单页面的逻辑
const crawlWikiPage = _.curry(crawlPage)(getWikiLinks)
const crawlAllPage = _.curry(crawlPage)(getAllLinks)

// 调度爬虫
const dispatchWiki = _.curry(dispatch)(crawlWikiPage)
const dispatchAll = _.curry(dispatch)(crawlAllPage)


exports.dispatch = dispatch
exports.dispatchAll = dispatchAll
exports.dispatchWiki = dispatchWiki
exports.savePageLinks = savePageLinks
exports.addBaseUrls = addBaseUrls
exports.setHeaders = setHeaders
exports.getConfig = getConfig
exports.sleep = sleep
exports.crawlPage = crawlPage