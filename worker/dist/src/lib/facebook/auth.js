"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFacebookAuth = validateFacebookAuth;
exports.createUnauthorizedResponse = createUnauthorizedResponse;
// Facebook authentication middleware
const server_1 = require("next/server");
const FACEBOOK_USERNAME = process.env.FACEBOOK_AUTH_USERNAME || '';
const FACEBOOK_PASSWORD = process.env.FACEBOOK_AUTH_PASSWORD || '';
function validateFacebookAuth(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return false;
    }
    try {
        const base64Credentials = authHeader.substring(6);
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [username, password] = credentials.split(':');
        return username === FACEBOOK_USERNAME && password === FACEBOOK_PASSWORD;
    }
    catch {
        return false;
    }
}
function createUnauthorizedResponse() {
    return server_1.NextResponse.json({ error: 'Unauthorized. Facebook section requires special authentication.' }, {
        status: 401,
        headers: {
            'WWW-Authenticate': 'Basic realm="Facebook Monitoring"'
        }
    });
}
