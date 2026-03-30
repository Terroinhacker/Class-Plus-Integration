// YouTube/downloadVideo.js
import axios from "axios";

export default async function downloadZoomVideo(webhookBody) {
    const payload = webhookBody?.payload || ""
    const downloadToken = webhookBody?.download_token || null;

    if (!payload?.object) {
        throw new Error("Invalid payload: missing payload.object");
    }

    const files = (payload.object.recording_files || [])
        .filter(f => f.file_type === "MP4" && f.status === "completed");

    if (!files.length) throw new Error("No completed MP4 files found in recording_files.");

    // Pick the first MP4 (customize if you prefer gallery/speaker view selection)
    const file = files[0];
    const downloadUrl = file.download_url;
    if (!downloadUrl) throw new Error("Missing download_url on recording file.");

    // Stream download
    const headers = {};
    if (downloadToken) headers.Authorization = `Bearer ${downloadToken}`;

    const resp = await axios.get(downloadUrl, { responseType: "stream", headers });

    return resp
}