// src/components/clerk/RecentAssessmentsTable.tsx
'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Assessment {
  id: string;
  type: string;
  status: string;
  tier: string;
  createdAt: Date;
  price: number;
  user: {
    name: string | null;
    email: string;
  };
}

interface RecentAssessmentsTableProps {
  assessments: Assessment[];
}

export default function RecentAssessmentsTable({ assessments }: RecentAssessmentsTableProps) {
  // Function to get a readable assessment type name
  const getAssessmentTypeName = (type: string) => {
    const types: Record<string, string> = {
      'fjrl': 'First Job Readiness',
      'ijrl': 'Ideal Job Readiness',
      'cdrl': 'Career Development',
      'ccrl': 'Career Comeback',
      'ctrl': 'Career Transition',
      'rrl': 'Retirement Readiness',
      'irl': 'Internship Readiness',
    };
    
    return types[type] || type.toUpperCase();
  };
  
  // Function to get badge color based on status
  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Function to format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(price);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tier
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Price
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {assessments.length > 0 ? (
            assessments.map((assessment) => (
              <tr key={assessment.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {getAssessmentTypeName(assessment.type)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {assessment.user.name || 'User'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {assessment.user.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(assessment.status)}`}>
                    {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {assessment.tier.charAt(0).toUpperCase() + assessment.tier.slice(1)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatPrice(assessment.price)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDistanceToNow(new Date(assessment.createdAt), { addSuffix: true })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link
                    href={`/clerk/assessments/${assessment.id}`}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                No recent assessments found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}