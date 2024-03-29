// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import puppeteer from 'puppeteer-core';
import {executablePath} from 'puppeteer-core';

import { z, ZodError } from "zod";

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

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const getBrowser = () =>
	IS_PRODUCTION
		?
		puppeteer.connect({
			// Hosted browserless. Stopped using as I needed to get on a paid plan
			// browserWSEndpoint: `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`,
			browserWSEndpoint: `wss://browserless-production-50c8.up.railway.app`,
		})
		:
		puppeteer.connect({
			// Run the browserless container locally using ` docker run -p 3002:3000 browserless/chrome` locally while in development
			// browserWSEndpoint: `ws://localhost:3002`,
			browserWSEndpoint: `wss://browserless-production-50c8.up.railway.app`,
		})

const generatePdf = async (html = '') => {
	let browser = null;
	let pdfBuffer = null;
	try {
		browser = await getBrowser();
		const page = await browser.newPage();

		console.log("Setting page content")

		await page.setContent(html);

		console.log("Getting PDF buffer")

		pdfBuffer = await page.pdf({
			format: 'letter',
			pageRanges: '1',
		});

		await page.close();

	} catch (e) {
		console.error(e)
	} finally {
		if (browser) {
			console.log("Closing browser in finally")
			await browser.close();
		}
		return pdfBuffer;
	}
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
}: ExpectedBody): Promise<Buffer | null> => {
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
      <div class="matchCard">
      <div class="row">
      <div class="cell title">
        Carte de match — ${currentTeamName}
      </div>
    </div>
        <div class="row">
          <div class="horizontalPair" style="width: 50%">
            <div class="cell fixed label" style="width: 6rem">
              Division
            </div>
            <div class="cell">
              ${divisionName}
            </div>
          </div>
          <div class="horizontalPair" style="width: 50%">
            <div class="cell fixed label" style="width: 6rem">
              Date
            </div>
            <div class="cell">
              ${formattedDate}
            </div>
          </div>
        </div>
        <div class="row">
          <div class="horizontalPair" style="width: 50%">
            <div class="cell fixed label" style="width: 6rem">
              Match
            </div>
            <div class="cell">
              ${matchNumber}
            </div>
          </div>
          <div class="horizontalPair" style="width: 50%">
            <div class="cell fixed label" style="width: 6rem">
              Terrain
            </div>
            <div class="cell">
              ${fieldName}
            </div>
          </div>
        </div>
        <div class="row">
          <div class="horizontalPair" style="width: 70%">
            <div class="cell fixed label" style="width: 10rem">
              Visiteur
            </div>
            <div class="cell${awayTeamName === currentTeamName ? ' emphasize' : ''}">
              ${awayTeamName}
              ${awayTeamName === currentTeamName ? `
              <div class="arrow">
              <svg viewBox="0 0 65 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M11.0948 25.0584L0.488156 14.4518C-0.162714 13.8009 -0.162714 12.7456 0.488156 12.0947L11.0948 1.48813C11.7456 0.837254 12.8009 0.837254 13.4518 1.48813C14.1027 2.139 14.1027 3.19428 13.4518 3.84515L5.69036 11.6066L65 11.6066V14.9399L5.69036 14.9399L13.4518 22.7013C14.1027 23.3522 14.1027 24.4075 13.4518 25.0584C12.8009 25.7092 11.7456 25.7092 11.0948 25.0584Z" fill="black" />
              </svg>
            </div>
              ` : ''}
            </div>
          </div>
          <div class="horizontalPair" style="width: 30%">
            <div class="cell fixed label" style="width: 8rem">
              Pointage
            </div>
            <div class="cell">
      
            </div>
          </div>
        </div>
        <div class="row">
          <div class="horizontalPair" style="width: 70%">
            <div class="cell fixed label" style="width: 10rem">
              Receveur
            </div>
            <div class="cell${homeTeamName === currentTeamName ? ' emphasize' : ''}">
              ${homeTeamName}
              ${homeTeamName === currentTeamName ? `
              <div class="arrow">
              <svg viewBox="0 0 65 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M11.0948 25.0584L0.488156 14.4518C-0.162714 13.8009 -0.162714 12.7456 0.488156 12.0947L11.0948 1.48813C11.7456 0.837254 12.8009 0.837254 13.4518 1.48813C14.1027 2.139 14.1027 3.19428 13.4518 3.84515L5.69036 11.6066L65 11.6066V14.9399L5.69036 14.9399L13.4518 22.7013C14.1027 23.3522 14.1027 24.4075 13.4518 25.0584C12.8009 25.7092 11.7456 25.7092 11.0948 25.0584Z" fill="black" />
              </svg>
            </div>
              ` : ''}
            </div>
          </div>
          <div class="horizontalPair" style="width: 30%">
            <div class="cell fixed label" style="width: 8rem">
              Pointage
            </div>
            <div class="cell emphasize">
      
            </div>
          </div>
        </div>
        <div class="playerRow"> 
          <div class="cell fixed label" style="width: 4.5rem">Présent</div>
          <div class="cell fixed label" style="width: 3rem">No</div>
          <div class="cell label">Nom</div>
          <div class="cell fixed label" style="width: 3rem">R</div>
          <div class="cell fixed label" style="width: 3rem">Buts</div>
          <div class="cell fixed label" style="width: 3rem">A/E</div>
        </div>
        ${playerRows
					.map((player) => {
						return `
            <div class="playerRow">
          <div class="cell fixed" style="width: 4.5rem"></div>
          <div class="cell fixed" style="width: 3rem">${player.number ?? ''}</div>
          <div class="cell">${player.suspended ? '<s>' : ''}${player.name ?? ''}${player.suspended ? '</s>' : ''}${player.suspended ? '<span style="margin-left:0.5rem;font-weight:600">(suspendu)</span>' : ''}</div>
          <div class="cell fixed" style="width: 3rem">${player.reserve ? `
					<svg class="checkmark" viewBox="0 0 352.62 352.62">
					<path d="M337.222 22.952c-15.912-8.568-33.66 7.956-44.064 17.748-23.867 23.256-44.063 50.184-66.708 74.664-25.092 26.928-48.348 53.856-74.052 80.173-14.688 14.688-30.6 30.6-40.392 48.96-22.032-21.421-41.004-44.677-65.484-63.648C28.774 167.385-.602 157.593.01 190.029c1.224 42.229 38.556 87.517 66.096 116.28 11.628 12.24 26.928 25.092 44.676 25.704 21.42 1.224 43.452-24.48 56.304-38.556 22.645-24.48 41.005-52.021 61.812-77.112 26.928-33.048 54.468-65.485 80.784-99.145 16.524-20.808 68.544-72.217 27.54-94.248zM26.937 187.581c-.612 0-1.224 0-2.448.611-2.448-.611-4.284-1.224-6.732-2.448 1.836-1.224 4.896-.612 9.18 1.837z" />
          </svg>
					` : ''}</div>
          <div class="cell fixed" style="width: 3rem"></div>
          <div class="cell fixed" style="width: 3rem"></div>
        </div>
          `;
					})
					.join('\n')}
        
        
        <div class="refAndLegend">
          <div class="refs">
            <div class="row">
              <div class="cell fixed label" style="width: 10rem">
                Arbitre
              </div>
              <div class="cell">
      
              </div>
            </div>
            <div class="row">
              <div class="cell fixed label" style="width: 10rem">
                Arbitre Assistant
              </div>
              <div class="cell">
      
              </div>
            </div>
            <div class="row">
              <div class="cell fixed label" style="width: 10rem">
                Arbitre Assistant
              </div>
              <div class="cell">
      
              </div>
            </div>
          </div>
          <div class="legend">
            <p>A - Avertissement</p>
            <p>E - Expulsion</p>
            <p>R - Réserviste</p>
          </div>
        </div>
        <div class="observations">
          <div class="row">
            <div class="cell label" style="width: 50%; justify-content: center">
              Observations de l'arbitre
            </div>
            <div class="cell label" style="width: 50%; justify-content: center">
              Observations de l'entraîneur
            </div>
          </div>
          <div class="remainingHeightRow" style="display: flex; flex-grow: 1;">
            <div class="cell"></div>
            <div class="cell"></div>
          </div>
        </div>
      </div>
    </body>
  </html>
`;
	return generatePdf(html);
};


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string | 	Buffer>
) {
	try {
		console.log("Starting to parse body")
		const parsedBody = expectedBody.parse(req.body);
		console.log('Parsed body', parsedBody)
		console.log('Generating pdf')
		const pdf = await generateMatchCardPdf(parsedBody);
		console.log('Generated pdf')
		if (!pdf) {
			res.status(400).json("Something went wrong");
			return;
		}
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
