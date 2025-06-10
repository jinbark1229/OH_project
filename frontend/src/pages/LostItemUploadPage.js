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
    const { userToken = null, userInfo = {}, logout, isLoadingAuth } = useContext(AuthContext);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [detectedItems, setDetectedItems] = useState([]); // 반드시 배열로!
    const [selectedDescription, setSelectedDescription] = useState('');
    const [location, setLocation] = useState('');
    const [imageFile, setImageFile] = useState(null); // ← 수정: useState(null)로 선언해야 합니다!
    const [uploadedImageUrl, setUploadedImageUrl] = useState(null);

    // 컴포넌트의 주요 상태 값들이 변경될 때마다 콘솔에 출력하여 디버깅에 도움을 줍니다.
    useEffect(() => {
        console.log('--- LostItemUploadPage 상태 업데이트 ---');
        console.log('loading:', loading);
        console.log('uploadedImageUrl:', uploadedImageUrl);
        console.log('selectedDescription:', selectedDescription);
        console.log('location:', location); // location 값의 상태를 명확히 확인
        console.log('--- 버튼 disabled 조건 평가 ---');
        console.log('loading is true:', loading);
        console.log('!uploadedImageUrl is true:', !uploadedImageUrl);
        console.log('!(selectedDescription || "").trim() is true:', !(selectedDescription || '').trim());
        console.log('!(location || "").trim() is true:', !(location || '').trim()); // location 필드의 활성화 조건 확인
        console.log('------------------------------------');
    }, [loading, uploadedImageUrl, selectedDescription, location]);

    const handleImageSelectFromUploader = useCallback(async (file) => {
        setImageFile(file);

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
            formData.append('location', location);

            try {
                // 여기서 API 경로를 '/api/detect_object'로 명확히 지정
                const response = await fetch(`${API_BASE_URL}/api/detect_object`, {
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

                // AI 감지 결과가 있다면 첫 번째 항목을 기본 설명으로 설정
                if (data.predictions && data.predictions.length > 0) {
                    setSelectedDescription(data.predictions[0].label);
                } else {
                    setSelectedDescription(''); // 감지된 항목이 없으면 설명 초기화
                }
            } catch (e) {
                console.error('이미지 업로드 및 감지 오류:', e);
                setError(e.message || '이미지 업로드 중 오류 발생.');
            } finally {
                setLoading(false);
            }
        } else {
            // 파일이 선택 해제되면 모든 관련 상태 초기화
            setDetectedItems([]); // null이 아니라 빈 배열로!
            setSelectedDescription('');
            setImageFile(null);
            setUploadedImageUrl(null);
            setLoading(false);
        }
    }, [userToken, location, logout, navigate]);

    const handleSaveItem = useCallback(async () => {
        setLoading(true);
        setError(null);

        // 추가된 console.log: userToken 값 확인
        console.log('handleSaveItem 호출됨. 현재 userToken:', userToken); 

        // API 요청 전 필수 필드 유효성 검사 (프론트엔드 단에서 사용자에게 피드백 제공)
        if (!userToken) {
            console.log('userToken이 없습니다. 저장 요청 중단.'); // 추가된 console.log
            setError('인증 정보가 유효하지 않습니다. 다시 로그인해주세요.');
            setLoading(false);
            return;
        }

        if (!uploadedImageUrl) {
            setError('먼저 이미지를 업로드하고 물건을 감지해주세요.');
            setLoading(false);
            return;
        }

        if (!(selectedDescription || '').trim()) {
            setError('물건 설명을 입력하거나 선택해주세요.');
            setLoading(false);
            return;
        }

        if (!(location || '').trim()) { // 백엔드에서 location은 필수이므로 여기서도 검증
            setError('장소를 입력해주세요.');
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
                    location: (location || '').trim(),
                    detection_results: detectedItems.map(item => ({ 
                        label: item.label, 
                        score: typeof item.score === 'number' && !isNaN(item.score) ? item.score : 0.0 
                    }))
                }),
            });

            if (!response.ok) {
                // 추가된 console.error: HTTP 응답 상태 및 에러 데이터 로깅
                const errorData = await response.json().catch(() => ({})); // JSON 파싱 실패 대비
                console.error('API 응답 오류:', response.status, errorData); 

                if (response.status === 401 || response.status === 403) {
                    alert('세션이 만료되었거나 접근 권한이 없습니다. 다시 로그인해주세요.'); // 사용자 알림 추가
                    logout();
                    navigate('/login', { replace: true });
                    return;
                }
                throw new Error(errorData.error || '물건 정보 저장 실패');
            }

            const data = await response.json();
            alert('물건 정보가 성공적으로 저장되었습니다!');
            console.log('물건 저장 성공:', data);
            navigate('/user/dashboard');
        } catch (e) {
            console.error('물건 정보 저장 중 최종 오류 발생:', e); // 최종 catch 오류 로깅 강화
            setError(e.message || '물건 정보 저장 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }, [userToken, uploadedImageUrl, selectedDescription, location, detectedItems, logout, navigate]);

    const handleDescriptionChange = (e) => {
        const { value } = e.target;
        setSelectedDescription(value || '');
    };

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
                <label htmlFor="location">잃어버린 장소:</label>
                <input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="예: 중앙 도서관 3층, 운동장 트랙 (필수 입력)" 
                    className="form-input"
                    disabled={loading}
                />
            </div>

            {/* ★★★ 이 라인을 정확히 확인하세요 ★★★ */}
            <ImageUploader 
                onImageSelected={handleImageSelectFromUploader} // <-- 반드시 'onImageSelected'로 전달!
                existingImageUrl={uploadedImageUrl} 
            />

            {loading && <LoadingSpinner />}

            {uploadedImageUrl && (
                <div className="image-preview-container">
                    <img src={`${API_BASE_URL}${uploadedImageUrl}`} alt="Uploaded Item" className="image-preview" />
                </div>
            )}

            <div className="detected-items-section">
                <h2>물건 설명 (선택 또는 직접 입력):</h2>
                <select onChange={handleDescriptionChange} value={selectedDescription ?? ''} className="form-input">
                    <option value="">-- 물건 종류 선택 --</option>
                    {COMMON_LOST_ITEMS_FOR_REPORT.map((item, index) => (
                        <option key={`common-${index}`} value={item}>
                            {item}
                        </option>
                    ))}
                    {detectedItems && detectedItems.length > 0 && <option disabled>--- AI 감지 결과 ---</option>}
                    {Array.isArray(detectedItems) && detectedItems.map((item, index) => (
                        <option key={`detected-${index}`} value={item.label ?? ''}>
                            {item.label ?? '알 수 없음'} (확률: {typeof item.score === 'number' && !isNaN(item.score) ? (item.score * 100).toFixed(2) : '0.00'}%)
                        </option>
                    ))}
                </select>
                <input
                    id="manual-description"
                    type="text"
                    value={selectedDescription ?? ''}
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
                disabled={
                    loading ||
                    !uploadedImageUrl || 
                    !(selectedDescription || '').trim() || 
                    !(location || '').trim() 
                }
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