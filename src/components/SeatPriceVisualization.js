import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import _ from 'lodash';

const formatPrice = (price) => {
  return new Intl.NumberFormat('ko-KR').format(price) + '원';
};

const SeatPriceVisualization = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('zonePrice');
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // 파일 경로를 공용 폴더 내의 CSV 파일로 지정
        const response = await fetch(`${process.env.PUBLIC_URL}/0309.csv`);
        const text = await response.text();
        
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              setData(results.data);
            } else {
              setError('데이터를 로드할 수 없습니다.');
            }
            setLoading(false);
          },
          error: (error) => {
            setError(`CSV 파싱 오류: ${error.message}`);
            setLoading(false);
          }
        });
      } catch (error) {
        setError(`파일 로드 오류: ${error.message}`);
        setLoading(false);
      }
    };

    loadData();
  }, []);
  
  // 필터링된 데이터 계산
  const filteredData = data.filter(item => {
    return (
      (selectedFloor === 'all' || item.층 === selectedFloor) &&
      (selectedGrade === 'all' || item.등급 === selectedGrade) &&
      (selectedDate === 'all' || (item.공연일시 && item.공연일시.includes(selectedDate)))
    );
  });
  
  // 고유한 층, 등급, 공연일시 목록
  const floors = _.uniq(data.map(item => item.층)).filter(Boolean);
  const grades = _.uniq(data.map(item => item.등급)).filter(Boolean);
  const dates = _.uniq(data.map(item => {
    if (item.공연일시 && typeof item.공연일시 === 'string') {
      return item.공연일시.substring(0, 5);
    }
    return null;
  })).filter(Boolean);
  
  // 구역별 평균 가격 계산
  const getZonePriceData = () => {
    const groupedByZone = _.groupBy(filteredData, '구역');
    
    return Object.entries(groupedByZone).map(([zone, items]) => {
      const prices = items.map(item => item.가격).filter(Boolean);
      const avgPrice = prices.length > 0 ? _.mean(prices) : 0;
      const maxPrice = prices.length > 0 ? _.max(prices) : 0;
      const minPrice = prices.length > 0 ? _.min(prices) : 0;
      
      return {
        zone,
        avgPrice,
        maxPrice,
        minPrice,
        count: items.length
      };
    }).sort((a, b) => b.avgPrice - a.avgPrice);
  };
  
  // 층별 평균 가격 계산
  const getFloorPriceData = () => {
    const groupedByFloor = _.groupBy(filteredData, '층');
    
    return Object.entries(groupedByFloor).map(([floor, items]) => {
      const prices = items.map(item => item.가격).filter(Boolean);
      const avgPrice = prices.length > 0 ? _.mean(prices) : 0;
      
      return {
        floor,
        avgPrice,
        count: items.length
      };
    }).sort((a, b) => b.avgPrice - a.avgPrice);
  };
  
  // 등급별 평균 가격 계산
  const getGradePriceData = () => {
    const groupedByGrade = _.groupBy(filteredData, '등급');
    
    return Object.entries(groupedByGrade).map(([grade, items]) => {
      const prices = items.map(item => item.가격).filter(Boolean);
      const avgPrice = prices.length > 0 ? _.mean(prices) : 0;
      
      return {
        grade,
        avgPrice,
        count: items.length
      };
    }).sort((a, b) => b.avgPrice - a.avgPrice);
  };
  
  // 구역별 가격 분포 히트맵 데이터
  const getZonePriceHeatMapData = () => {
    // 플로어석과 일반석 분리
    const floorSeats = filteredData.filter(item => item.층 && item.층.includes('플로어'));
    const regularSeats = filteredData.filter(item => !item.층 || !item.층.includes('플로어'));
    
    // 플로어석 구역만 추출
    const floorZones = _.uniq(floorSeats.map(item => item.구역)).filter(Boolean);
    
    // 일반석 구역만 추출
    const regularZones = _.uniq(regularSeats.map(item => item.구역)).filter(Boolean);
    
    return {
      floorZones,
      regularZones,
      floorSeats,
      regularSeats
    };
  };
  
  // 가격 범위에 따른 색상 계산
  const getPriceColor = (price) => {
    const allPrices = filteredData.map(item => item.가격).filter(Boolean);
    const maxPrice = allPrices.length > 0 ? _.max(allPrices) : 0;
    const minPrice = allPrices.length > 0 ? _.min(allPrices) : 0;
    
    if (!price) return 'bg-gray-200';
    
    const ratio = (price - minPrice) / (maxPrice - minPrice);
    
    if (ratio < 0.2) return 'bg-blue-900 text-white';
    if (ratio < 0.4) return 'bg-blue-700 text-white';
    if (ratio < 0.6) return 'bg-blue-500 text-white';
    if (ratio < 0.8) return 'bg-red-500 text-white';
    return 'bg-red-700 text-white';
  };
  
  // 가격 통계 계산
  const getPriceStats = () => {
    const prices = filteredData.map(item => item.가격).filter(Boolean);
    
    if (prices.length === 0) return { min: 0, max: 0, avg: 0, median: 0 };
    
    return {
      min: _.min(prices),
      max: _.max(prices),
      avg: _.mean(prices),
      median: _.sortBy(prices)[Math.floor(prices.length / 2)]
    };
  };
  
  if (loading) {
    return <div className="p-6 text-center">데이터를 로드 중입니다...</div>;
  }
  
  if (error) {
    return <div className="p-6 text-center text-red-600">{error}</div>;
  }
  
  const priceStats = getPriceStats();
  const zonePriceData = getZonePriceData();
  const floorPriceData = getFloorPriceData();
  const gradePriceData = getGradePriceData();
  const heatMapData = getZonePriceHeatMapData();
  
  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">세븐틴 콘서트 좌석별 가격 시각화</h1>
      
      {/* 필터 컨트롤 */}
      <div className="mb-6 p-4 bg-white rounded shadow grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">보기 모드:</label>
          <select 
            value={viewMode} 
            onChange={(e) => setViewMode(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="zonePrice">구역별 평균 가격</option>
            <option value="floorPrice">층별 평균 가격</option>
            <option value="gradePrice">등급별 평균 가격</option>
            <option value="heatMap">가격 히트맵</option>
            <option value="stats">세부 통계</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">층:</label>
          <select 
            value={selectedFloor} 
            onChange={(e) => setSelectedFloor(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="all">전체</option>
            {floors.map(floor => (
              <option key={floor} value={floor}>{floor}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">등급:</label>
          <select 
            value={selectedGrade} 
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="all">전체</option>
            {grades.map(grade => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">공연일:</label>
          <select 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="all">전체</option>
            {dates.map(date => (
              <option key={date} value={date}>{date}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* 가격 요약 정보 */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-sm font-medium text-gray-500">최저 가격</h3>
          <p className="text-xl font-bold">{formatPrice(priceStats.min)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-sm font-medium text-gray-500">평균 가격</h3>
          <p className="text-xl font-bold">{formatPrice(Math.round(priceStats.avg))}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-sm font-medium text-gray-500">중간값 가격</h3>
          <p className="text-xl font-bold">{formatPrice(priceStats.median)}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-sm font-medium text-gray-500">최고 가격</h3>
          <p className="text-xl font-bold">{formatPrice(priceStats.max)}</p>
        </div>
      </div>
      
      {/* 구역별 평균 가격 차트 */}
      {viewMode === 'zonePrice' && (
        <div className="bg-white p-4 rounded shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">구역별 평균 가격 (상위 15개)</h2>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={zonePriceData.slice(0, 15)} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => formatPrice(value)} />
                <YAxis type="category" dataKey="zone" width={50} />
                <Tooltip formatter={(value) => formatPrice(value)} />
                <Legend />
                <Bar dataKey="avgPrice" name="평균 가격" fill="#8884d8" />
                <Bar dataKey="maxPrice" name="최고 가격" fill="#82ca9d" />
                <Bar dataKey="minPrice" name="최저 가격" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-6">
            <h3 className="text-md font-semibold mb-2">구역별 평균 가격 표</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-4 text-left">구역</th>
                    <th className="py-2 px-4 text-right">평균 가격</th>
                    <th className="py-2 px-4 text-right">최저 가격</th>
                    <th className="py-2 px-4 text-right">최고 가격</th>
                    <th className="py-2 px-4 text-right">티켓 수</th>
                  </tr>
                </thead>
                <tbody>
                  {zonePriceData.slice(0, 20).map((item) => (
                    <tr key={item.zone} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{item.zone}</td>
                      <td className="py-2 px-4 text-right">{formatPrice(Math.round(item.avgPrice))}</td>
                      <td className="py-2 px-4 text-right">{formatPrice(item.minPrice)}</td>
                      <td className="py-2 px-4 text-right">{formatPrice(item.maxPrice)}</td>
                      <td className="py-2 px-4 text-right">{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* 층별 평균 가격 */}
      {viewMode === 'floorPrice' && (
        <div className="bg-white p-4 rounded shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">층별 평균 가격</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={floorPriceData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => formatPrice(value)} />
                <YAxis type="category" dataKey="floor" width={100} />
                <Tooltip formatter={(value) => formatPrice(value)} />
                <Legend />
                <Bar dataKey="avgPrice" name="평균 가격" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-6">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 text-left">층</th>
                  <th className="py-2 px-4 text-right">평균 가격</th>
                  <th className="py-2 px-4 text-right">티켓 수</th>
                </tr>
              </thead>
              <tbody>
                {floorPriceData.map((item) => (
                  <tr key={item.floor} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{item.floor}</td>
                    <td className="py-2 px-4 text-right">{formatPrice(Math.round(item.avgPrice))}</td>
                    <td className="py-2 px-4 text-right">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* 등급별 평균 가격 */}
      {viewMode === 'gradePrice' && (
        <div className="bg-white p-4 rounded shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">등급별 평균 가격</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={gradePriceData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => formatPrice(value)} />
                <YAxis type="category" dataKey="grade" width={100} />
                <Tooltip formatter={(value) => formatPrice(value)} />
                <Legend />
                <Bar dataKey="avgPrice" name="평균 가격" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-6">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 text-left">등급</th>
                  <th className="py-2 px-4 text-right">평균 가격</th>
                  <th className="py-2 px-4 text-right">티켓 수</th>
                </tr>
              </thead>
              <tbody>
                {gradePriceData.map((item) => (
                  <tr key={item.grade} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{item.grade}</td>
                    <td className="py-2 px-4 text-right">{formatPrice(Math.round(item.avgPrice))}</td>
                    <td className="py-2 px-4 text-right">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* 가격 히트맵 */}
      {viewMode === 'heatMap' && (
        <div className="bg-white p-4 rounded shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">구역별 가격 히트맵</h2>
          
          <div className="mb-4">
            <h3 className="text-md font-semibold mb-2">플로어석 구역</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {heatMapData.floorZones.map(zone => {
                const zoneItems = heatMapData.floorSeats.filter(item => item.구역 === zone);
                const prices = zoneItems.map(item => item.가격).filter(Boolean);
                const avgPrice = prices.length > 0 ? _.mean(prices) : 0;
                
                return (
                  <div 
                    key={zone} 
                    className={`p-3 rounded ${getPriceColor(avgPrice)}`}
                  >
                    <div className="font-bold">{zone}</div>
                    <div>{formatPrice(Math.round(avgPrice))}</div>
                    <div className="text-xs">{zoneItems.length}장</div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div>
            <h3 className="text-md font-semibold mb-2">일반석 구역 (상위 30개)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {heatMapData.regularZones.slice(0, 30).map(zone => {
                const zoneItems = heatMapData.regularSeats.filter(item => item.구역 === zone);
                const prices = zoneItems.map(item => item.가격).filter(Boolean);
                const avgPrice = prices.length > 0 ? _.mean(prices) : 0;
                
                return (
                  <div 
                    key={zone} 
                    className={`p-3 rounded ${getPriceColor(avgPrice)}`}
                  >
                    <div className="font-bold">{zone}</div>
                    <div>{formatPrice(Math.round(avgPrice))}</div>
                    <div className="text-xs">{zoneItems.length}장</div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-center">
            <div className="text-sm mr-2">가격 범위:</div>
            <div className="flex items-center">
              <div className="bg-blue-900 text-white text-xs px-2 py-1 rounded">최저</div>
              <div className="bg-blue-700 text-white text-xs px-2 py-1 mx-1 rounded"></div>
              <div className="bg-blue-500 text-white text-xs px-2 py-1 mx-1 rounded"></div>
              <div className="bg-red-500 text-white text-xs px-2 py-1 mx-1 rounded"></div>
              <div className="bg-red-700 text-white text-xs px-2 py-1 rounded">최고</div>
            </div>
          </div>
        </div>
      )}
      
      {/* 세부 통계 */}
      {viewMode === 'stats' && (
        <div className="bg-white p-4 rounded shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">세부 가격 통계</h2>
          
          <div className="mb-6">
            <h3 className="text-md font-semibold mb-2">층별/등급별 평균 가격</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-4 text-left">층</th>
                    {grades.map(grade => (
                      <th key={grade} className="py-2 px-4 text-right">{grade}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {floors.map(floor => {
                    const floorItems = filteredData.filter(item => item.층 === floor);
                    
                    return (
                      <tr key={floor} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-4">{floor}</td>
                        {grades.map(grade => {
                          const gradeItems = floorItems.filter(item => item.등급 === grade);
                          const prices = gradeItems.map(item => item.가격).filter(Boolean);
                          const avgPrice = prices.length > 0 ? _.mean(prices) : 0;
                          
                          return (
                            <td key={grade} className="py-2 px-4 text-right">
                              {prices.length > 0 ? (
                                <div className={getPriceColor(avgPrice) + " p-1 rounded"}>
                                  {formatPrice(Math.round(avgPrice))}
                                  <div className="text-xs">({gradeItems.length}장)</div>
                                </div>
                              ) : (
                                '-'
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-md font-semibold mb-2">특이사항별 평균 가격</h3>
            {(() => {
              const groupedBySpecial = _.groupBy(filteredData, '특이사항');
              const specialData = Object.entries(groupedBySpecial).map(([special, items]) => {
                const prices = items.map(item => item.가격).filter(Boolean);
                const avgPrice = prices.length > 0 ? _.mean(prices) : 0;
                
                return {
                  special: special || '정보 없음',
                  avgPrice,
                  count: items.length
                };
              }).sort((a, b) => b.avgPrice - a.avgPrice);
              
              return (
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-2 px-4 text-left">특이사항</th>
                      <th className="py-2 px-4 text-right">평균 가격</th>
                      <th className="py-2 px-4 text-right">티켓 수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {specialData.map((item) => (
                      <tr key={item.special} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-4">{item.special}</td>
                        <td className="py-2 px-4 text-right">{formatPrice(Math.round(item.avgPrice))}</td>
                        <td className="py-2 px-4 text-right">{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
          
          <div>
            <h3 className="text-md font-semibold mb-2">공연일별 평균 가격</h3>
            {(() => {
              const groupedByDate = _.groupBy(filteredData, item => {
                if (item.공연일시 && typeof item.공연일시 === 'string') {
                  return item.공연일시.substring(0, 5);
                }
                return '정보 없음';
              });
              
              const dateData = Object.entries(groupedByDate).map(([date, items]) => {
                const prices = items.map(item => item.가격).filter(Boolean);
                const avgPrice = prices.length > 0 ? _.mean(prices) : 0;
                
                return {
                  date,
                  avgPrice,
                  count: items.length
                };
              }).sort((a, b) => a.date.localeCompare(b.date));
              
              return (
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-2 px-4 text-left">공연일</th>
                      <th className="py-2 px-4 text-right">평균 가격</th>
                      <th className="py-2 px-4 text-right">티켓 수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dateData.map((item) => (
                      <tr key={item.date} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-4">{item.date}</td>
                        <td className="py-2 px-4 text-right">{formatPrice(Math.round(item.avgPrice))}</td>
                        <td className="py-2 px-4 text-right">{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatPriceVisualization;