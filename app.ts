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
    routes: Route[],
    env: {[key: string]: string} | undefined
}

const port = 6987;
const app = express();

const configPath = './lamb.json' || process.argv[2];
const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Config;

for (let key in config.env) {
    process.env[key] = config.env[key];
}

config.routes.forEach(route => {
    app.get(route.endpoint, async (req, res) => {
        const handler: Handler = (await import(process.cwd() + route.path)).lambdaHandler;

        res.header('Content-Type', 'application/json');

        let event: APIGatewayProxyEvent = {
            body: req.body,
            headers: req.headers,
            multiValueHeaders: undefined,
            httpMethod: req.method,
            isBase64Encoded: false,
            path: req.baseUrl,
            pathParameters: req.params,
            queryStringParameters: req.params,
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

        try {
            console.log('done');
            handler(event).then((result) => {
                res.status(result.statusCode).send(result.body);
            });
        } catch (error) {
            res.status(502).send(error);
        };
    });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});