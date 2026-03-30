import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import asyncHandler from "express-async-handler";
import downloadZoomVideo from "../downloadZoomVideo.js";
import uploadToClassplus from "../ClassPlus/uploadToClassplus.js";
import { CLASSPLUS_URLS } from "../ClassPlus/classplusBatches.js";

const TEMP_DIR = "/tmp";

export const appIntegration = asyncHandler(async (req, res) => {
    let tempFile; // ✅ scoped properly

    try {
        const webhookBody = req.body;
        const payload = webhookBody?.payload;

        // ✅ Validation
        if (!payload?.object) {
            return res.status(400).json({
                message: "Invalid webhook body: missing payload.object"
            });
        }

        const date = convertDateFormat(payload.object.start_time);
        const batchName = payload.object.topic?.trim() || "Zoom Recording";

        console.log(`🎬 ClassPlus App Integration: ${batchName}`);

        const batch = CLASSPLUS_URLS[batchName.toLowerCase()];

        // ✅ Batch not found (ignore case)
        if (!batch) {
            return res.status(404).json({
                message: `Batch Not Found: ${batchName}`,
                isIgnore: true,
                payload: { batchName, date }
            });
        }

        const url = `${process.env.CLASSPLUS_BASE_URL}${batch.folderId}?id=${batch.courseId}`;

        // ✅ Download video
        const videoStream = await downloadZoomVideo(webhookBody);


        if (!videoStream?.data) {
            return res.status(500).json({
                message: "Invalid video stream received",
                payload: { batchName, date, url }
            });
        }

        // ✅ Save temp file
        tempFile = path.join(TEMP_DIR, `lecture_${Date.now()}.mp4`);
        const writer = fs.createWriteStream(tempFile);

        await pipeline(videoStream.data, writer);

        // ✅ File validation
        const fileSize = fs.statSync(tempFile).size;
        if (fileSize === 0) {
            return res.status(500).json({
                message: `Downloaded file is empty: ${batchName}`,
                payload: { batchName, date, url }
            });
        }

        // ✅ Upload
        await uploadToClassplus(
            tempFile,
            date.split(" ")[0],
            batch.folderId,
            batch.courseId
        );

        const message = `Lecture uploaded successfully: ${batchName}`;
        console.log(`✅ ${message}`);

        return res.status(200).json({
            message,
            payload: { batchName, date, url }
        });

    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error(error);

        return res.status(500).json({
            message: error.message || "Something went wrong"
        });

    } finally {
        // ✅ Safe cleanup
        if (tempFile && fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
    }
});

function convertDateFormat(dateStr) {
    const options = {
        timeZone: "Asia/Kolkata",
        hour12: false,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    };

    const parts = new Intl.DateTimeFormat("en-GB", options).formatToParts(new Date(dateStr));

    const map = {};
    parts.forEach(p => map[p.type] = p.value);

    return `${map.day}-${map.month}-${map.year} ${map.hour}:${map.minute}:${map.second}`;
}

export default appIntegration;