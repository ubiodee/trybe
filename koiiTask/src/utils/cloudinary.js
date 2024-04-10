import {v2 as cloudinary} from "cloudinary"
import fs from "fs"
import {extractPublicId} from "cloudinary-build-url"

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        // upload on cloudinary
        const responce = await cloudinary.uploader.upload(localFilePath, {
            resource_type : "auto"
        })
        // file has been uploaded successfully
        //console.log("File is uploaded on clodinary",responce.url)
        fs.unlinkSync(localFilePath)
        return responce
    } catch (error) {
        
        fs.unlinkSync(localFilePath) // remove locally saved temporary file as upload operation fails
        return null
    }

}
const deleteFromCloudinary = async (url , resource_type  = "image") => {
    const publicId = extractPublicId(url)
    try {
        if(!publicId) return null
        // delete from cloudinary
        const responce = await cloudinary.uploader.destroy(publicId, { resource_type : resource_type})
        // file has been deleted successfully
        //console.log("File is deleted from clodinary",responce)
        return responce
    } catch (error) {
        console.error("Error while deleting file on Cloudinary", error);
        throw error
    }
}

export {uploadOnCloudinary, deleteFromCloudinary}