const express = require('express')
const app = express()
const request = require('request')
const bodyParser = require('body-parser')

const slackClient = (url, data, cb) => {
  const options = {
    json: true,
    url: url,
    method: 'POST',
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
    json: data
  }

  request(options, (error, response, body) => {
    cb(body)
  })
}

const getReCaptchaResult = (token, cb) => {
  const url = 'https://www.google.com/recaptcha/api/siteverify'

  const data = {
    'secret': process.env.RECAPTCHA_SECRET,
    'response': token,
  }

  const options = {
    json: true,
    url: url,
    method: 'POST',
    form: data
  }

  let flag = false

  request(options, (error, response, body) => {
    cb(body.success)
  })
}

const sendContactForm = (params, cb) => {
  getReCaptchaResult(params.recaptchaToken, result => {
    if (result === true) {
      const body = {
        'attachments': [{
          'fallback': 'お問い合わせフォームより新しい通知が来ています。',
          'pretext': '<!channel> お問い合わせフォームより新しい通知が来ています！',
          'title': '公式サイトフォーム お問い合わせ',
          'fields': [
            {
              'title': 'Email',
              'value': params.email,
            },
            {
              'title': 'お名前',
              'value': params.name,
            },
            {
              'title': '件名',
              'value': params.subject,
            },
            {
              'title': '本文',
              'value': params.body,
            },
          ],
        }],
      }
    
      slackClient(process.env.SLACK_WEBHOOK_URL, body, cb)
    }
  })
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.post('/contact', (req, res) => {
  console.log(`Connection! ${Date.now()}`)
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  console.log(req.body)

  sendContactForm(req.body, result => {
    if(result === 'ok') {
      res.send('success')
    } else {
      res.send('error')
    }
  })
})



app.listen(3000, () => console.log('App listening on port 3000!'))