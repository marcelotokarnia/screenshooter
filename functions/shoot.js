const chrome = require('chrome-aws-lambda')
const puppeteer = require('puppeteer-core')
const wait = require('waait')
const cloudinary = require('cloudinary')
const streamifier = require('streamifier')

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
  return buffer
}

const uploadToCloud = (buffer, filename) =>
  new Promise((resolve, reject) => {
    const preffix = new Intl.DateTimeFormat('pt-BR')
      .format(new Date())
      .split('/')
      .reverse()
      .join('-')

    const uploadStream = cloudinary.v2.uploader.upload_stream(
      {
        public_id: `screenshots/${preffix}${filename ? `-${filename}` : ''}`,
      },
      (err, result) => {
        if (err) {
          return reject(err)
        }
        return resolve(result)
      }
    )
    streamifier.createReadStream(buffer).pipe(uploadStream)
  })

exports.handler = async event => {
  const qs = new URLSearchParams(event.queryStringParameters)
  const waitTime = qs.get('waitTime')
  const filename = qs.get('filename')
  const url = decodeURIComponent(qs.get('url'))
  const isDev = process.env.URL.includes('http://localhost')

  const photoBuffer = await getScreenshot(url, isDev, waitTime)

  const cloudImg = await uploadToCloud(photoBuffer, filename)
  return {
    statusCode: 200,
    body: cloudImg.url,
  }
}
