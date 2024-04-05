// require('dotenv').config({path: './env'})    // disturb consistency
import dotenv from 'dotenv'
import connectBD from './db/index.js'
import {app} from './app.js'

dotenv.config({
    path : './env'
})

connectBD().then(() => {
    app.listen(process.env.PORT || 5000, () => {
        console.log(`Server is running at port ${process.env.PORT}`);
    })
}).catch((error) => {
    console.log(`DB connection failed`, error);
})




/*
import express from "express"
const app = express()
( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("errror", (error) => {
            console.log("ERRR: ", error);
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })

    } catch (error) {
        console.error("ERROR: ", error)
        throw err
    }
})()

*/