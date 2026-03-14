import React from 'react';

interface ErrorDisplayProps {
  message: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => (
  <div className="w-full bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative" role="alert">
    <strong className="font-bold">오류: </strong>
    <span className="block sm:inline">{message}</span>
  </div>
);