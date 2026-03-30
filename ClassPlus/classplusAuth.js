/**
 * ClassPlus Authentication Helper
 * Extracts JWT token from auth.json (stored as base64 in env)
 * Generates signature headers for API requests
 */

import md5 from "md5";

const SIGNATURE_SECRET = "E0CnImkXprTDJ6Om0kcV";

/**
 * Extract x-access-token from PLAYWRIGHT_AUTH_BASE64 env variable
 */
export function getAccessToken() {
    const base64Auth = process.env.PLAYWRIGHT_AUTH_BASE64;
    if (!base64Auth) throw new Error("PLAYWRIGHT_AUTH_BASE64 is missing in environment");

    const authData = JSON.parse(Buffer.from(base64Auth, "base64").toString("utf-8"));
    const origin = authData.origins?.find(o => o.origin === "https://classplusapp.com");
    const dataEntry = origin?.localStorage?.find(item => item.name === "data");
    if (!dataEntry) throw new Error("No 'data' entry found in auth.json localStorage");

    return JSON.parse(dataEntry.value).token;
}

/**
 * Generate signature + timestamp headers for ClassPlus API
 * Formula: md5(timestamp + "|" + secret)
 */
export function getSignatureHeaders() {
    const timestamp = Date.now();
    return {
        signature: md5(`${timestamp}|${SIGNATURE_SECRET}`),
        ex: timestamp.toString(),
    };
}

/**
 * Common headers for all ClassPlus API requests
 */
export function getHeaders(token) {
    return {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "api-version": "20",
        "origin": "https://classplusapp.com",
        "referer": "https://classplusapp.com/",
        "region": "IN",
        "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36",
        "x-access-token": token,
    };
}
