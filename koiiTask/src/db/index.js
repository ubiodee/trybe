import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectBD = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`Database Connected !! DB HOST : ${connectionInstance.connection.host}`)
    } catch (error) {
        console.log("MONGODB CONNECTION FAILED",error)
        process.exit(1) // can also use throw to exit (process.exit() is a method of node -- read from doc)
    }
}

export default connectBD