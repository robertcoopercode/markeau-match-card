import type { NextPage } from 'next'
import Head from 'next/head'

const Home: NextPage = () => {
  return (
    <div>
      <Head>
        <title>Markeau match card generator</title>
      </Head>

      <main>
        PDF generation available at the /api/pdf endpoint.
      </main>
    </div>
  )
}

export default Home
