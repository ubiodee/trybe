import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {Video} from "../models/video.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
    
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        return apiError(res, 400, "Invalid video ID")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        return apiError(res, 404, "Video not found")
    }

    const commentsAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                },
                isLiked: 1
            }
        }
    ]);

    const comments = await Comment.aggregatePaginate(
        commentsAggregate,
        options
    );

    return res
        .status(200)
        .json(new apiResponse(200, comments, "Comments fetched successfully")
    );
});

const addComment = asyncHandler(async (req, res) => {
    // add a comment to a video

    const { videoId } = req.params
    const { text } = req.body

    const video = await Video.findById(videoId)

    if (!video) {
        return apiError(res, 404, "Video not found")
    }

    if (!text) {
        return apiError(res, 400, "Comment is required")
    }

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        return apiError(res, 400, "Invalid video ID")
    }

    const comment = await Comment.create({
        videoId,
        text,
        user: req.user._id
    })

    if (!comment) {
        return apiError(res, 500, "Failed to add comment")
    }

    return res
    .status(201)
    .json(
        new apiResponse(201,comment,"Comment added successfully")
    )

})

const updateComment = asyncHandler(async (req, res) => {
    // update a comment

    const { commentId } = req.params
    const { text } = req.body

    const comment = await Comment.findById(commentId)

    if (!comment) {
        return apiError(res, 404, "comment not found")
    }

    if (!text) {
        return apiError(res, 400, "Comment is required")
    }

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        return apiError(res, 400, "Invalid comment ID")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        comment?._id,
        {
            $set: {
                content
            }
        },
        { new: true }
    );

    if (!updatedComment) {
        return apiError(res, 500, "Failed to update comment")
    }

    return res
    .status(200)
    .json(
        new apiResponse(200,updatedComment,"Comment updated successfully")
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    //delete a comment

    const { commentId } = req.params

    const comment = await Comment.findById(commentId)

    if (!comment) {
        return apiError(res, 404, "comment not found")
    }   
    
    if (comment?.owner.toString() !== req.user?._id.toString()) {
        throw new apiError(400, "only comment owner can delete their comment");
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId)

    return res
    .status(200)
    .json(
        new apiResponse(200,deletedComment,"Comment deleted successfully")
    )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}