import React from 'react';

export const LoadingSpinner: React.FC = () => (
  <div className="text-center">
    <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
    <p className="mt-4 text-gray-400">오디오를 생성하는 중입니다. 잠시만 기다려주세요...</p>
    <p className="text-sm text-gray-500">몇 초 정도 소요될 수 있습니다.</p>
  </div>
);