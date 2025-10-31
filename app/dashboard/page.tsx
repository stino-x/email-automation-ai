'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Mail, Activity, Play, Pause, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { getUser } from '@/lib/auth';

interface DashboardStats {
  total_monitored_emails: number;
  emails_processed_today: number;
  emails_processed_this_week: number;
  service_status: 'active' | 'paused';
  recent_activity: Array<{
    status: string;
    email_checked: string;
    email_subject?: string;
    timestamp: string;
  }>;
}

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<{id: string; email?: string} | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    total_monitored_emails: 0,
    emails_processed_today: 0,
    emails_processed_this_week: 0,
    service_status: 'paused',
    recent_activity: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const user = await getUser();
      setCurrentUser(user);
      if (user) {
        loadDashboardData(user.id);
      }
    };
    loadUser();
  }, []);

  const loadDashboardData = async (userId: string) => {
    try {
      setIsLoading(true);
      
      const configResponse = await fetch('/api/config/get', {
        headers: { 'x-user-id': userId }
      });
      const configData = await configResponse.json();

      const logsResponse = await fetch('/api/logs?limit=10', {
        headers: { 'x-user-id': userId }
      });
      const logsData = await logsResponse.json();

      setStats({
        total_monitored_emails: configData.configuration?.monitored_emails?.length || 0,
        emails_processed_today: 0,
        emails_processed_this_week: 0,
        service_status: configData.configuration?.is_active ? 'active' : 'paused',
        recent_activity: logsData.logs || []
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleService = async () => {
    if (!currentUser) return;

    try {
      setIsToggling(true);
      const endpoint = stats.service_status === 'active' ? '/api/service/stop' : '/api/service/start';
      
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'x-user-id': currentUser.id }
      });

      setStats(prev => ({
        ...prev,
        service_status: prev.service_status === 'active' ? 'paused' : 'active'
      }));
    } catch (error) {
      console.error('Failed to toggle service:', error);
    } finally {
      setIsToggling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

        <Card className="bg-gray-900 border-gray-800 mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {stats.service_status === 'active' ? (
                    <Play className="w-5 h-5 text-green-500" />
                  ) : (
                    <Pause className="w-5 h-5 text-gray-500" />
                  )}
                  Service Status
                </CardTitle>
                <CardDescription>
                  {stats.service_status === 'active' ? 'Monitoring active' : 'Monitoring paused'}
                </CardDescription>
              </div>
              <Switch
                checked={stats.service_status === 'active'}
                onCheckedChange={toggleService}
                disabled={isToggling}
              />
            </div>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-400" />
                Monitored Emails
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.total_monitored_emails}</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-400" />
                Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.emails_processed_today}</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.emails_processed_this_week}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recent_activity.length === 0 ? (
              <p className="text-center py-8 text-gray-400">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {stats.recent_activity.slice(0, 10).map((activity, index: number) => (
                  <div key={index} className="p-4 bg-gray-800 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge variant="outline">{activity.status}</Badge>
                        <p className="mt-2 text-sm">{activity.email_checked}</p>
                        {activity.email_subject && (
                          <p className="text-xs text-gray-400 mt-1">{activity.email_subject}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 flex gap-4">
          <Link href="/configuration">
            <Button size="lg">Configure Monitors</Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline" size="lg">Settings</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
