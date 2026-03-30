/**
 * Upload video to ClassPlus via Direct API
 * 
 * Accepts a FILE PATH (not a buffer) — reads from disk during upload
 * to avoid holding 200MB+ videos in memory.
 */

import fs from "fs";
import { getAccessToken } from "./classplusAuth.js";
import {
    checkUploadDestination,
    initiateMultipartUpload,
    startResumableUpload,
    uploadVideoToGCS,
    completeMultipartUpload,
} from "./classplusAPI.js";

/**
 * @param {string} filePath  - Path to video file on disk
 * @param {string} date      - Date string for lecture name (e.g. "17-03-2026")
 * @param {number} folderId  - ClassPlus folder ID
 * @param {number} courseId  - ClassPlus course ID
 */
const uploadToClassplus = async (filePath, date, folderId, courseId) => {
    const token = getAccessToken();
    const fileName = `New Lecture (${date}).mp4`;
    const fileSize = fs.statSync(filePath).size;

    // Step 1: Check destination
    await checkUploadDestination(token);

    // Step 2: Get signed GCS URL
    const initResult = await initiateMultipartUpload(token, fileName, fileSize, courseId);
    const signedUrl = initResult.response?.endPoint;
    const uuid = initResult.uuid;
    if (!signedUrl) throw new Error("Failed to get signed URL from ClassPlus");

    const videoId = new URL(signedUrl).pathname.split("/").pop().replace(".mp4", "");

    // Step 3: Start resumable upload
    const resumableUrl = await startResumableUpload(signedUrl);

    // Step 4: Upload video from disk (not from memory)
    await uploadVideoToGCS(resumableUrl, filePath, fileSize);

    // Step 5: Register in ClassPlus
    const result = await completeMultipartUpload(token, {
        videoId, uuid, fileSize, fileName, signedUrl, folderId, courseId,
    });
    
    return result;
};

export default uploadToClassplus;