// src/components/ImageUploader.js

import React, { useState, useEffect, useRef } from 'react';
import './style/ImageUploader.css';

// 백엔드 API의 기본 URL을 정의합니다.
// .env 파일에 REACT_APP_API_BASE_URL이 설정되어 있다면 그 값을 사용하고,
// 없다면 개발 환경 기본값인 'http://localhost:5000'을 사용합니다.
// 이 값은 React 앱이 빌드될 때 환경 변수에서 가져옵니다.
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const ImageUploader = ({ onImageSelect, existingImageUrl }) => {
    const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState(null);
    const fileInputRef = useRef(null);

    // existingImageUrl prop이 변경될 때마다 미리보기 URL을 업데이트합니다.
    useEffect(() => {
        if (existingImageUrl) {
            // existingImageUrl이 'http'로 시작하는 완전한 URL이 아니라면,
            // API_BASE_URL을 앞에 붙여 완전한 이미지 URL을 만듭니다.
            // 이렇게 해야 브라우저가 이미지를 올바른 서버에서 로드할 수 있습니다.
            const fullImageUrl = existingImageUrl.startsWith('http')
                ? existingImageUrl
                : `${API_BASE_URL}${existingImageUrl}`;
            setSelectedImagePreviewUrl(fullImageUrl);
        } else {
            // existingImageUrl이 없으면 미리보기를 비웁니다.
            setSelectedImagePreviewUrl(null);
        }
    }, [existingImageUrl]); // existingImageUrl이 변경될 때만 이 useEffect 훅을 다시 실행

    // 파일 입력 필드의 값이 변경될 때 호출됩니다.
    const handleFileChange = (event) => {
        const file = event.target.files[0]; // 선택된 첫 번째 파일 가져오기
        if (file) {
            const reader = new FileReader(); // FileReader 객체 생성
            reader.onloadend = () => {
                // 파일 읽기가 완료되면, 결과(Base64 인코딩된 URL)를 미리보기 URL로 설정합니다.
                // 이는 사용자가 이미지를 선택하자마자 브라우저에서 미리 볼 수 있게 합니다.
                setSelectedImagePreviewUrl(reader.result);
            };
            reader.readAsDataURL(file); // 파일을 Data URL 형식으로 읽습니다.

            // 선택된 파일 객체를 부모 컴포넌트로 전달합니다.
            // 부모 컴포넌트에서는 이 파일 객체를 사용하여 백엔드에 업로드 요청을 보냅니다.
            onImageSelect(file);
        } else {
            // 파일이 선택되지 않았거나 제거되었다면 미리보기와 부모 상태를 초기화합니다.
            setSelectedImagePreviewUrl(null);
            onImageSelect(null);
        }
    };

    // '이미지 제거' 버튼 클릭 시 호출됩니다.
    const handleRemoveImage = () => {
        setSelectedImagePreviewUrl(null); // 미리보기 URL을 비웁니다.
        onImageSelect(null); // 부모 컴포넌트의 이미지 선택 상태를 초기화합니다.
        if (fileInputRef.current) {
            // 파일 입력 필드의 값을 비워, 동일한 파일을 다시 선택할 수 있게 합니다.
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="image-uploader-container">
            {/* selectedImagePreviewUrl이 존재하면 이미지 미리보기를 표시합니다. */}
            {selectedImagePreviewUrl ? (
                <div className="image-preview">
                    {/* selectedImagePreviewUrl은 이제 백엔드 API_BASE_URL이 포함된 완전한 경로입니다. */}
                    <img src={selectedImagePreviewUrl} alt="업로드된 이미지" className="preview-image" />
                    <button type="button" onClick={handleRemoveImage} className="remove-image-button">
                        이미지 제거
                    </button>
                </div>
            ) : (
                // 이미지가 선택되지 않았다면 업로드 영역을 표시합니다.
                <div className="upload-area" onClick={() => fileInputRef.current.click()}>
                    <input
                        type="file"
                        accept="image/*" // 이미지 파일만 허용
                        onChange={handleFileChange} // 파일 선택 시 핸들러 호출
                        ref={fileInputRef} // input 요소에 접근하기 위한 ref
                        style={{ display: 'none' }} // 사용자에게 보이지 않게 숨김
                    />
                    <p>클릭하여 이미지를 업로드하세요</p>
                </div>
            )}
        </div>
    );
};

export default ImageUploader;