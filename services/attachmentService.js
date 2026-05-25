const { uploadToCloudinary } = require('./cloudinaryService');

const parseArrayField = (value) => {
    if (!value) return [];
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch {
            return [value];
        }
    }
    return Array.isArray(value) ? value : [value];
};

const uploadFiles = async (files = []) => {
    if (!files.length) return [];
    const uploads = [];

    for (const file of files) {
        const result = await uploadToCloudinary(file.buffer, file.originalname);
        uploads.push(result);
    }

    return uploads;
};

module.exports = {
    parseArrayField,
    uploadFiles,
};
