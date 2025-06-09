// // src/pages/ReportLostItemPage.js
// import React, { useState, useContext } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { AuthContext } from '../App';
// import LoadingSpinner from '../components/LoadingSpinner';
// import ErrorMessage from '../components/ErrorMessage';
// import LogoutButton from '../components/login/LogoutButton';
// import ImageUploader from '../components/ImageUploader'; // 이미지 업로더 컴포넌트 재사용
// import './style/Page.css';

// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

// const ReportLostItemPage = () => {
//   const { userToken } = useContext(AuthContext);
//   const navigate = useNavigate();
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   const [itemDescription, setItemDescription] = useState('');
//   const [lostLocation, setLostLocation] = useState('');
//   const [lostDate, setLostDate] = useState(''); // YYYY-MM-DD
//   const [imageFile, setImageFile] = useState(null); // 사용자가 올릴 이미지 파일

//   const [matchedItems, setMatchedItems] = useState([]);
//   const [reportedItemDetails, setReportedItemDetails] = useState(null); // 사용자가 신고한 물건 정보

//   const handleImageSelect = (file) => {
//     setImageFile(file);
//   };

//   const handleSubmitLostReport = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setError(null);
//     setMatchedItems([]);
//     setReportedItemDetails(null);

//     if (!userToken) {
//       setError('로그인이 필요합니다.');
//       setLoading(false);
//       return;
//     }
//     if (!itemDescription.trim() || !lostLocation.trim()) {
//       setError('물건 설명과 잃어버린 장소는 필수입니다.');
//       setLoading(false);
//       return;
//     }

//     const formData = new FormData();
//     formData.append('item_description', itemDescription.trim());
//     formData.append('lost_location', lostLocation.trim());
//     if (lostDate) {
//       formData.append('lost_date', lostDate);
//     }
//     if (imageFile) {
//       formData.append('image', imageFile);
//     }

//     try {
//       const response = await fetch(`${API_BASE_URL}/api/report_lost_item`, {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${userToken.token}`,
//         },
//         body: formData,
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.error || '잃어버린 물건 등록 및 매칭에 실패했습니다.');
//       }

//       const data = await response.json();
//       setReportedItemDetails(data.lost_report);
//       setMatchedItems(data.matched_items);
//       if (data.matched_items.length === 0) {
//         setError('유사한 물건을 찾지 못했습니다. 정보를 다시 확인해주세요.');
//       }
//     } catch (e) {
//       console.error('잃어버린 물건 등록 오류:', e);
//       setError(e.message || '잃어버린 물건 등록 중 오류가 발생했습니다.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="page-container">
//       <h1>잃어버린 물건 신고 및 매칭</h1>
//       <p>잃어버린 물건의 정보와 사진을 등록하여, 등록된 발견 물건 중 유사한 것을 찾아보세요.</p>

//       {error && <ErrorMessage message={error} />}

//       <form onSubmit={handleSubmitLostReport} className="form-group">
//         <div className="form-group">
//           <label htmlFor="item-description">잃어버린 물건 설명 (필수):</label>
//           <input
//             id="item-description"
//             type="text"
//             value={itemDescription}
//             onChange={(e) => setItemDescription(e.target.value)}
//             placeholder="예: 검은색 지갑, 학생증, 휴대폰"
//             className="form-input"
//             disabled={loading}
//             required
//           />
//         </div>

//         <div className="form-group">
//           <label htmlFor="lost-location">잃어버린 장소 (필수):</label>
//           <input
//             id="lost-location"
//             type="text"
//             value={lostLocation}
//             onChange={(e) => setLostLocation(e.target.value)}
//             placeholder="예: 중앙 도서관 3층, 운동장 트랙"
//             className="form-input"
//             disabled={loading}
//             required
//           />
//         </div>

//         <div className="form-group">
//           <label htmlFor="lost-date">잃어버린 날짜 (선택, YYYY-MM-DD):</label>
//           <input
//             id="lost-date"
//             type="date"
//             value={lostDate}
//             onChange={(e) => setLostDate(e.target.value)}
//             className="form-input"
//             disabled={loading}
//           />
//         </div>

//         <div className="form-group">
//           <label>잃어버린 물건 사진 (선택):</label>
//           <ImageUploader onImageSelect={handleImageSelect} existingImage={imageFile} />
//           {imageFile && <p>선택된 파일: {imageFile.name}</p>}
//         </div>

//         <button type="submit" className="submit-button" disabled={loading}>
//           {loading ? <LoadingSpinner /> : '잃어버린 물건 등록 및 매칭 시작'}
//         </button>
//       </form>

//       {reportedItemDetails && (
//         <div className="reported-item-section">
//           <h2>등록된 나의 잃어버린 물건:</h2>
//           <div className="item-card">
//             {reportedItemDetails.imageUrl && (
//               <img src={`${API_BASE_URL}${reportedItemDetails.imageUrl}`} alt="Lost Item" className="item-thumbnail" />
//             )}
//             <div className="item-details">
//               <p>설명: {reportedItemDetails.itemDescription}</p>
//               <p>잃어버린 장소: {reportedItemDetails.lostLocation}</p>
//               {reportedItemDetails.lostDate && <p>잃어버린 날짜: {new Date(reportedItemDetails.lostDate).toLocaleDateString()}</p>}
//               <p>AI 감지 결과: {reportedItemDetails.detectionResults ? JSON.stringify(reportedItemDetails.detectionResults) : '없음'}</p>
//             </div>
//           </div>
//         </div>
//       )}

//       {matchedItems.length > 0 && (
//         <div className="search-results-section">
//           <h2>매칭된 발견 물건:</h2>
//           <p>등록하신 물건과 유사하다고 판단되는 발견 물건들입니다.</p>
//           <div className="uploaded-items-grid">
//             {matchedItems.map(match => (
//               <div key={match.item.id} className="item-card matched-item-card">
//                 <img src={`${API_BASE_URL}${match.item.imageUrl}`} alt={match.item.description} className="item-thumbnail" />
//                 <div className="item-details">
//                   <p className="item-description">설명: {match.item.description}</p>
//                   <p className="item-location">발견 장소: {match.item.location}</p>
//                   <p>발견일: {new Date(match.item.upload_date).toLocaleDateString()}</p>
//                   <p>AI 감지 결과: {match.item.predictions ? JSON.stringify(match.item.predictions) : '없음'}</p>
//                   <p className="match-score">매칭 점수: {match.match_score}</p>
//                   <p className="match-details">매칭 상세: {match.match_details.join(', ')}</p>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}

//       <div className="button-group">
//         <LogoutButton />
//         <button className="back-button" onClick={() => navigate('/user/dashboard')}>내 대시보드로</button>
//       </div>
//     </div>
//   );
// };

// export default ReportLostItemPage;