#!/usr/bin/env node
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import express from 'express';
import fs from 'fs';

type Handler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

interface Route {
    path: string,
    endpoint: string
}

interface Config {
    port: number,
    routes: Route[],
    env: {[key: string]: string} | undefined
}

const app = express();

const configPath = './lamba.json' || process.argv[2];
const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Config;

if (!config.port) {
    config.port = 6987;
}

for (let key in config.env) {
    process.env[key] = config.env[key];
}

const fullUrl = (req: express.Request) => {
    return `${req.protocol}://${req.get('host')}${req.originalUrl}`;
};

const printError = (req: express.Request, statusCode: number, error: any) => {
    console.log(`%c${statusCode}: %cResponse for ${req.method} request at %c${fullUrl(req)}`,
        'color: #fc5b21; font-weight: bold',
        'color: #fc5b21',
        'color: #fc5b21; font-weight: bold; text-decoration: underline'
    );

    console.log(`%c${error}\n`, 'color: #ff8772');
};

let modifiedDates: { [path: string]: number } = {};

const hasFileChanged = async (path: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        fs.stat(path, (err, stats) => {
            if (err) {
                reject(err);
            }

            if (!modifiedDates[path] || modifiedDates[path] !== stats.mtimeMs) {
                modifiedDates[path] = stats.mtimeMs;
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
};

app.use(express.text({ type: '*/*', limit: '50mb' }))

config.routes.forEach(route => {
    app.all(route.endpoint, async (req, res) => {
        for (let entry in require.cache) {
            if (await hasFileChanged(entry)) {
                delete require.cache[entry];
            }
        }
        
        console.log(`%cRouted %c${fullUrl(req)}%c -> %c${route.endpoint}%c -> %c${route.path}`,
            'color: gold',
            'color: gold; font-weight: bold; text-decoration: underline',
            'color: gold',
            'color: gold; font-weight: bold; text-decoration: underline',
            'color: gold',
            'color: gold; font-weight: bold; text-decoration: underline');
        const handler: Handler = (await import(process.cwd() + route.path)).lambdaHandler;

        let event: APIGatewayProxyEvent = {
            body: typeof(req.body) === 'string' ? req.body : null,
            headers: {},
            multiValueHeaders: {},
            httpMethod: req.method,
            isBase64Encoded: false,
            path: req.baseUrl,
            pathParameters: req.params,
            queryStringParameters: req.query as {[key: string]: string},
            multiValueQueryStringParameters: null,
            stageVariables: null,
            requestContext: {
                accountId: '',
                apiId: '',
                authorizer: undefined,
                protocol: '',
                httpMethod: req.method,
                identity: {
                    accessKey: null,
                    accountId: null,
                    apiKey: null,
                    apiKeyId: null,
                    caller: null,
                    clientCert: null,
                    cognitoAuthenticationProvider: null,
                    cognitoAuthenticationType: null,
                    cognitoIdentityId: null,
                    cognitoIdentityPoolId: null,
                    principalOrgId: null,
                    sourceIp: '',
                    user: null,
                    userAgent: null,
                    userArn: null
                },
                path: req.path,
                stage: '',
                requestId: '',
                requestTimeEpoch: 0,
                resourceId: '',
                resourcePath: ''
            },
            resource: ''
        };

        for (let header in req.headers) {
            event.headers[header] = req.headers[header]?.toString();
        }

        handler(event)
            .then(result => {
                if (result.statusCode < 400) {
                    console.log(`%c${result.statusCode}: %cResponse for ${req.method} request at %c${fullUrl(req)}\n`,
                        'color: mediumspringgreen; font-weight: bold',
                        'color: mediumspringgreen',
                        'color: mediumspringgreen; font-weight: bold; text-decoration: underline'
                    );
                } else {
                    printError(req, result.statusCode, result.body);
                }

                for (let header in result.headers) {
                    res.header(header, result.headers[header].toString());
                }

                res.status(result.statusCode).send(result.body);
            }).catch(error => {
                printError(req, 500, JSON.stringify(error));
                res.status(500).send(JSON.stringify(error));
            });
    });
});

app.listen(config.port, () => {
    console.log(`%cLamba server initializing on port ${config.port}...`, 'color: gold; font-weight: bold;');
    console.log(`%c${config.routes.length} routes found in ${configPath}`, `color: gold`);
    console.log(' ');
    config.routes.forEach(route => {
        console.log(`%cLamba listening on endpoint: %chttp://localhost:${config.port}${route.endpoint}`, 'color: gold', 'color: gold; font-weight: bold; text-decoration: underline');
    });
    console.log(' ');
});