Run `yarn vercel` to have a local development server at `http://localhost:3001`. The web app can then call the API at `http://localhost:3000/api/pdf` with the expected JSON body in a POST request.

Using a service called [Browserless](https://www.browserless.io/) that will run chrome used for puppeteer in order to stay under the vercel function size limit of 50 mb.
