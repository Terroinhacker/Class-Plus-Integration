import express from 'express';
import dotenv from 'dotenv';
import { globalErrorhandler, notFound } from './middleware/globalErrorHandler.js';
import healthCheckRouter from "./router/healthCheckRouter.js"
import classplusRouter from "./router/classplusRouter.js";

//! Load the Environment Variable
dotenv.config();

//! Create an Express App
const app = express()

//! Set up the middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//! Setup the User route
app.use("/", healthCheckRouter);
app.use('/api/v1/classplus', classplusRouter);

//! Route Not Found error handler
app.use(notFound);

//! Global Exception Handler
app.use(globalErrorhandler)

//! Start The Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server Stated at ${PORT}`)
})