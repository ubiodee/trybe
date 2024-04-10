import { asyncHandler } from  "../utils/asyncHandler.js"
import { apiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccesAndRefreshToken = async(userId) => {
    try {
        // console.log(user);
        const user = await User.findById(userId)

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()


        user.refreshToken = refreshToken
        user.save({ validateBeforeSave : false})

        return {refreshToken, accessToken}
        
    } catch (error) {
        throw new apiError(500,"something went wromg while generating refresh and access token")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    //Get user details from frontend
    //validation
    //check if user already exist
    //check fro image , avatar - compulsory
    //upload avatar to cloudinary
    //create user object - entry in db
    //remove password and refresh token field from response
    //check for user creation
    //return response

    const { fullName, email, username, password} = req.body
    // console.log("email" , email);
    // console.log("req,body" , req.body);
    // console.log("req,body" , req.files);

    if(
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ){
        throw new apiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or : [{username},{email}]
    })

    if(existedUser){
        throw new apiError(409,"User with email or username already exists")
    }

    const avatarLoacalPath = req.files?.avatar[0]?.path
    console.log("avatar lacal path",avatarLoacalPath);
    // const coverImageLoacalPath = req.files?.coverImage[0]?.path

    let coverImageLoacalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLoacalPath = req.files.coverImage[0].path
    }

    if(!avatarLoacalPath){
        throw new apiError(400, "avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLoacalPath)
    const coverImage = await uploadOnCloudinary(coverImageLoacalPath)

    console.log("avatar",avatar);

    if(!avatar){
        throw new apiError(400, "avatar is required")
    }

    const user = await User.create({
        fullName,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new apiError(500, "Something went wrong while registering")
    }

    return res.status(201).json(
        new apiResponse(200, createdUser, "User Registered successfully")
    )

})

const loginUser = asyncHandler( async (req, res) => {
    // req.body -> data
    //username or email
    //find the user
    //password check
    // access token & refresh token
    //send cookies
    const {email, username, password} = req.body

    if(! (username || email)){
        throw new apiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or : [{username}, {email}]
    })

    if(!user){
        throw new apiError(400, "No user found / user does not exist")
    }

    const isPasswordvalid = await user.isPasswordCorrect(password)

    if(!isPasswordvalid){
        throw new apiError(401, "Password is incorrect")
    }

    // console.log(user);
    
    const {refreshToken, accessToken} = await generateAccesAndRefreshToken(user._id)

    // console.log(user);

    const loggedInUser = await User.findById(user._id).select("-password -refresToken")

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new apiResponse(
            200,
            {
                user : loggedInUser,
                refreshToken,
                accessToken
            },
            "User logged In Successfully"
        )
    )
})

const logoutUser = asyncHandler( async (req, res) => { 

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset : {
                refreshToken : 1 // removes field from document
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .clearCookie(`accessToken`,options)
    .clearCookie(`refreshToken`,options)
    .json(new apiResponse(200,{},"User logged out successfully"))
})

const refreshAccessToken = asyncHandler( async (req, res) => {

    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken

    // console.log("refreshtoken ------------",incomingRefreshToken);

    if(!incomingRefreshToken){
        throw new apiError(401,"Invalid refresh token")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)

        // console.log("------",decodedToken);
    
        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new apiError(401, "Invalid refresh token")
        }

        // console.log("--------",user)
        // console.log("--------",incomingRefreshToken)
        // console.log("--------",user.refreshToken)
    
        if(incomingRefreshToken !== user.refreshToken){
            throw new apiError(401, "Refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {refToken,accToken} = await generateAccesAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("refreshToken",refToken,options)
        .cookie("accessToken",accToken,options)
        .json(new apiResponse(
            200,
            {
                refreshToken : refToken,
                accessToken : accToken
            },
            "Access token refreshed"
        ))
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler( async (req,res) => {

    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new apiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave : false})

    return res
    .status(200)
    .json(new apiResponse(200, {}, "password changed successfully"))
})

const getCurrentUser = asyncHandler( async (req,res) => {
    return res
    .status(200)
    .json(new apiResponse(200,req.user,"User fetched successfully"))
})

const updateAccountDetails = asyncHandler( async (req, res) => {

    const {fullName, email} = req.body

    if(!fullName || !email){
        throw new apiError(400,"All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                fullName,
                email
            }
        },
        {
            new : true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new apiResponse(200,user,"Accout details updated successfully"))

})

const updateUserAvatar = asyncHandler( async (req, res) => {

    const avatarLoacalPath = req.file?.path

    if(!avatarLoacalPath){
        throw new apiError(400,"Avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLoacalPath)

    if (!avatar.url) {
        throw new apiError(400, "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                avatar : avatar.url
            }
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new apiResponse(200,user,"Avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler( async (req, res) => {

    const coverImageLoacalPath = req.file?.path

    if(!coverImageLoacalPath){
        throw new apiError(400,"Cover image is required")
    }

    const coverImage = await uploadOnCloudinary(coverImageLoacalPath)

    if (!coverImage.url) {
        throw new apiError(400, "Error while uploading on cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                coverImage : coverImage.url
            }
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new apiResponse(200,user,"Cover image updated successfully"))
})

const getUserChannelProfile = asyncHandler( async (req, res) => {

    const {username} = req.params

    if(!username?.trim()){
        throw new apiError(404,"User does not exist")
    }

    const channel = await User.aggregate([
        {
            $match : {
                username : username?.toLowerCase()
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as : "subscribers"
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "subscriber",
                as : "subscribedTo"
            }
        },
        {
            $addFields : {
                subscribersCount : {
                    $size : "$subscribers"
                },
                channelsSubscribedToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond : {
                        if : {$in : [req.user?._id, "$subscribers.subscriber"]},
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])

    if(!channel?.length){
        throw new apiError(404,"channel does not exist")
    }

    return res
    .status(200)
    .json(
        new apiResponse(200,channel[0],"channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler( async (req, res) => {
    const user = await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",
                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner",
                            pipeline : [
                                {
                                    $project : {
                                        fullName : 1,
                                        username : 1,
                                        avatar : 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"                               
                            }
                        }
                    }
                ]
            }
        }
    ])
    // console.log(user);
    return res
    .status(200)
    .json(new apiResponse(200,user[0].watchHistory,"watch history fetched successfully"))
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}