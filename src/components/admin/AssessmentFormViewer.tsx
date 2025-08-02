// /src/components/admin/AssessmentFormViewer.tsx
'use client';

import { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  CheckCircle, 
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Star,
  Calendar
} from 'lucide-react';

// ===== TYPES =====
interface AssessmentFormViewerProps {
  assessmentType: string;
  formData: any;
  tier: string;
}

// ===== HELPER FUNCTIONS =====
const formatValue = (key: string, value: any): React.ReactNode => {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-400 italic">No response</span>;
  }

  // Array values (checkboxes/multi-select)
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-gray-400 italic">No items selected</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((item: any, index: number) => (
          <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            {String(item)}
          </span>
        ))}
      </div>
    );
  }

  // File uploads
  if (key.toLowerCase().includes('file') || key.toLowerCase().includes('upload') || 
      key.toLowerCase().includes('document') || key.toLowerCase().includes('resume') ||
      key.toLowerCase().includes('certificate')) {
    return (
      <div className="flex items-center p-3 bg-gray-50 rounded-md">
        <FileText className="w-5 h-5 text-gray-400 mr-2" />
        <span className="text-blue-600">
          {typeof value === 'string' ? value : 'Uploaded file'}
        </span>
      </div>
    );
  }

  // Date fields
  if (key.toLowerCase().includes('date') || key.toLowerCase().includes('birth')) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return (
          <div className="flex items-center">
            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
            <span>{date.toLocaleDateString()}</span>
          </div>
        );
      }
    } catch (e) {
      // Fall through to default
    }
  }

  // Rating fields
  if (key.toLowerCase().includes('rating') || key.toLowerCase().includes('score')) {
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 5) {
      return (
        <div className="flex items-center">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= numValue
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="ml-2 text-sm font-medium">{numValue}/5</span>
        </div>
      );
    }
  }

  // Long text (textarea-like)
  if (typeof value === 'string' && value.length > 100) {
    return (
      <div className="bg-gray-50 rounded-md p-3 whitespace-pre-wrap text-sm">
        {value}
      </div>
    );
  }

  // Email
  if (key.toLowerCase().includes('email')) {
    return (
      <div className="flex items-center">
        <Mail className="w-4 h-4 text-gray-400 mr-2" />
        <span>{String(value)}</span>
      </div>
    );
  }

  // Phone
  if (key.toLowerCase().includes('phone') || key.toLowerCase().includes('tel')) {
    return (
      <div className="flex items-center">
        <Phone className="w-4 h-4 text-gray-400 mr-2" />
        <span>{String(value)}</span>
      </div>
    );
  }

  // Default - just display the value
  return <span>{String(value)}</span>;
};

const formatFieldName = (key: string): string => {
  // Convert camelCase/snake_case to proper labels
  return key
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize first letter of each word
    .trim();
};

const categorizeFields = (formData: any) => {
  const categories: { [key: string]: { [key: string]: any } } = {
    'Personal Information': {},
    'Contact Details': {},
    'Education & Background': {},
    'Work Experience': {},
    'Skills & Competencies': {},
    'Assessment Specific': {},
    'Documents & Files': {},
    'Additional Information': {}
  };

  Object.entries(formData).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();
    
    // Personal Information
    if (lowerKey.includes('name') || lowerKey.includes('birth') || lowerKey.includes('age') || 
        lowerKey.includes('gender') || lowerKey.includes('nationality')) {
      categories['Personal Information'][key] = value;
    }
    // Contact Details
    else if (lowerKey.includes('email') || lowerKey.includes('phone') || lowerKey.includes('address') || 
             lowerKey.includes('contact') || lowerKey.includes('tel')) {
      categories['Contact Details'][key] = value;
    }
    // Education
    else if (lowerKey.includes('education') || lowerKey.includes('school') || lowerKey.includes('university') || 
             lowerKey.includes('degree') || lowerKey.includes('study') || lowerKey.includes('graduation') ||
             lowerKey.includes('institution') || lowerKey.includes('qualification')) {
      categories['Education & Background'][key] = value;
    }
    // Work Experience
    else if (lowerKey.includes('job') || lowerKey.includes('work') || lowerKey.includes('career') || 
             lowerKey.includes('company') || lowerKey.includes('employer') || lowerKey.includes('position') ||
             lowerKey.includes('experience') || lowerKey.includes('industry')) {
      categories['Work Experience'][key] = value;
    }
    // Skills
    else if (lowerKey.includes('skill') || lowerKey.includes('competenc') || lowerKey.includes('language') || 
             lowerKey.includes('certification') || lowerKey.includes('training') || lowerKey.includes('course')) {
      categories['Skills & Competencies'][key] = value;
    }
    // Files/Documents
    else if (lowerKey.includes('file') || lowerKey.includes('upload') || lowerKey.includes('document') || 
             lowerKey.includes('resume') || lowerKey.includes('cv') || lowerKey.includes('certificate') ||
             lowerKey.includes('portfolio') || lowerKey.includes('attachment')) {
      categories['Documents & Files'][key] = value;
    }
    // Assessment specific (type-related questions)
    else if (lowerKey.includes('assessment') || lowerKey.includes('rating') || lowerKey.includes('score') ||
             lowerKey.includes('preference') || lowerKey.includes('interest') || lowerKey.includes('goal')) {
      categories['Assessment Specific'][key] = value;
    }
    // Everything else
    else {
      categories['Additional Information'][key] = value;
    }
  });

  // Remove empty categories
  return Object.fromEntries(
    Object.entries(categories).filter(([_, fields]) => Object.keys(fields).length > 0)
  );
};

// ===== MAIN COMPONENT =====
export default function AssessmentFormViewer({ assessmentType, formData, tier }: AssessmentFormViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Validate input
  if (!formData || typeof formData !== 'object') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Assessment Responses</h2>
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No form responses available</p>
        </div>
      </div>
    );
  }

  const categorizedFields = categorizeFields(formData);
  
  if (Object.keys(categorizedFields).length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Assessment Responses</h2>
        <div className="bg-gray-50 rounded p-4">
          <p className="text-sm text-gray-600 mb-2">Raw form data:</p>
          <pre className="text-xs text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Assessment Responses</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {assessmentType.toUpperCase()}
          </span>
          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
            tier === 'premium' ? 'bg-purple-100 text-purple-800' :
            tier === 'standard' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {tier.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {Object.entries(categorizedFields).map(([sectionName, fields]) => {
          const isExpanded = expandedSections[sectionName] !== false; // Default to expanded
          const fieldCount = Object.keys(fields).length;

          return (
            <div key={sectionName} className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleSection(sectionName)}
                className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between rounded-t-lg"
              >
                <h3 className="font-medium text-gray-900">{sectionName}</h3>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-2">
                    {fieldCount} item{fieldCount !== 1 ? 's' : ''}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="p-4">
                  <dl className="space-y-4">
                    {Object.entries(fields).map(([fieldKey, fieldValue]) => (
                      <div key={fieldKey} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                        <dt className="text-sm font-medium text-gray-600 mb-2">
                          {formatFieldName(fieldKey)}
                        </dt>
                        <dd className="text-sm text-gray-900">
                          {formatValue(fieldKey, fieldValue)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Raw data toggle for debugging */}
      <details className="mt-6">
        <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
          View raw data (for debugging)
        </summary>
        <div className="mt-2 bg-gray-50 rounded p-3 max-h-48 overflow-y-auto">
          <pre className="text-xs text-gray-600 whitespace-pre-wrap">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}