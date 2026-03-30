/**
 * ClassPlus API Steps
 * The 5-step upload flow to ClassPlus via direct HTTP calls
 * 
 * Flow:
 *   1. GET  videoUploadDestination       → verify GCP upload is enabled
 *   2. GET  initiateMultipartUpload      → get signed GCS URL + videoId
 *   3. POST signed GCS URL              → start resumable upload, get upload_id
 *   4. PUT  signed GCS URL + upload_id   → upload video binary
 *   5. POST completeMultipartUpload      → register video in ClassPlus
 */

import fs from "fs";
import { getHeaders, getSignatureHeaders } from "./classplusAuth.js";

const API_BASE_URL = "https://api.classplusapp.com";

// ─── Step 1 ──────────────────────────────────

export async function checkUploadDestination(token) {
    const url = `${API_BASE_URL}/cams/uploader/video/videoUploadDestination`;
    try {
        const res = await fetch(url, {
            headers: { ...getHeaders(token), ...getSignatureHeaders() },
        });
        if (!res.ok) {
            console.log(`  ⚠️  videoUploadDestination: ${res.status} (non-critical)`);
            return null;
        }
        return await res.json();
    } catch (err) {
        console.log(`  ⚠️  videoUploadDestination error (non-critical): ${err.message}`);
        return null;
    }
}

// ─── Step 2 ──────────────────────────────────

export async function initiateMultipartUpload(token, fileName, fileSizeInBytes, courseId) {
    const timestamp = Date.now();
    const uuid = `video/mp4_#$#_mpup_classplus_${timestamp}_SCALive_CID_${courseId}__${fileName}__${fileName}`;

    const params = new URLSearchParams({
        uuid,
        fileSizeInBytes: fileSizeInBytes.toString(),
        isDirectUpload: "true",
        isSdmcDRM: "false",
    });

    const url = `${API_BASE_URL}/cams/uploader/video/gcp/initiateMultipartUpload?${params}`;
    const res = await fetch(url, {
        headers: { ...getHeaders(token), ...getSignatureHeaders() },
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`initiateMultipartUpload failed: ${res.status} - ${text}`);
    }

    const data = await res.json();
    return { ...data, uuid };
}

// ─── Step 3 ──────────────────────────────────

export async function startResumableUpload(signedUrl) {
    const res = await fetch(signedUrl, {
        method: "POST",
        headers: {
            "accept": "application/json, text/plain, */*",
            "content-type": "application/octet-stream",
            "origin": "https://classplusapp.com",
            "referer": "https://classplusapp.com/",
            "x-goog-resumable": "start",
            "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36",
        },
        body: "{}",
    });

    const location = res.headers.get("location");
    if (!location) throw new Error(`startResumableUpload: No location header. Status: ${res.status}`);
    return location;
}

// ─── Step 4 ──────────────────────────────────

export async function uploadVideoToGCS(resumableUrl, filePath, fileSize) {
    // Read file from disk (not from memory buffer)
    const videoBuffer = fs.readFileSync(filePath);

    const res = await fetch(resumableUrl, {
        method: "PUT",
        headers: {
            "accept": "application/json, text/plain, */*",
            "content-type": "application/octet-stream",
            "content-range": `bytes 0-${fileSize - 1}/${fileSize}`,
            "x-upload-content-length": fileSize.toString(),
            "origin": "https://classplusapp.com",
            "referer": "https://classplusapp.com/",
            "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36",
        },
        body: videoBuffer,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`uploadVideoToGCS failed: ${res.status} - ${text}`);
    }
}

// ─── Step 5 ──────────────────────────────────

export async function completeMultipartUpload(token, { videoId, uuid, fileSize, fileName, signedUrl, folderId, courseId }) {
    const url = `${API_BASE_URL}/cams/uploader/video/gcp/completeMultipartUpload`;
    const displayName = fileName.replace(/\.mp4$/i, "");

    const res = await fetch(url, {
        method: "POST",
        headers: {
            ...getHeaders(token),
            "content-type": "application/json",
            ...getSignatureHeaders(),
            "accesskeyid": "undefined",
            "accesskeysecret": "undefined",
            "securitytoken": "undefined",
            "bucket": "classplus-uploads-raw",
            "endpoint": signedUrl,
        },
        body: JSON.stringify({
            PartNumberWithEtag: [{ number: 1, etag: 1 }],
            uploadId: videoId,
            uuid,
            videoId,
            fileSize,
            duration: "00:00:00",
            gcsFilePath: displayName,
            fileName: displayName,
            description: "",
            isSdmcDrm: false,
            order: 160000,
            folderId,
            courseId,
            isWebVideoAllowed: 0,
            isVideoRestricted: 0,
            videoRestrictions: { maxCount: -1, maxDuration: -1 },
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`completeMultipartUpload failed: ${res.status} - ${text}`);
    }

    return await res.json();
}
