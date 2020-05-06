const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')

const axios = require('axios');
const mailgun = require('mailgun-js')({apiKey: process.env.MAILGUN_API_KEY, domain: 'system.coderdojo-konan.jp'});


const PORT = process.env.PORT || 3000

app.use(cors())

const sendToSlack = async (params) => {
  const data = {
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

  try {
    const res = await axios.post(process.env.SLACK_WEBHOOK_URL, data)
    if (res.data === 'ok') {
      return true
    } else {
      return false
    }
  } catch (err) {
    return false
  }
}

const reCaptchaResult = async (token) => {
  const url = 'https://www.google.com/recaptcha/api/siteverify'

  let params = new URLSearchParams();
  params.append('secret', process.env.RECAPTCHA_SECRET)
  params.append('response', token)


  try {
    const res = await axios.post(url, params)

    if (res.data.success) {
      return true
    } else {
      console.error('reCaptchaResult: ', res.data['error-codes'])
      return false
    }
  } catch (err) {
    console.error('reCaptchaResult: ', err)
    return false
  }
}

const sendContactForm = async (params) => {
  const reCaptcha = await reCaptchaResult(params.recaptchaToken)
  if (reCaptcha === true) {
    const sendingMailRes = await sendComfirmingMail(params)
    if (sendingMailRes === true) {
      const sendToSlackRes = await sendToSlack(params)
      if (sendToSlackRes === true) {
        return true
      } else {
        return '送信に失敗しました。もう一度お試しください。 / err: posting to channnel failed'
      }
    } else {
      return "確認メールの送信に失敗しました。メールアドレスの受信設定やメールアドレスに間違いがないかをご確認の上、もう一度お試しください。"
    }
  } else {
    return "reCAPTCHA に成功しませんでした。ページを再読み込みの上、もう一度お試しください。"
  }
}

const sendComfirmingMail = async (params) => {
  const data = {
    from: 'CoderDojo Konan <noreply@system.coderdojo-konan.jp>',
    to: params.email,
    subject: '[自動送信メール] [CoderDojo Konan] お問い合わせを受け付けました。',
    text: `お問い合わせありがとうございます。 \n通常1週間以内に担当の者が返信させていただきますが、担当が多忙な場合は遅れる場合があります。 \n\n\n=== お問い合わせ内容 === \nお名前: ${params.name} \n件名: ${params.subject} \n本文: \n${params.body} \n\n**このアドレスは送信専用です。返信をしてもご対応しかねますのでご了承ください。** \n\nCoderDojo Konan \nhttps://coderdojo-konan.jp`
  };

  try {
    const res = await mailgun.messages().send(data);
    if (res.message === 'Queued. Thank you.') {
      return true
    } else {
      return false
    }
  } catch (err) {
    console.error('sendComfirmingMail: ', err)
    return false
  }
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.post('/form', async (req, res) => {
  const result = await sendContactForm(req.body)

  if(result === true) {
    res.send('success')
  } else if (result=='') {
    res.send('送信に失敗しました。もう一度お試しください。')
  } else {
    res.send(result)
  }
})

app.listen(PORT, () => console.log(`App listening on port ${ PORT }!`))