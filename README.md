Run `yarn vercel` to have a local development server at `http://localhost:3001`. The web app can then call the API at `http://localhost:3000/api/pdf` with the expected JSON body in a POST request.

~~Using a service called [Browserless](https://www.browserless.io/) that will run chrome used for puppeteer in order to stay under the vercel function size limit of 50 mb.~~

Update: Now hosting my own version of Browserless on [Railway](https://railway.app) using the browserless/chrome docker image. This is because the free tier of Browserless only allows 1000 requests per month, and I was hitting that limit somehow (I don't know how since my soccer league doesn't have many PDF download requests.). Railway has a free hosting plan so I can use that for free.
