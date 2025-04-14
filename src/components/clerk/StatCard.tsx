// src/components/clerk/StatCard.tsx
import { 
    UsersIcon, 
    ClipboardCheckIcon, 
    ClockIcon, 
    CreditCardIcon, 
    ChartBarIcon
  } from 'lucide-react';
  
  interface StatCardProps {
    title: string;
    value: number;
    description: string;
    icon: 'users' | 'clipboard-check' | 'clock' | 'credit-card' | 'chart-bar';
    color: 'blue' | 'green' | 'amber' | 'rose' | 'purple';
  }
  
  export default function StatCard({ title, value, description, icon, color }: StatCardProps) {
    const IconComponent = () => {
      switch (icon) {
        case 'users':
          return <UsersIcon className="w-6 h-6" />;
        case 'clipboard-check':
          return <ClipboardCheckIcon className="w-6 h-6" />;
        case 'clock':
          return <ClockIcon className="w-6 h-6" />;
        case 'credit-card':
          return <CreditCardIcon className="w-6 h-6" />;
        case 'chart-bar':
          return <ChartBarIcon className="w-6 h-6" />;
        default:
          return <ChartBarIcon className="w-6 h-6" />;
      }
    };
  
    const colorClasses = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      amber: 'bg-amber-100 text-amber-600',
      rose: 'bg-rose-100 text-rose-600',
      purple: 'bg-purple-100 text-purple-600',
    };
    
    const bgColor = colorClasses[color];
  
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-5">
          <div className="flex items-center">
            <div className={`flex items-center justify-center p-3 rounded-full ${bgColor}`}>
              <IconComponent />
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-500 truncate">
                {title}
              </p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">
                {value.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {description}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }