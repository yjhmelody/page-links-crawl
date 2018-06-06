const fs = require('fs')

const crawl = require('./src/crawl')
const _ = require('lodash')
const db = require('./src/db')

let config
try {
    config = require('./config.json')
} catch (err) {
    console.log("配置解析出错, ", err)
    console.log('请在当前目录下配置config.json')
    return
}

function checkConfig(config) {
    console.log("默认配置为 %j", crawl.getConfig())
    crawl.setHeaders(config.headers)
    if (config.asyncMax < 1) {
        console.log('asyncMax 必须大于 0')
        process.exit(-1)
    }

    if (config.request != null) {
        crawl.getConfig().request = config.request
    }

    if (config.maxPages != null) {
        crawl.getConfig().maxPages = config.maxPages
    }

    if (config.urls.length < 1) {
        console.log('urls个数为空')
        process.exit(-1)
    } else {
        crawl.addBaseUrls(config.urls)
    }

    if (config.savePath != null) {
        console.log('存储路径为 ' + config.savePath)
        crawl.getConfig().savePath = config.savePath
    } else {
        console.log('默认存储路径为 ' + crawl.getConfig().savePath)
    }

    if (config.saveInterval < 10) {
        console.log('saveInterval 太小')
        process.exit(-1)
    } else {
        crawl.getConfig().saveInterval = config.saveInterval
    }

    console.log('配置情况: %j', crawl.getConfig())
}


(async function main() {
    try {
        checkConfig(config)
        console.log('准备爬取...')
        await crawl.sleep(2000)

        // 存储到Mysql
        const saveToMysql = _.curry(db.insertWikiPage)(db.pool)
        // 存储到Json文件
        const saveToJson = _.curry(crawl.savePageLinks)(crawl.getConfig().savePath)

        // 爬取网页
        crawl.dispatchWiki(saveToJson)(0)
        setTimeout(() => {
            for (let i = 1; i < config.asyncMax; i++) {
                crawl.dispatchWiki(saveToJson)(i)
            }
        }, 2000)


    } catch (err) {
        console.log("main函数出错" + err)
        console.log("重启main函数...")
        main()
    }
})()