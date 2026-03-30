import express from "express";
import appIntegration from "../controller/appIntegration.js";
const classplusRouter = express.Router();

classplusRouter.post("/post", appIntegration);

export default classplusRouter;