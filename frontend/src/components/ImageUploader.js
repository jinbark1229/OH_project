// src/components/ImageUploader.js

import React, { useState, useEffect } from 'react'; // <-- useEffect 임포트 추가
import './style/ImageUploader.css';

// 기존에 없던 existingImageUrl prop을 추가합니다.
const ImageUploader = ({ onImageSelected, disabled, existingImageUrl }) => { // <-- existingImageUrl 추가
    const [previewUrl, setPreviewUrl] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);

    // 새롭게 추가되는 useEffect 훅
    // existingImageUrl prop의 변화를 감지하여 미리보기 URL을 업데이트합니다.
    useEffect(() => {
        if (existingImageUrl) {
            // 외부에서 existingImageUrl이 주어지면, 그것을 미리보기 URL로 설정
            setPreviewUrl(existingImageUrl);
            // 이 경우 사용자가 직접 파일을 선택한 것이 아니므로 selectedImage는 null로 유지
            setSelectedImage(null);
        } else if (!selectedImage) {
            // existingImageUrl이 없고, 사용자가 파일을 선택하지도 않았다면 미리보기 초기화
            setPreviewUrl(null);
        }
        // 이 useEffect는 selectedImage가 변경될 때는 실행되지 않습니다.
        // selectedImage는 handleFileChange에서만 관리되므로 중복 처리를 피합니다.
    }, [existingImageUrl]); // existingImageUrl이 변경될 때마다 이 훅이 실행됩니다.


    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            onImageSelected(file);
        } else {
            // 파일 선택이 취소되면 모든 상태를 초기화하고 부모 컴포넌트에도 null 전달
            setSelectedImage(null);
            setPreviewUrl(null);
            onImageSelected(null);
        }
    };

    // return 부분도 기존 이미지 URL이 있을 때의 미리보기 처리를 포함하도록 수정
    return (
        <div className="image-uploader-container">
            <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={disabled}
                className="file-input"
                id="image-upload-input"
            />
            <label htmlFor="image-upload-input" className="file-input-label">
                {/* selectedImage가 있거나, existingImageUrl이 있으면 "이미지 변경"으로 표시 */}
                {selectedImage || existingImageUrl ? "이미지 변경" : "이미지 선택"}
            </label>
            {/* 미리보기 URL이 있거나, existingImageUrl이 있으면 이미지 표시 */}
            {(previewUrl || existingImageUrl) && (
                <div className="image-preview">
                    {/* previewUrl이 우선하고, 없으면 existingImageUrl을 사용 */}
                    <img src={previewUrl || existingImageUrl} alt="Image Preview" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }} />
                </div>
            )}
            {/* 미리보기 URL도 existingImageUrl도 없으면 "선택된 이미지가 없습니다." 메시지 표시 */}
            {!(previewUrl || existingImageUrl) && <p className="no-image-text">선택된 이미지가 없습니다.</p>}
        </div>
    );
};

export default ImageUploader;