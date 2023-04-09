// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type {NextApiRequest, NextApiResponse} from 'next'
import chromium from 'chrome-aws-lambda';
import puppeteer from 'puppeteer-core';
import {z, ZodError} from "zod";

const expectedBody = z.object({
    divisionName: z.string(),
    formattedDate: z.string().optional(),
    matchNumber: z.string().optional(),
    fieldName: z.string().optional(),
    currentTeamName: z.string(),
    homeTeamName: z.string().optional(),
    awayTeamName: z.string().optional(),
    teamPlayers: z.array(
        z.object({
            number: z.number().nullable(),
            first_name: z.string(),
            last_name: z.string(),
            reserve: z.boolean(),
            suspended: z.boolean().optional(),
        })
    )
})

type ExpectedBody = z.infer<typeof expectedBody>;

const generatePdf = async (html = '') => {
    const options = process.env.AWS_REGION
        ? {
            args: chromium.args,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
        }
        : {
            args: [],
            executablePath:
                process.platform === 'win32'
                    ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
                    : process.platform === 'linux'
                        ? '/usr/bin/google-chrome'
                        : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        };

    const browser = await puppeteer.launch(options);
    const page = await browser.newPage();

    await page.setContent(html);

    const pdfBuffer = await page.pdf({
        format: 'letter',
        pageRanges: '1',
    });

    await page.close();
    await browser.close();

    return pdfBuffer;
};

export const generateMatchCardPdf = async ({
                                               divisionName,
                                               formattedDate,
                                               matchNumber,
                                               fieldName,
                                               currentTeamName,
                                               homeTeamName,
                                               awayTeamName,
                                               teamPlayers,
                                           }: {
    divisionName: string;
    formattedDate?: string;
    matchNumber?: string;
    fieldName?: string;
    currentTeamName: string;
    homeTeamName?: string;
    awayTeamName?: string;
    teamPlayers: {
        number: number | null;
        first_name: string;
        last_name: string;
        reserve: boolean;
        suspended?: boolean;
    }[];
}): Promise<Buffer> => {
    const playerRows: { number?: number | null; name?: string; reserve?: boolean; suspended?: boolean }[] = [];
    // Need to fill up 25 player rows in the match card
    for (let i = 0; i < 25; i++) {
        const player = teamPlayers[i];
        if (player) {
            playerRows.push({
                name: `${player.last_name}, ${player.first_name}`,
                reserve: player.reserve,
                number: player.number,
                suspended: player.suspended,
            });
        } else {
            playerRows.push({});
        }
    }
    const html = `
  <html>
    <head>
      <title>Match card — ${currentTeamName}</title>
      <style>
      * {
      font-family: sans-serif;
      box-sizing: border-box;
    }
    
    body {
      width: 8.5in;
      height: 11in;
      padding: 5mm 5mm;
    }
    
    .matchCard {
      display: flex;
      flex-direction: column;
      height: 100%;
      border-top: 1px solid black;
      border-left: 1px solid black;
    }
    
    .title {
      justify-content: center;
    }
    
    .row {
      display: flex;
      width: 100%;
      height: 1.8rem;
      flex-shrink: 0;
    }
    
    .playerRow {
      display: flex;
      width: 100%;
      height: 1.5rem;
      flex-shrink: 0;
    }
    
    .refs .row {
      height: 1.5rem;
    }
    
    .horizontalPair {
      display: flex;
    }
    
    .emphasize {
      font-weight: 600;
    }
    
    .cell {
      display: flex;
      align-items: center;
      padding: 0.25rem;
      border-right: 1px solid black;
      border-bottom: 1px solid black;
      flex-grow: 1;
    }
    
    .cell.fixed {
      flex-grow: 0;
    }
    
    .refAndLegend {
      display: flex;
    }
    
    .refs {
      flex-grow: 1;
    }
    
    .legend {
      padding: 0.25rem;
      border-right: 1px solid black;
      border-bottom: 1px solid black;
      height: calc(3 * 1.5rem);
      font-size: 0.875rem;
    }
    
    .legend > p {
      margin-top: 0;
      margin-bottom: 0.125rem;
    }
    
    .observations {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

		.checkmark {
			margin-left: 8px;
			width: 16px;
			height: 16px;
		}

    .arrow {
      margin-left: 0.5rem;
      height: 16px;
    }
    
    .arrow svg {
      height: 100%;
    }

    .label {
      font-size: 0.875rem;
      font-weight: 600;
      opacity: 0.9;
    }
      </style>
    </head>
    <body>
      Hello
    </body>
  </html>
`;
    return generatePdf(html);
};


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<string | Buffer>
) {
    try {
        console.log("Starting to parse body")
        const parsedBody = expectedBody.parse(req.body);
        console.log('Parsed body', parsedBody)
        console.log('Generating pdf')
        const pdf = await generateMatchCardPdf(parsedBody);
        console.log('Generated pdf')
        res.setHeader('Content-Type', 'application/pdf')
        res.send(pdf);
        return;
    } catch (e) {
        console.log('error', e)
        if (e instanceof ZodError) {
            res.status(400).json("Unexpected body");
        } else {
            res.status(400).json("Something went wrong");
        }
        return;
    }
}
