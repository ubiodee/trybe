import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //create tweet
    const {content} = req.body

    if(!content){
        throw new apiError(400,"Tweet cannot be empty")
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user?._id
    })

    if(!tweet){
        throw new apiError(500,"Tweet not created")
    }

    return res
    .status(201)
    .json(new apiResponse(201, tweet, "Tweet created Successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    // get user tweets
    const {userId} = req.params
    // const userId = req.user?._id

    if(!isValidObjectId(userId)){
        throw new apiError(400, "Invalid user id")
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likeDetails",
                pipeline: [
                    {
                        $project: {
                            likedBy: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likeDetails",
                },
                ownerDetails: {
                    $first: "$ownerDetails",
                },
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likeDetails.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            },
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                ownerDetails: 1,
                likesCount: 1,
                createdAt: 1,
                isLiked: 1
            },
        },
    ]);

    return res
    .status(200)
    .json(new apiResponse(200, tweets, "User tweets retrieved successfully"))


})

const updateTweet = asyncHandler(async (req, res) => {
    // update tweet
    const {tweetId} = req.params
    const {content} = req.body

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if(!isValidObjectId(tweetId)){
        throw new apiError(400, "Invalid tweet id")
    }

    if(content.trim() === ""){
        throw new apiError(400, "Tweet cannot be empty")
    }

    if (tweet?.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(400, "only owner can edit thier tweet");
    }

    const newTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set : {
                content
            }
        },
        {
            new : true
        }
    )

    if(!newTweet){
        throw new apiError(500, "Tweet not updated")
    }

    return res
    .status(200)
    .json(new apiResponse(200,newTweet,"Tweet updated successfully"))

})

const deleteTweet = asyncHandler(async (req, res) => {
    //delete tweet
    const {tweetId} = req.params

    if (!isValidObjectId(tweetId)) {
        throw new apiError(400, "Invalid tweetId");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new apiError(404, "Tweet not found");
    }

    if (tweet?.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(400, "only owner can delete thier tweet");
    }

    await Tweet.findByIdAndDelete(tweetId);

    return res
    .status(200)
    .json(new apiResponse(200,{tweetId},"Tweet deleted successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}