const chrome = require('chrome-aws-lambda')
const puppeteer = require('puppeteer-core')
const wait = require('waait')

const exePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const getOptions = async isDev => ({
  product: 'chrome',
  ...(isDev
    ? { args: [], executablePath: exePath, headless: true }
    : {
        args: chrome.args,
        executablePath: await chrome.executablePath,
        headless: chrome.headless,
      }),
})

const getScreenshot = async (url, isDev, waitTime) => {
  const options = await getOptions(isDev)
  const browser = await puppeteer.launch(options)
  const page = await browser.newPage()
  await page.setViewport({ width: 1680, height: 1030, deviceScaleFactor: 1 })
  await page.goto(url)
  await wait(waitTime)
  const buffer = await page.screenshot({ type: 'png' })
  const base64Image = buffer.toString('base64')
  return base64Image
}

exports.handler = async (event, context) => {
  const qs = new URLSearchParams(event.queryStringParameters)
  const waitTime = qs.get('waitTime')
  const url = qs.get('url')
  const isDev = process.env.URL.includes('http://localhost')

  const photoBuffer = await getScreenshot(url, isDev, waitTime)

  return {
    statusCode: 200,
    body: photoBuffer,
    isBase64Encoded: true,
  }
}
