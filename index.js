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
    if (config.asyncMax < 1) {
        console.log('asyncMax 必须大于 0')
        return
    } else if (config.urls.length < 1) {
        console.log('urls个数为空')
        return
    } else if (config.savePath != null) {
        console.log('存储路径为 ' + config.savePath)
        getConfig().savePath = config.savePath
    } else {
        console.log('默认存储路径为 ' + crawl.getConfig().savePath)
    }

    if (config.saveInterval < 10) {
        console.log('saveInterval 太小')
        return
    }

    console.log('配置情况: %j', crawl.getConfig())
}


(async function main() {
    try {
        checkConfig(config)
        console.log('准备爬取...')
        console.log(crawl.getConfig())
        await crawl.sleep(2000)
        crawl.addBaseUrls(config.urls)
        crawl.setHeaders(config.headers)
        
        // 存储到Mysql
        saveToMysql = _.curry(db.insertWikiPage)(db.pool)
        // 存储到Json文件
        saveToJson = _.curry(crawl.savePageLinks)(crawl.getConfig().savePath)
        
        // 爬取网页
        crawl.dispatchWiki(saveToJson)

        setTimeout(() => {  
            for (let i = 1; i < config.asyncMax; i++) {
                crawl.dispatchWiki(saveToJson)
            }
        }, 2000)


    } catch (err) {
        console.log("main函数出错" + err)
        console.log("重启main函数...")
        main()
    }
})()