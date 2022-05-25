// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import chromium from 'chrome-aws-lambda';
import pw from 'playwright-core';
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

	const browser = await pw.chromium.launch(options);
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
		first_name: string
		last_name: string
		reserve: boolean
	}[];
}): Promise<Buffer> => {
	const playerRows: { number?: number | null; name?: string; reserve?: boolean }[] = [];
	// Need to fill up 25 player rows in the match card
	for (let i = 0; i < 25; i++) {
		const player = teamPlayers[i];
		if (player) {
			playerRows.push({
				name: `${player.last_name}, ${player.first_name}`,
				reserve: player.reserve,
        number: player.number
			});
		} else {
			playerRows.push({});
		}
	}
	const html = `
  <html>
    <head>
      <title>Match card - ${currentTeamName}</title>
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
      </style>
    </head>
    <body>
      <div class="matchCard">
      <div class="row">
      <div class="cell title">
        Carte de match -&nbsp;<span class="emphasize">${currentTeamName}</span>
      </div>
    </div>
        <div class="row">
          <div class="horizontalPair" style="width: 50%">
            <div class="cell fixed" style="width: 6rem">
              Division
            </div>
            <div class="cell emphasize">
              ${divisionName}
            </div>
          </div>
          <div class="horizontalPair" style="width: 50%">
            <div class="cell fixed" style="width: 6rem">
              Date
            </div>
            <div class="cell emphasize">
              ${formattedDate}
            </div>
          </div>
        </div>
        <div class="row">
          <div class="horizontalPair" style="width: 50%">
            <div class="cell fixed" style="width: 6rem">
              Match
            </div>
            <div class="cell emphasize">
              ${matchNumber}
            </div>
          </div>
          <div class="horizontalPair" style="width: 50%">
            <div class="cell fixed" style="width: 6rem">
              Terrain
            </div>
            <div class="cell emphasize">
              ${fieldName}
            </div>
          </div>
        </div>
        <div class="row">
          <div class="horizontalPair" style="width: 70%">
            <div class="cell fixed" style="width: 10rem">
              Visiteur
            </div>
            <div class="cell">
              ${awayTeamName}
            </div>
          </div>
          <div class="horizontalPair" style="width: 30%">
            <div class="cell fixed" style="width: 8rem">
              Pointage
            </div>
            <div class="cell">
      
            </div>
          </div>
        </div>
        <div class="row">
          <div class="horizontalPair" style="width: 70%">
            <div class="cell fixed" style="width: 10rem">
              Receveur
            </div>
            <div class="cell">
              ${homeTeamName}
            </div>
          </div>
          <div class="horizontalPair" style="width: 30%">
            <div class="cell fixed" style="width: 8rem">
              Pointage
            </div>
            <div class="cell emphasize">
      
            </div>
          </div>
        </div>
        <div class="playerRow"> 
          <div class="cell fixed" style="width: 4.5rem">Présent</div>
          <div class="cell fixed" style="width: 3rem">No</div>
          <div class="cell">Nom</div>
          <div class="cell fixed" style="width: 3rem">R</div>
          <div class="cell fixed" style="width: 3rem">Buts</div>
          <div class="cell fixed" style="width: 3rem">A/E</div>
        </div>
        ${playerRows
					.map((player) => {
						return `
            <div class="playerRow">
          <div class="cell fixed" style="width: 4.5rem"></div>
          <div class="cell fixed" style="width: 3rem">${player.number ?? ''}</div>
          <div class="cell">${player.name ?? ''}</div>
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
              <div class="cell fixed" style="width: 10rem">
                Arbitre
              </div>
              <div class="cell">
      
              </div>
            </div>
            <div class="row">
              <div class="cell fixed" style="width: 10rem">
                Arbitre Assistant
              </div>
              <div class="cell">
      
              </div>
            </div>
            <div class="row">
              <div class="cell fixed" style="width: 10rem">
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
            <div class="cell" style="width: 50%; justify-content: center">
              Observations de l'arbitre
            </div>
            <div class="cell" style="width: 50%; justify-content: center">
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
		const parsedBody = expectedBody.parse(req.body);
    console.log('parsedBody', parsedBody)
		const pdf = await generateMatchCardPdf(parsedBody);
		res.setHeader('Content-Type', 'application/pdf')
		res.send(pdf);
		return;
	} catch (e) {
		if (e instanceof ZodError) {
			res.status(400).json("Unexpected body");
		} else {
			res.status(400).json("Something went wrong");
		}
		return;
	}
}
