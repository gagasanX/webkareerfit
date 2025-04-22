'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Save, 
  Plus, 
  Mail, 
  Edit, 
  Trash2, 
  AlertCircle, 
  CheckCircle,
  ArrowLeft,
  Loader2,
  Send
} from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function EmailTemplatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testEmail, setTestEmail] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin-auth/login');
      return;
    }

    if (status === 'authenticated' && !session?.user?.isAdmin) {
      router.push('/dashboard');
      return;
    }

    if (status === 'authenticated' && session?.user?.isAdmin) {
      fetchTemplates();
    }
  }, [status, session, router]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings/email-templates');
      
      if (!response.ok) {
        throw new Error('Failed to fetch email templates');
      }
      
      const data = await response.json();
      setTemplates(data.templates);
      setLoading(false);
    } catch (error) {
      setError('Error loading email templates');
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsEditing(false);
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      const response = await fetch(`/api/admin/settings/email-templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedTemplate),
      });

      if (!response.ok) {
        throw new Error('Failed to update template');
      }

      fetchTemplates();
      setIsEditing(false);
      setSuccess('Template updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      setError('Error updating template');
    }
  };

  const handleSendTestEmail = async () => {
    if (!selectedTemplate || !testEmail) return;

    setIsTesting(true);
    
    try {
      const response = await fetch('/api/admin/settings/email-templates/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          email: testEmail,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send test email');
      }

      setSuccess('Test email sent successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      setError('Error sending test email');
    } finally {
      setIsTesting(false);
    }
  };

  const handleInputChange = (field: keyof EmailTemplate, value: string | boolean) => {
    if (!selectedTemplate) return;

    setSelectedTemplate({
      ...selectedTemplate,
      [field]: value,
    });
  };

  if (loading && templates.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-transparent border-gray-700 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Link href="/admin/settings" className="mr-4 inline-flex items-center text-gray-600 hover:text-gray-800">
          <ArrowLeft className="h-5 w-5 mr-1" />
          Back to Settings
        </Link>
        <h1 className="text-2xl font-bold">Email Templates</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </span>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {success}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Templates</h2>
            </div>
            <div className="p-4">
              <ul className="space-y-2">
                {templates.map((template) => (
                  <li key={template.id}>
                    <button
                      onClick={() => handleTemplateSelect(template)}
                      className={`w-full text-left px-3 py-2 rounded-md flex items-center ${
                        selectedTemplate?.id === template.id
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      <span>{template.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Template Editor */}
        <div className="lg:col-span-3">
          {selectedTemplate ? (
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold">
                  {isEditing ? 'Edit Template' : 'Template Details'}
                </h2>
                <div className="flex space-x-2">
                  {isEditing ? (
                    <button
                      onClick={handleSaveTemplate}
                      className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </button>
                  ) : (
                    <button
                      onClick={handleEditClick}
                      className="inline-flex items-center px-3 py-1.5 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={selectedTemplate.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={selectedTemplate.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HTML Content
                  </label>
                  <textarea
                    value={selectedTemplate.htmlContent}
                    onChange={(e) => handleInputChange('htmlContent', e.target.value)}
                    disabled={!isEditing}
                    rows={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500 font-mono text-sm"
                  />
                </div>

                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTemplate.active}
                      onChange={(e) => handleInputChange('active', e.target.checked)}
                      disabled={!isEditing}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active</span>
                  </label>
                </div>

                {/* Test Email Section */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-md font-semibold mb-3">Send Test Email</h3>
                  <div className="flex">
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="recipient@example.com"
                      className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      onClick={handleSendTestEmail}
                      disabled={isTesting || !testEmail}
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700 disabled:bg-indigo-400"
                    >
                      {isTesting ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-1" />
                      )}
                      Send Test
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    This will send a test email with placeholder data to the specified address.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow-md rounded-lg overflow-hidden p-8 text-center">
              <Mail className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No template selected</h3>
              <p className="text-gray-500">
                Select a template from the list to view or edit its details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}