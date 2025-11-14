'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getUser } from '@/lib/auth';
import type { MonitoredEmail } from '@/types';

interface Configuration {
  monitored_emails: MonitoredEmail[];
  ai_prompt_template: string;
  is_active: boolean;
}

export default function ConfigsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{id: string; email?: string} | null>(null);
  const [config, setConfig] = useState<Configuration | null>(null);
  const [loading, setLoading] = useState(true);

  const loadConfiguration = async (userId: string) => {
    try {
      const response = await fetch('/api/config/get', {
        headers: {
          'x-user-id': userId
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.configuration) {
          setConfig(data.configuration);
        }
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      toast.error('Failed to load configuration');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const user = await getUser();
      setCurrentUser(user);
      
      if (user) {
        await loadConfiguration(user.id);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const handleCreateNew = () => {
    router.push('/configuration');
  };

  const handleEdit = () => {
    router.push('/configuration');
  };

  const handleDelete = async () => {
    if (!currentUser) return;
    
    if (!confirm('Are you sure you want to delete this configuration? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/config/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({
          configuration: {
            monitored_emails: [],
            ai_prompt_template: '',
            is_active: false,
            max_emails_per_period: 10,
            once_per_window: true
          }
        })
      });

      if (response.ok) {
        toast.success('Configuration deleted successfully!');
        setConfig(null);
      } else {
        toast.error('Failed to delete configuration');
      }
    } catch {
      toast.error('Error deleting configuration');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">My Configurations</h1>
            <p className="text-gray-400">View and manage your email monitoring setups</p>
          </div>
          <Button onClick={handleCreateNew} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            {config ? 'Edit Configuration' : 'Create Configuration'}
          </Button>
        </div>

        {!config || config.monitored_emails.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="py-16 text-center">
              <div className="text-gray-500 mb-4">
                <Plus className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No Configuration Yet</h3>
                <p className="text-gray-400 mb-6">
                  Create your first email monitoring configuration to get started
                </p>
              </div>
              <Button onClick={handleCreateNew} size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Configuration
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Email Monitoring Configuration</CardTitle>
                <CardDescription>
                  {config.monitored_emails.length} monitor(s) configured
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleEdit} variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button onClick={handleDelete} variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {config.monitored_emails.map((monitor, index) => (
                  <div
                    key={index}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-lg">{monitor.sender_email}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-gray-400">
                            Schedule: {monitor.schedule_type}
                          </p>
                          {monitor.receiving_email && (
                            <>
                              <span className="text-gray-600">•</span>
                              <Badge variant="outline" className="text-xs">
                                → {monitor.receiving_email}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant={monitor.is_active === false ? 'secondary' : 'default'}>
                        {monitor.is_active === false ? '⏸️ Paused' : '🟢 Active'}
                      </Badge>
                    </div>
                    
                    {monitor.keywords && monitor.keywords.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">Keywords:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {monitor.keywords.map((keyword, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {monitor.recurring_config && (
                      <div className="mt-2 text-sm text-gray-400">
                        <p>
                          {monitor.recurring_config.start_time} - {monitor.recurring_config.end_time} • 
                          Check every {monitor.recurring_config.interval_minutes} min
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {config.ai_prompt_template && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <h4 className="font-semibold mb-2">AI Prompt Template</h4>
                  <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300 font-mono whitespace-pre-wrap">
                    {config.ai_prompt_template.substring(0, 200)}
                    {config.ai_prompt_template.length > 200 && '...'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
