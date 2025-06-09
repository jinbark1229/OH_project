// src/pages/LostItemUploadPage.js

import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageUploader from '../components/ImageUploader';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { AuthContext } from '../App';
import './style/Page.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const COMMON_LOST_ITEMS_FOR_REPORT = [
    "지갑", "휴대폰", "열쇠", "에어팟", "학생증",
    "우산", "가방", "책", "텀블러", "안경",
    "노트북", "필통", "카드"
];

const LostItemUploadPage = () => {
    // 모든 Hooks를 조건부 return 문 이전에 선언합니다.
    const { userToken = null, userInfo = {}, logout, isLoadingAuth } = useContext(AuthContext);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [detectedItems, setDetectedItems] = useState([]);
    const [selectedDescription, setSelectedDescription] = useState('');
    const [location, setLocation] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState(null);

    // useCallback으로 감싼 함수들도 조건부 return 문 이전에 선언합니다.
    const handleImageSelectFromUploader = useCallback(async (file) => {
        setImageFile(file);

        // 함수 내부에서 userToken 유효성 검사 및 에러 처리
        if (!userToken) {
            setError('인증 정보가 유효하지 않습니다. 다시 로그인해주세요.');
            setLoading(false);
            return;
        }

        if (file) {
            setLoading(true);
            setError(null);
            setDetectedItems([]);
            setUploadedImageUrl(null);

            const formData = new FormData();
            formData.append('image', file);
            formData.append('location', location || '');

            try {
                const response = await fetch(`${API_BASE_URL}/api/upload-image`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${userToken}`,
                    },
                    body: formData,
                });

                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        logout();
                        navigate('/login', { replace: true });
                        return;
                    }
                    const errorData = await response.json();
                    throw new Error(errorData.error || '이미지 업로드 및 감지 실패');
                }

                const data = await response.json();
                setUploadedImageUrl(data.image_url);
                setDetectedItems(data.predictions || []);

                if (data.predictions && data.predictions.length > 0) {
                    setSelectedDescription(data.predictions[0].label);
                }
            } catch (e) {
                console.error('이미지 업로드 및 감지 오류:', e);
                setError(e.message || '이미지 업로드 중 오류 발생.');
            } finally {
                setLoading(false);
            }
        } else {
            setDetectedItems([]);
            setSelectedDescription('');
            setImageFile(null);
            setUploadedImageUrl(null);
            setLoading(false);
        }
    }, [userToken, location, logout, navigate]); // 의존성 배열 유지

    const handleSaveItem = useCallback(async () => {
        setLoading(true);
        setError(null);

        // 함수 내부에서 userToken 유효성 검사 및 에러 처리
        if (!userToken) {
            setError('인증 정보가 유효하지 않습니다. 다시 로그인해주세요.');
            setLoading(false);
            return;
        }

        if (!uploadedImageUrl) {
            setError('먼저 이미지를 업로드하고 물건을 감지해주세요.');
            setLoading(false);
            return;
        }

        if (!selectedDescription || (selectedDescription + '').trim() === '') {
            setError('물건 설명을 입력하거나 선택해주세요.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/lost_items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`,
                },
                body: JSON.stringify({
                    image_url: uploadedImageUrl,
                    description: (selectedDescription || '').trim(),
                    location: (location || '').trim() || null,
                    detection_results: detectedItems.map(item => ({ label: item.label, score: item.score })),
                    user_id: userInfo?.id || null
                }),
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    logout();
                    navigate('/login', { replace: true });
                    return;
                }
                const errorData = await response.json();
                throw new Error(errorData.error || '물건 정보 저장 실패');
            }

            const data = await response.json();
            alert('물건 정보가 성공적으로 저장되었습니다!');
            console.log('물건 저장 성공:', data);
            navigate('/user/dashboard');
        } catch (e) {
            console.error('물건 정보 저장 오류:', e);
            setError(e.message || '물건 정보 저장 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }, [userToken, uploadedImageUrl, selectedDescription, location, detectedItems, userInfo, logout, navigate]); // 의존성 배열 유지


    const handleDescriptionChange = (e) => {
        const { value } = e.target;
        setSelectedDescription(value || '');
    };

    // 이제 조건부 return 문은 모든 Hooks 선언 이후에 옵니다.
    if (isLoadingAuth) {
        return <LoadingSpinner message="인증 정보를 불러오는 중..." />;
    }

    if (!userToken) {
        return (
            <div className="page-container">
                <ErrorMessage message={"로그인이 필요합니다."} />
                <button className="back-button" onClick={() => navigate('/login')}>로그인 페이지로</button>
            </div>
        );
    }

    return (
        <div className="page-container">
            <h1>잃어버린 물건 신고 (사진 첨부)</h1>
            <p>잃어버린 물건의 이미지를 업로드하고 잃어버린 장소 및 설명을 입력하여 신고하세요.</p>

            {error && <ErrorMessage message={error} />}

            <div className="form-group">
                <label htmlFor="location">잃어버린 장소 (선택):</label>
                <input
                    id="location"
                    type="text"
                    value={location ?? ''}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="예: 중앙 도서관 3층, 운동장 트랙 (모를 경우 비워두세요)"
                    className="form-input"
                    disabled={loading}
                />
            </div>

            <ImageUploader onImageSelect={handleImageSelectFromUploader} existingImageUrl={uploadedImageUrl} />

            {loading && <LoadingSpinner />}

            {uploadedImageUrl && (
                <div className="image-preview-container">
                    <img src={`${API_BASE_URL}${uploadedImageUrl}`} alt="Uploaded Item" className="image-preview" />
                </div>
            )}

            <div className="detected-items-section">
                <h2>물건 설명 (선택 또는 직접 입력):</h2>
                <select onChange={handleDescriptionChange} value={selectedDescription || ''} className="form-input">
                    <option value="">-- 물건 종류 선택 --</option>
                    {COMMON_LOST_ITEMS_FOR_REPORT.map((item, index) => (
                        <option key={`common-${index}`} value={item}>
                            {item}
                        </option>
                    ))}
                    {detectedItems.length > 0 && <option disabled>--- AI 감지 결과 ---</option>}
                    {detectedItems.map((item, index) => (
                        <option key={`detected-${index}`} value={item.label}>
                            {item.label} (확률: {(item.score * 100).toFixed(2)}%)
                        </option>
                    ))}
                </select>
                <input
                    id="manual-description"
                    type="text"
                    value={selectedDescription || ''}
                    onChange={handleDescriptionChange}
                    placeholder="감지된 물건이 없거나 추가 설명이 필요하면 직접 입력하세요."
                    className="form-input"
                    disabled={loading}
                />
                {selectedDescription && <p>현재 설명: {selectedDescription}</p>}
            </div>

            <button
                className="submit-button"
                onClick={handleSaveItem}
                disabled={loading || !(selectedDescription || '').trim()}
            >
                물건 정보 저장
            </button>

            <div className="button-group">
                <button className="back-button" onClick={() => navigate('/user/dashboard')}>
                    내 대시보드로
                </button>
                <button className="back-button" onClick={() => navigate('/')}>
                    메인으로
                </button>
            </div>
        </div>
    );
};

export default LostItemUploadPage;