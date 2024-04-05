import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const healthcheck = asyncHandler(async (req, res) => {
    //healthcheck response that simply returns the OK status as json with a message
    return res
    .status(200)
    .json(
        new apiResponse(200, {message : "OK"})
    )
})

export {
    healthcheck
}